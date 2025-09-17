/**
 * Happy path: LINE webhook accepts valid payload and responds 200
 */
import { NextRequest } from "next/server";

jest.mock("@/server/line", () => ({
  verifyLineSignature: jest.fn().mockReturnValue(true),
  replyMessage: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/server/agent/router", () => ({
  handleChat: jest.fn().mockResolvedValue([{ type: "text", text: "ok" }]),
  handleLocation: jest.fn().mockResolvedValue([{ type: "text", text: "loc" }]),
  forceBookingStep: jest.fn().mockResolvedValue([{ type: "text", text: "step" }]),
}));

jest.mock("@/server/lineMessages", () => ({
  quickReplyMenu: jest.fn().mockReturnValue({ items: [] }),
  welcomeFlex: jest.fn().mockReturnValue({ type: "text", text: "welcome" }),
  consentConfirm: jest.fn().mockReturnValue({ type: "text", text: "consent" }),
  bookingDetailsFlex: jest.fn().mockReturnValue({ type: "text", text: "details" }),
  profileListFlex: jest.fn().mockReturnValue({ type: "text", text: "profile" }),
}));

jest.mock("@/server/repo/bookings", () => ({
  getLatestBookingByUserId: jest.fn().mockResolvedValue(null),
  getBookingSessionByUserId: jest.fn().mockResolvedValue(null),
}));

jest.mock("@/server/repo/users", () => ({
  findUsersByLineId: jest.fn().mockResolvedValue([]),
}));

jest.mock("@/lib/sentry", () => ({
  reportHealthcareError: jest.fn(),
}));

describe("Contract: LINE webhook (valid)", () => {
  beforeAll(() => {
    process.env.LINE_CHANNEL_SECRET = "secret";
  });

  test("accepts text message event", async () => {
    const { POST } = await import("@/app/api/line/webhook/route");
    const body = {
      destination: "Uxxx",
      events: [
        {
          type: "message",
          replyToken: "rt",
          timestamp: Date.now(),
          source: { type: "user", userId: "U1" },
          message: { type: "text", id: "m1", text: "เมนู" },
        },
      ],
    };
    const req = new NextRequest("http://localhost/api/line/webhook", {
      method: "POST",
      headers: { "x-line-signature": "sig" } as any,
      body: JSON.stringify(body),
    } as any);
    const res = await POST(req as any);
    expect(res.status).toBe(200);
  });
});

