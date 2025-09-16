import fs from "fs";
import path from "path";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/admin/bookings/[id]/confirm/route";
import {
  recordBooking,
  clearBookingStore,
} from "@/server/repo/bookingStore";

const BOOKINGS_CSV = path.join(process.cwd(), "data", "bookings.csv");

function cleanupFiles() {
  if (fs.existsSync(BOOKINGS_CSV)) {
    fs.unlinkSync(BOOKINGS_CSV);
  }
  clearBookingStore();
}

function buildRequest(id: string, token?: string, body?: unknown) {
  const headers = new Headers();
  if (body !== undefined) {
    headers.set("content-type", "application/json");
  }
  if (token) {
    headers.set("authorization", `Bearer ${token}`);
  }
  const init: RequestInit = {
    method: "POST",
    headers,
    body: body !== undefined ? JSON.stringify(body) : undefined,
  };
  return new NextRequest(
    new Request(`http://localhost/api/admin/bookings/${id}/confirm`, init)
  );
}

describe("Contract: POST /api/admin/bookings/:id/confirm", () => {
  const adminToken = "test_admin_token";

  beforeAll(() => {
    process.env.ADMIN_API_TOKEN = adminToken;
  });

  beforeEach(() => {
    cleanupFiles();
  });

  afterAll(() => {
    cleanupFiles();
  });

  it("confirms a pending booking", async () => {
    const bookingId = "booking_test_confirm";
    recordBooking({
      id: bookingId,
      userId: "U123",
      status: "pending",
      note: "Initial booking",
    });

    const req = buildRequest(bookingId, adminToken, {
      note: "Confirmed by admin",
    });
    const res = await POST(req, { params: { id: bookingId } });
    const body = await res.json();

    expect(res.status).toBe(200);
    expect(body.success).toBe(true);
    expect(body.data.booking_id).toBe(bookingId);
    expect(body.data.status).toBe("confirmed");
    expect(body.data.admin_note).toBe("Confirmed by admin");
  });

  it("returns 404 when booking does not exist", async () => {
    const req = buildRequest("booking_missing", adminToken);
    const res = await POST(req, { params: { id: "booking_missing" } });
    const body = await res.json();

    expect(res.status).toBe(404);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("BOOKING_NOT_FOUND");
  });

  it("rejects bookings that are not pending", async () => {
    const bookingId = "booking_already_confirmed";
    recordBooking({
      id: bookingId,
      userId: "U456",
      status: "confirmed",
      note: "Already handled",
    });

    const req = buildRequest(bookingId, adminToken);
    const res = await POST(req, { params: { id: bookingId } });
    const body = await res.json();

    expect(res.status).toBe(400);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("BOOKING_STATUS_INVALID");
  });

  it("requires admin authentication", async () => {
    const req = buildRequest("booking_auth");
    const res = await POST(req, { params: { id: "booking_auth" } });
    const body = await res.json();

    expect(res.status).toBe(401);
    expect(body.success).toBe(false);
    expect(body.error.code).toBe("ADMIN_AUTH_REQUIRED");
  });
});


