import crypto from "crypto";
import { NextRequest } from "next/server";
import { POST } from "@/app/api/line/webhook/route";
import { clearUserMeta } from "@/server/store/session";

const mockHandleChat = jest.fn(async () => [{ type: "text", text: "ok" }]);
const mockHandleLocation = jest.fn(async () => [{ type: "text", text: "loc" }]);
const mockForceBookingStep = jest.fn(async () => [{ type: "text", text: "force" }]);

jest.mock("@/server/agent/router", () => ({
  handleChat: (...args: Parameters<typeof mockHandleChat>) =>
    mockHandleChat(...args),
  handleLocation: (...args: Parameters<typeof mockHandleLocation>) =>
    mockHandleLocation(...args),
  forceBookingStep: (...args: Parameters<typeof mockForceBookingStep>) =>
    mockForceBookingStep(...args),
}));

const mockReplyMessage = jest.fn(async () => {});

jest.mock("@/server/line", () => {
  return {
    verifyLineSignature: jest.fn((raw: string, signature: string) => {
      const secret = process.env.LINE_CHANNEL_SECRET || "";
      if (!secret || !signature) return false;
      const expected = crypto.createHmac("sha256", secret).update(raw).digest("base64");
      return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(signature));
    }),
    replyMessage: (...args: Parameters<typeof mockReplyMessage>) =>
      mockReplyMessage(...args),
  };
});

jest.mock("@/server/lineMessages", () => ({
  quickReplyMenu: () => ({ items: [] }),
  welcomeFlex: () => ({ type: "text", text: "welcome" }),
  consentConfirm: () => ({ type: "text", text: "consent" }),
  bookingDetailsFlex: () => ({ type: "text", text: "details" }),
  profileListFlex: () => ({ type: "text", text: "profiles" }),
}));

jest.mock("@/lib/sentry", () => ({
  reportHealthcareError: jest.fn(async () => {}),
}));

function buildRequest(payload: unknown, signature: string) {
  const body = JSON.stringify(payload);
  return new NextRequest(
    new Request("http://localhost/api/line/webhook", {
      method: "POST",
      headers: new Headers({
        "content-type": "application/json",
        "x-line-signature": signature,
      }),
      body,
    })
  );
}

function signPayload(payload: unknown) {
  const body = JSON.stringify(payload);
  const signature = crypto
    .createHmac("sha256", process.env.LINE_CHANNEL_SECRET || "")
    .update(body)
    .digest("base64");
  return { signature };
}

describe("Integration: LINE webhook idempotency", () => {
  beforeEach(() => {
    process.env.LINE_CHANNEL_SECRET = "secret";
    jest.clearAllMocks();
    clearUserMeta("user-1");
  });

  afterEach(() => {
    delete process.env.LINE_CHANNEL_SECRET;
    clearUserMeta("user-1");
  });

  it("skips duplicate message events across requests", async () => {
    const payload = {
      destination: "channel",
      events: [
        {
          type: "message",
          replyToken: "reply_token",
          webhookEventId: "event-1",
          deliveryContext: { isRedelivery: false },
          source: { userId: "user-1" },
          message: { type: "text", id: "msg-1", text: "���ʴ�" },
        },
      ],
    };

    const { signature } = signPayload(payload);
    const request1 = buildRequest(payload, signature);
    const res1 = await POST(request1);
    const body1 = await res1.json();
    expect(body1.processed_events).toBe(1);
    expect(body1.skipped_events).toBe(0);

    const request2 = buildRequest(payload, signature);
    const res2 = await POST(request2);
    const body2 = await res2.json();
    expect(body2.processed_events).toBe(0);
    expect(body2.skipped_events).toBe(1);
  });
});

