/**
 * Happy path: LIFF booking accepts valid payload
 */
import { NextRequest } from "next/server";

jest.mock("@/server/lib/liffAuth", () => ({
  verifyLiffIdToken: jest.fn().mockResolvedValue({ sub: "U999", name: "John" }),
}));

jest.mock("@/server/repo/bookings", () => ({
  appendBooking: jest.fn().mockResolvedValue(undefined),
  upsertBookingSession: jest.fn().mockResolvedValue(undefined),
  getLatestBookingByUserId: jest.fn(),
  getBookingSessionByUserId: jest.fn(),
}));

jest.mock("@/server/lib/geocode", () => ({
  geocodeTextServer: jest.fn().mockResolvedValue({ coords: { lat: 13.75, lng: 100.5 } }),
}));

jest.mock("@/server/line", () => ({
  pushMessage: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/server/lineMessages", () => ({
  bookingSummaryFlex: jest.fn().mockReturnValue({ type: "text", text: "summary" }),
  quickReplyMenu: jest.fn().mockReturnValue({ items: [] }),
}));

jest.mock("@/lib/sentry", () => ({
  reportHealthcareError: jest.fn(),
}));

describe("Contract: LIFF booking (valid)", () => {
  test("returns 201 for valid booking", async () => {
    const { POST } = await import("@/app/api/liff/booking/route");
    const future = new Date(Date.now() + 3600_000).toISOString();
    const body = {
      accessToken: "token",
      booking: {
        scheduled_at: future,
        type: "blood_test",
        services: ["CBC"],
        instructions: "none",
      },
      location: { address: "Bangkok", lat: 13.75, lng: 100.5 },
    };
    const req = new NextRequest("http://localhost/api/liff/booking", {
      method: "POST",
      body: JSON.stringify(body),
    } as any);
    const res = await POST(req as any);
    expect(res.status).toBe(201);
  });
});

