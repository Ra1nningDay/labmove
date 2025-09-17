import { NextRequest, NextResponse } from "next/server";
import { verifyLiffIdToken } from "@/server/lib/liffAuth";
import { saveUser, findUserByLineId } from "@/server/repo/users";
import { setUserSession } from "@/lib/redis";
import { reportHealthcareError } from "@/lib/sentry";
import type {
  LiffSignupRequest,
  LiffSignupResponse,
  ValidationErrorResponse,
  AuthenticationErrorResponse,
} from "@/server/types/api";
import { SignupPayloadSchema } from "@/server/validation";
import { formatZodError } from "@/server/validation";

export const dynamic = "force-dynamic";

// Validation utilities
function validateAge(age?: number): string | null {
  if (age !== undefined && (age < 18 || age > 120)) {
    return "Patient must be at least 18 years old";
  }
  return null;
}

function validatePhone(phone: string): string | null {
  const cleanPhone = phone.replace(/[^0-9]/g, "");
  if (cleanPhone.length < 9 || cleanPhone.length > 12) {
    return "Invalid phone number format";
  }
  return null;
}

function validateName(name: string): string | null {
  if (name.trim().length < 2) {
    return "Name must be at least 2 characters";
  }
  return null;
}

function generatePatientId(): string {
  const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
  const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
  return `PAT_${dateStr}_${randomId}`;
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

    // Zod validation (strict)
    const parsed = SignupPayloadSchema.safeParse({
      idToken: body.accessToken,
      displayName: body.patient?.name,
      givenName: body.patient?.name?.split(" ")?.[0] ?? body.patient?.name,
      familyName:
        body.patient?.name?.includes(" ")
          ? body.patient?.name?.split(" ").slice(1).join(" ")
          : body.patient?.name,
      phone: body.patient?.phone ?? "",
      consent: Boolean(body.consent?.terms_accepted && body.consent?.privacy_accepted),
    });
    if (!parsed.success) {
      const response: ValidationErrorResponse = {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed",
          details: { field_errors: formatZodError(parsed.error).map((i) => ({ field: i.path, message: i.message })) },
        },
      };
      return NextResponse.json(response, { status: 400 });
    }

    // Validate access token and authenticate
    if (!body.accessToken) {
      const response: AuthenticationErrorResponse = {
        success: false,
        error: {
          code: "AUTHENTICATION_ERROR",
          message: "Missing access token",
        },
      };
      return NextResponse.json(response, { status: 401 });
    }

    let tokenInfo: { sub: string };
    try {
      tokenInfo = await verifyLiffIdToken(body.accessToken);
    } catch {
      const response: AuthenticationErrorResponse = {
        success: false,
        error: {
          code: "AUTHENTICATION_ERROR",
          message: "Invalid access token",
        },
      };
      return NextResponse.json(response, { status: 401 });
    }

    // Existing manual field validation kept for backward-compat with contract tests

    // Check if user already exists (handle duplicate registration)
    const existingUser = await findUserByLineId(tokenInfo.sub);

    // Generate patient ID
    const patientId = generatePatientId();

    // Prepare user data for storage
    const userData = {
      lineUserId: tokenInfo.sub,
      name: body.patient.name.trim(),
      phone: body.patient.phone.replace(/[^0-9]/g, ""),
      address: body.patient.address.trim(),
      hn: body.patient.hn?.trim(),
      hospital: body.patient.hospital?.trim(),
      consent: true,
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

    // Prepare response
    const response: LiffSignupResponse = {
      patient_id: patientId,
      line_user_id: tokenInfo.sub,
      registration_complete: true,
      next_step: existingUser ? "book_appointment" : "verify_phone",
    };

    return NextResponse.json(response, { status: existingUser ? 200 : 201 });
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
