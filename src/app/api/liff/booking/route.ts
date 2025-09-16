import { NextRequest, NextResponse } from "next/server";
import { verifyLiffIdToken } from "@/server/lib/liffAuth";
import { appendBooking, upsertBookingSession } from "@/server/repo/bookings";
import { recordBooking as _recordBooking } from "@/server/repo/bookingStore";
import { geocodeTextServer } from "@/server/lib/geocode";
import { pushMessage } from "@/server/line";
import { bookingSummaryFlex, quickReplyMenu } from "@/server/lineMessages";
import { reportHealthcareError } from "@/lib/sentry";
import type {
  LiffBookingRequest,
  LiffBookingResponse,
  ValidationErrorResponse,
  AuthenticationErrorResponse,
  ApiResponse,
} from "@/server/types/api";
import type { BookingProgress } from "@/server/agent/bookingFlow";

export const dynamic = "force-dynamic";

// Validation utilities
function validateAddress(address: string): string | null {
  const cleanAddress = address.trim();
  if (cleanAddress.length < 10) {
    return "Address must be at least 10 characters long";
  }
  if (cleanAddress.length > 500) {
    return "Address is too long (maximum 500 characters)";
  }
  // Check for Thai address patterns
  if (!/[\u0E00-\u0E7F]/.test(cleanAddress) && !/\d+/.test(cleanAddress)) {
    return "Address must contain Thai text or numbers";
  }
  return null;
}

function validateCoordinates(lat?: number, lng?: number): string | null {
  if (lat !== undefined && lng !== undefined) {
    if (lat < -90 || lat > 90) {
      return "Invalid latitude (must be between -90 and 90)";
    }
    if (lng < -180 || lng > 180) {
      return "Invalid longitude (must be between -180 and 180)";
    }
    // Basic Thailand bounds check
    if (lat < 5.5 || lat > 20.5 || lng < 97 || lng > 106) {
      return "Coordinates must be within Thailand";
    }
  }
  return null;
}

function validateBookingDate(scheduledAt: string): string | null {
  const date = new Date(scheduledAt);
  if (isNaN(date.getTime())) {
    return "Invalid date format (must be valid ISO string)";
  }

  const now = new Date();
  if (date < now) {
    return "Booking date cannot be in the past";
  }

  // Max 30 days in the future
  const maxDate = new Date(now);
  maxDate.setDate(maxDate.getDate() + 30);

  if (date > maxDate) {
    return "Booking date cannot be more than 30 days in the future";
  }

  return null;
}

function generateBookingId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return `booking_${timestamp}${random}`.substring(0, 20);
}

function generateConfirmationId(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function calculateEstimatedArrival(scheduledAt: string): string {
  const date = new Date(scheduledAt);
  // Add 1 hour buffer for arrival
  date.setHours(date.getHours() + 1);
  return date.toISOString();
}

export async function POST(req: NextRequest) {
  try {
    // Parse and validate request body
    let body: LiffBookingRequest;
    try {
      body = await req.json();
    } catch {
      const errorResponse: ValidationErrorResponse = {
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
        meta: {
          request_id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        },
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Validate access token
    if (!body.accessToken || typeof body.accessToken !== "string") {
      const errorResponse: AuthenticationErrorResponse = {
        success: false,
        error: {
          code: "AUTHENTICATION_ERROR",
          message: "Missing or invalid access token",
          details: {
            token_valid: false,
          },
        },
        meta: {
          request_id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        },
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    // Verify LIFF token
    let userInfo: { sub: string; name?: string };
    try {
      userInfo = await verifyLiffIdToken(body.accessToken);
    } catch {
      const errorResponse: AuthenticationErrorResponse = {
        success: false,
        error: {
          code: "AUTHENTICATION_ERROR",
          message: "Invalid access token",
          details: {
            token_valid: false,
          },
        },
        meta: {
          request_id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        },
      };
      return NextResponse.json(errorResponse, { status: 401 });
    }

    // Validate required fields
    const fieldErrors: Array<{ field: string; message: string }> = [];

    if (!body.booking || typeof body.booking !== "object") {
      fieldErrors.push({
        field: "booking",
        message: "Booking object is required",
      });
    } else {
      // Validate scheduled_at
      if (
        !body.booking.scheduled_at ||
        typeof body.booking.scheduled_at !== "string"
      ) {
        fieldErrors.push({
          field: "booking.scheduled_at",
          message: "Scheduled date/time is required",
        });
      } else {
        const dateError = validateBookingDate(body.booking.scheduled_at);
        if (dateError) {
          fieldErrors.push({
            field: "booking.scheduled_at",
            message: dateError,
          });
        }
      }

      // Validate type
      const validTypes = [
        "blood_test",
        "vaccine",
        "checkup",
        "follow_up",
        "emergency",
      ];
      if (!body.booking.type || !validTypes.includes(body.booking.type)) {
        fieldErrors.push({
          field: "booking.type",
          message: `Booking type must be one of: ${validTypes.join(", ")}`,
        });
      }

      // Validate services
      if (
        !body.booking.services ||
        !Array.isArray(body.booking.services) ||
        body.booking.services.length === 0
      ) {
        fieldErrors.push({
          field: "booking.services",
          message: "At least one service must be selected",
        });
      }
    }

    // Validate location if provided
    if (body.location) {
      if (!body.location.address || typeof body.location.address !== "string") {
        fieldErrors.push({
          field: "location.address",
          message: "Location address is required when location is specified",
        });
      } else {
        const addressError = validateAddress(body.location.address);
        if (addressError) {
          fieldErrors.push({
            field: "location.address",
            message: addressError,
          });
        }
      }

      const coordError = validateCoordinates(
        body.location.lat,
        body.location.lng
      );
      if (coordError) {
        fieldErrors.push({
          field: "location.coordinates",
          message: coordError,
        });
      }
    }

    if (fieldErrors.length > 0) {
      const errorResponse: ValidationErrorResponse = {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Validation failed for one or more fields",
          details: { field_errors: fieldErrors },
        },
        meta: {
          request_id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        },
      };
      return NextResponse.json(errorResponse, { status: 400 });
    }

    // Generate booking identifiers
    const bookingId = generateBookingId();
    const confirmationId = generateConfirmationId();

    // Use location if provided, otherwise we'll need to get it from user profile
    const address = body.location?.address || "Default address"; // This would come from user profile
    let lat = body.location?.lat;
    let lng = body.location?.lng;

    // Enrich with geocoding if coordinates not provided
    try {
      if ((lat == null || lng == null) && address) {
        const geocodeResult = await geocodeTextServer(address);
        if (geocodeResult) {
          lat = geocodeResult.coords.lat;
          lng = geocodeResult.coords.lng;
        }
      }
    } catch (error) {
      // Geocoding failure is not critical, continue without coordinates
      console.warn("Geocoding failed:", error);
    }

    // Save booking to repository
    try {
      await appendBooking({
        userId: userInfo.sub,
        bookingDate: body.booking.scheduled_at.split("T")[0], // Extract YYYY-MM-DD
        datePreference: body.booking.scheduled_at,
        address,
        lat,
        lng,
        note: body.booking.instructions?.trim() || undefined,
        status: "pending",
      });
    } catch (error) {
      await reportHealthcareError(error as Error, {
        operation: "booking_save",
        userId: userInfo.sub,
        bookingId: bookingId,
      });

      return NextResponse.json(
        {
          success: false,
          error: {
            code: "INTERNAL_ERROR",
            message: "Failed to save booking",
            details: { retry_allowed: true },
          },
          meta: {
            request_id: crypto.randomUUID(),
            timestamp: new Date().toISOString(),
          },
        },
        { status: 500 }
      );
    }

    // Update booking session
    try {
      await upsertBookingSession(userInfo.sub, {
        userId: userInfo.sub,
        step: "done",
        address,
        lat,
        lng,
        bookingDate: body.booking.scheduled_at.split("T")[0],
        datePreference: body.booking.scheduled_at,
        lastUpdated: new Date().toISOString(),
        status: "completed",
      });
    } catch (error) {
      // Session update failure is non-critical
      console.warn("Session update failed:", error);
    }

    // Send LINE notification (non-blocking)
    try {
      const progress: BookingProgress = {
        step: "confirm",
        bookingDate: body.booking.scheduled_at.split("T")[0],
        datePreference: body.booking.scheduled_at,
        address,
        lat,
        lng,
        note: body.booking.instructions?.trim() || undefined,
      } as BookingProgress;

      await pushMessage(userInfo.sub, [
        bookingSummaryFlex(progress),
        {
          type: "text",
          text: "บันทึกการจองแล้ว ทีมงานจะติดต่อยืนยันอีกครั้งค่ะ",
          quickReply: quickReplyMenu(),
        },
      ]);
    } catch (error) {
      // LINE notification failure is non-critical
      console.warn("LINE notification failed:", error);
    }

    // Prepare successful response
    const estimatedArrival = calculateEstimatedArrival(
      body.booking.scheduled_at
    );

    const response: ApiResponse<LiffBookingResponse> = {
      success: true,
      data: {
        booking_id: bookingId,
        confirmation_id: confirmationId,
        status: body.auto_confirm ? "confirmed" : "pending",
        estimated_arrival: estimatedArrival,
        officer_assigned: false,
        next_steps: [
          "รอการยืนยันจากเจ้าหน้าที่",
          "ท่านจะได้รับการติดต่อกลับภายใน 24 ชั่วโมง",
          "เตรียมเอกสารบัตรประชาชนและการประกันสุขภาพ",
        ],
      },
      meta: {
        request_id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
      },
    };

    return NextResponse.json(response, { status: 201 });
  } catch (error) {
    // Global error handler
    await reportHealthcareError(error as Error, {
      operation: "liff_booking_global_error",
    });

    return NextResponse.json(
      {
        success: false,
        error: {
          code: "INTERNAL_ERROR",
          message: "An unexpected error occurred",
          details: { retry_allowed: true },
        },
        meta: {
          request_id: crypto.randomUUID(),
          timestamp: new Date().toISOString(),
        },
      },
      { status: 500 }
    );
  }
}

