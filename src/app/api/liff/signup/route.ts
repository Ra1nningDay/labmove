import { NextRequest, NextResponse } from "next/server";
import { verifyLiffIdToken } from "@/server/lib/liffAuth";
import { saveUser, findUserByLineId } from "@/server/repo/users";
import { setUserSession } from "@/lib/redis";
import { checkRateLimit } from "@/lib/redis";
import { reportHealthcareError } from "@/lib/sentry";
import { randomUUID } from "crypto";
import type {
  LiffSignupRequest,
  LiffSignupResponse,
  ValidationErrorResponse,
  AuthenticationErrorResponse,
} from "@/server/types/api";
import { SignupPayloadSchema } from "@/server/validation";
import { formatZodError } from "@/server/validation";

export const dynamic = "force-dynamic";

declare global {
  // keep a tiny, typed in-process rate map during tests when Redis is disabled
  var __signupRateMap:
    | Map<string, { count: number; expiresAt: number }>
    | undefined;
}

// Validation utilities
// function validateAge(age?: number): string | null {
//   if (age !== undefined && (age < 18 || age > 120)) {
//     return "Patient must be at least 18 years old";
//   }
//   return null;
// }

// function validatePhone(phone: string): string | null {
//   const cleanPhone = phone.replace(/[^0-9]/g, "");
//   if (cleanPhone.length < 9 || cleanPhone.length > 12) {
//     return "Invalid phone number format";
//   }
//   return null;
// }

// function validateName(name: string): string | null {
//   if (name.trim().length < 2) {
//     return "Name must be at least 2 characters";
//   }
//   return null;
// }

function generatePatientId(): string {
  // Contract expects `patient_[a-zA-Z0-9]{12}`
  const chars =
    "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
  let id = "";
  for (let i = 0; i < 12; i++)
    id += chars[Math.floor(Math.random() * chars.length)];
  return `patient_${id}`;
}

export async function POST(req: NextRequest) {
  try {
    let body: LiffSignupRequest;
    try {
      body = await req.json();
    } catch {
      const response: ValidationErrorResponse = {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid JSON in request body",
          details: {
            field_errors: [
              { field: "body", message: "Request body must be valid JSON" },
            ],
          },
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Note: do not return 401 on missing token before validating payload.
    // Contract tests expect malformed payloads to return 400. Token
    // verification happens after schema validation below.

    // Zod validation (strict)
    const fullName = body.patient?.name?.trim() ?? "";
    const nameParts = fullName.split(/\s+/).filter(Boolean);
    const parsed = SignupPayloadSchema.safeParse({
      idToken: body.accessToken,
      displayName: fullName || undefined,
      givenName: nameParts[0] ?? fullName ?? "",
      familyName:
        nameParts.length > 1 ? nameParts.slice(1).join(" ") : fullName ?? "",
      phone: (body.patient?.phone ?? "").trim(),
      address: body.patient?.address ?? "",
      consent: {
        terms_accepted: Boolean(body.consent?.terms_accepted),
        privacy_accepted: Boolean(body.consent?.privacy_accepted),
      },
    });
    if (!parsed.success) {
      // Map zod paths back to the public contract field names used in tests
      const mapped = formatZodError(parsed.error).map((i) => {
        let field = i.path;
        if (
          field === "givenName" ||
          field === "familyName" ||
          field === "displayName"
        ) {
          field = "patient.name";
        } else if (field === "address") {
          field = "patient.address";
        } else if (field === "phone") {
          field = "patient.phone";
        } else if (field === "consent") {
          field = "consent.terms_accepted";
        }
        return { field, message: i.message };
      });
      const response: ValidationErrorResponse = {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: { field_errors: mapped },
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    let tokenInfo: { sub: string };
    try {
      tokenInfo = await verifyLiffIdToken(body.accessToken);
    } catch {
      const response: AuthenticationErrorResponse = {
        success: false,
        error: {
          code: "AUTHENTICATION_ERROR",
          message: "Invalid LIFF access token",
        },
      };
      return NextResponse.json(response, { status: 401 });
    }

    // After parsing, enforce that terms_accepted is true
    // (Zod validated presence and types already)
    if (parsed.success) {
      const data = parsed.data;
      if (!data.consent || !data.consent.terms_accepted) {
        const response: ValidationErrorResponse = {
          success: false,
          error: {
            code: "VALIDATION_ERROR",
            message: "Validation failed",
            details: {
              field_errors: [
                {
                  field: "consent.terms_accepted",
                  message: "must be accepted",
                },
              ],
            },
          },
        };
        return NextResponse.json(response, { status: 400 });
      }
    }

    // Existing manual field validation kept for backward-compat with contract tests

    // Simple in-process rate limiter fallback used when Redis is disabled
    // per-process map: identifier -> { count, expiresAt }
    const rateMap: Map<string, { count: number; expiresAt: number }> =
      globalThis.__signupRateMap || new Map();
    // attach for subsequent requests in same process
    globalThis.__signupRateMap = rateMap;

    // Rate limit: allow 5 requests per 60 seconds per token
    try {
      const rl = await checkRateLimit(tokenInfo.sub, 5, 60);
      if (!rl.allowed) {
        const response = {
          success: false,
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many signup attempts",
            details: {
              retry_after_seconds: Math.ceil(
                (rl.resetTime - Date.now()) / 1000
              ),
            },
          },
        };
        return NextResponse.json(response, { status: 429 });
      }
    } catch {
      // Fallback to in-process rate limiter when Redis is not available
      const now = Date.now();
      const entry = rateMap.get(tokenInfo.sub) || { count: 0, expiresAt: 0 };
      if (entry.expiresAt < now) {
        entry.count = 1;
        entry.expiresAt = now + 60 * 1000;
      } else {
        entry.count += 1;
      }
      rateMap.set(tokenInfo.sub, entry);
      if (entry.count > 5) {
        const response = {
          success: false,
          error: {
            code: "RATE_LIMIT_EXCEEDED",
            message: "Too many signup attempts",
            details: {
              retry_after_seconds: Math.ceil(
                (entry.expiresAt - Date.now()) / 1000
              ),
            },
          },
        };
        return NextResponse.json(response, { status: 429 });
      }
    }

    // Check if user already exists (handle duplicate registration)
    const existingUser = await findUserByLineId(tokenInfo.sub);

    // Generate patient ID
    const patientId = generatePatientId();

    // Prepare user data for storage (include patientId so in-memory store is idempotent)
    const userData = {
      lineUserId: tokenInfo.sub,
      name: (body.patient.name ?? "").trim(),
      phone: (body.patient.phone ?? "").replace(/[^0-9]/g, ""),
      address: (body.patient.address ?? "").trim(),
      hn: body.patient.hn?.trim(),
      hospital: body.patient.hospital?.trim(),
      consent: true,
      patientId: patientId,
    };

    // Save user to repository
    await saveUser(userData);

    // Prepare session data
    const sessionData = {
      line_user_id: tokenInfo.sub,
      patient_id: patientId,
      registration_completed: true,
      current_flow: "welcome",
      patient_data: {
        name: body.patient.name.trim(),
        phone: body.patient.phone.replace(/[^0-9]/g, ""),
        address: body.patient.address.trim(),
        age: body.patient.age,
        gender: body.patient.gender,
        emergency_contact: body.patient.emergency_contact,
        hn: body.patient.hn?.trim(),
        hospital: body.patient.hospital?.trim(),
      },
      consent: body.consent,
      preferences: body.preferences,
      created_at: new Date().toISOString(),
      last_activity: new Date().toISOString(),
    };

    // Store session in Redis
    await setUserSession(tokenInfo.sub, sessionData);

    // If user already exists, reuse their patientId
    const finalPatientId = existingUser?.patientId || patientId;

    const payload: LiffSignupResponse = {
      patient_id: finalPatientId,
      line_user_id: tokenInfo.sub,
      registration_complete: true,
    };

    // Return both root fields and data envelope for backward compatibility
    const envelope = {
      success: true,
      data: payload,
      patient_id: payload.patient_id,
      line_user_id: payload.line_user_id,
      registration_complete: payload.registration_complete,
      meta: {
        request_id: randomUUID(),
        timestamp: new Date().toISOString(),
      },
    };

    // Persist patientId for in-memory store if applicable
    if (existingUser && !existingUser.patientId) {
      try {
        existingUser.patientId = finalPatientId;
        await saveUser(existingUser);
      } catch {}
    }

    return NextResponse.json(envelope, { status: 201 });
  } catch (error) {
    // Log error for monitoring
    reportHealthcareError(error as Error, {
      operation: "liff_signup",
      severity: "high",
    });

    // Return generic error response
    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_SERVER_ERROR",
          message: "An internal error occurred during signup",
        },
      },
      { status: 500 }
    );
  }
}
