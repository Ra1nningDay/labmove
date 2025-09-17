import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import {
  confirmBooking as confirmBookingEntry,
  getBookingById,
  BookingStatusError,
} from "@/server/repo/bookingStore";
import { reportHealthcareError } from "@/lib/sentry";
import type { ApiResponse } from "@/server/types/api";

export const dynamic = "force-dynamic";

function jsonResponse<T>(status: number, body: ApiResponse<T>) {
  return NextResponse.json(body, { status });
}

export async function POST(
  req: NextRequest,
  context: { params: { id: string } | Promise<{ id: string }> }
) {
  const requestId = crypto.randomUUID();
  const timestamp = new Date().toISOString();
  // Next.js may provide params as a Promise — resolve safely
  const params = await Promise.resolve(context.params);
  const bookingId = params?.id?.trim();
  if (!bookingId) {
    return jsonResponse(400, {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Booking id is required",
      },
      meta: { request_id: requestId, timestamp },
    });
  }

  const adminToken = process.env.ADMIN_API_TOKEN;
  if (!adminToken) {
    return jsonResponse(503, {
      success: false,
      error: {
        code: "SERVICE_UNAVAILABLE",
        message: "Admin API token is not configured",
      },
      meta: { request_id: requestId, timestamp },
    });
  }

  const authHeader = req.headers.get("authorization") || "";
  const providedToken = authHeader.startsWith("Bearer ")
    ? authHeader.slice(7).trim()
    : null;
  if (!providedToken || providedToken !== adminToken) {
    return jsonResponse(401, {
      success: false,
      error: {
        code: "ADMIN_AUTH_REQUIRED",
        message: "Admin authentication failed",
      },
      meta: { request_id: requestId, timestamp },
    });
  }

  let payload: { note?: string } = {};
  const isJson =
    req.headers.get("content-type")?.includes("application/json") ?? false;
  if (isJson) {
    try {
      payload = await req.json();
    } catch {
      return jsonResponse(400, {
        success: false,
        error: {
          code: "VALIDATION_ERROR",
          message: "Invalid JSON payload",
        },
        meta: { request_id: requestId, timestamp },
      });
    }
  }

  const adminNote = payload.note?.toString().trim();
  if (adminNote && adminNote.length > 500) {
    return jsonResponse(400, {
      success: false,
      error: {
        code: "VALIDATION_ERROR",
        message: "Note must be 500 characters or fewer",
        details: { field: "note" },
      },
      meta: { request_id: requestId, timestamp },
    });
  }

  try {
    const stored = getBookingById(bookingId);
    if (!stored) {
      return jsonResponse(404, {
        success: false,
        error: {
          code: "BOOKING_NOT_FOUND",
          message: "Booking not found",
        },
        meta: { request_id: requestId, timestamp },
      });
    }

    const updated = confirmBookingEntry(bookingId, adminNote || undefined);
    if (!updated) {
      return jsonResponse(404, {
        success: false,
        error: {
          code: "BOOKING_NOT_FOUND",
          message: "Booking not found",
        },
        meta: { request_id: requestId, timestamp },
      });
    }

    const response: ApiResponse<{
      booking_id: string;
      status: string;
      confirmed_at?: string;
      admin_note?: string;
    }> = {
      success: true,
      data: {
        booking_id: updated.id,
        status: updated.status,
        confirmed_at: updated.confirmedAt,
        admin_note: adminNote || updated.adminNote,
      },
      meta: { request_id: requestId, timestamp },
    };
    return jsonResponse(200, response);
  } catch (error) {
    if (error instanceof BookingStatusError) {
      return jsonResponse(400, {
        success: false,
        error: {
          code: "BOOKING_STATUS_INVALID",
          message: "Booking cannot be confirmed in its current status",
          details: { status: error.currentStatus },
        },
        meta: { request_id: requestId, timestamp },
      });
    }

    await reportHealthcareError(error as Error, {
      operation: "admin_booking_confirm",
      bookingId,
      requestId,
    });

    return jsonResponse(500, {
      success: false,
      error: {
        code: "INTERNAL_ERROR",
        message: "Failed to confirm booking",
      },
      meta: { request_id: requestId, timestamp },
    });
  }
}
