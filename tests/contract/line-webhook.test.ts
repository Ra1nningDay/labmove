/**
 * Contract Test: POST /api/line/webhook
 *
 * Updated to call the handler directly instead of spinning up a Next.js dev server.
 * This keeps the contract focused on request/response behaviour while allowing
 * unit-level mocks for external dependencies (LINE messaging, repositories, etc.).
 */

import { NextRequest } from "next/server";
import crypto from "crypto";
import type {
  LineWebhookRequest,
  LineWebhookResponse,
  ValidationErrorResponse,
  AuthenticationErrorResponse,
} from "@/server/types/api";

const mockHandleChat = jest.fn(async (userId: string, text: string) => {
  if (userId === "service_down_test_user") {
    throw new Error("Simulated downstream failure");
  }
  return [{ type: "text", text: `echo:${text}` }];
});
const mockHandleLocation = jest.fn(async () => [
  { type: "text", text: "location:received" },
]);
const mockForceBookingStep = jest.fn(async (_userId: string, step: string) => [
  { type: "text", text: `force:${step}` },
]);

jest.mock("@/server/agent/router", () => ({
  handleChat: (...args: Parameters<typeof mockHandleChat>) =>
    mockHandleChat(...args),
  handleLocation: (...args: Parameters<typeof mockHandleLocation>) =>
    mockHandleLocation(...args),
  forceBookingStep: (...args: Parameters<typeof mockForceBookingStep>) =>
    mockForceBookingStep(...args),
}));

const mockGetLatestBookingByUserId = jest.fn(async () => null);
const mockGetBookingSessionByUserId = jest.fn(async () => null);

jest.mock("@/server/repo/bookings", () => ({
  getLatestBookingByUserId: (
    ...args: Parameters<typeof mockGetLatestBookingByUserId>
  ) => mockGetLatestBookingByUserId(...args),
  getBookingSessionByUserId: (
    ...args: Parameters<typeof mockGetBookingSessionByUserId>
  ) => mockGetBookingSessionByUserId(...args),
  appendBooking: jest.fn(),
  upsertBookingSession: jest.fn(),
}));

const mockFindUsersByLineId = jest.fn(async () => []);

jest.mock("@/server/repo/users", () => ({
  findUsersByLineId: (...args: Parameters<typeof mockFindUsersByLineId>) =>
    mockFindUsersByLineId(...args),
  saveUser: jest.fn(),
  findUserByLineId: jest.fn(async () => null),
}));

jest.mock("@/server/lineMessages", () => ({
  quickReplyMenu: () => ({ items: [] }),
  welcomeFlex: () => ({ type: "text", text: "welcome" }),
  consentConfirm: () => ({ type: "text", text: "consent" }),
  bookingDetailsFlex: () => ({ type: "text", text: "booking-details" }),
  profileListFlex: () => ({ type: "text", text: "profile-list" }),
}));

const mockReplyMessage = jest.fn(async () => {});

jest.mock("@/server/line", () => {
  const cryptoModule = require("crypto") as typeof import("crypto");
  return {
    verifyLineSignature: jest.fn((raw: string, signature: string) => {
      const secret = process.env.LINE_CHANNEL_SECRET || "";
      if (!secret || !signature) return false;
      const expected = cryptoModule
        .createHmac("sha256", secret)
        .update(raw)
        .digest("base64");
      return cryptoModule.timingSafeEqual(
        Buffer.from(expected),
        Buffer.from(signature)
      );
    }),
    replyMessage: (...args: Parameters<typeof mockReplyMessage>) =>
      mockReplyMessage(...args),
  };
});

jest.mock("@/lib/sentry", () => ({
  reportHealthcareError: jest.fn(async () => {}),
}));

import { POST } from "@/app/api/line/webhook/route";
import { clearUserMeta } from "@/server/store/session";

function generateLineSignature(body: string, secret: string): string {
  return crypto.createHmac("sha256", secret).update(body).digest("base64");
}

type InvokeOptions = {
  includeSignature?: boolean;
  signatureOverride?: string;
  rawBody?: string;
};

async function invokeWebhook(
  payload: LineWebhookRequest,
  options?: InvokeOptions
): Promise<{ status: number; body: LineWebhookResponse }>; // overload for normal payload
async function invokeWebhook(
  payload: LineWebhookRequest | string,
  options?: InvokeOptions
): Promise<{ status: number; body: any }>;
async function invokeWebhook(
  payload: LineWebhookRequest | string,
  options: InvokeOptions = {}
): Promise<{ status: number; body: any }> {
  const rawBody =
    typeof payload === "string" ? payload : JSON.stringify(payload ?? {});
  const headers = new Headers({ "content-type": "application/json" });
  if (options.includeSignature !== false) {
    const signature =
      options.signatureOverride ??
      generateLineSignature(rawBody, process.env.LINE_CHANNEL_SECRET || "");
    headers.set("x-line-signature", signature);
  }
  const request = new NextRequest(
    new Request("http://localhost/api/line/webhook", {
      method: "POST",
      headers,
      body: options.rawBody ?? rawBody,
    })
  );
  const response = await POST(request);
  const body = await response.json();
  return { status: response.status, body };
}

describe("Contract: POST /api/line/webhook", () => {
  const mockChannelSecret = "mock_channel_secret_12345";
  const originalSecret = process.env.LINE_CHANNEL_SECRET;

  beforeAll(() => {
    process.env.LINE_CHANNEL_SECRET = mockChannelSecret;
  });

  afterAll(() => {
    process.env.LINE_CHANNEL_SECRET = originalSecret;
  });

  beforeEach(() => {
    jest.clearAllMocks();
    ["test-user", "dup-user", "redeliver", "service_down_test_user"].forEach(
      (id) => clearUserMeta(id)
    );
  });

  describe("Successful Webhook Processing", () => {
    it("processes a text message event", async () => {
      const event: LineWebhookRequest = {
        destination: "channel_dest",
        events: [
          {
            type: "message",
            source: { userId: "test-user" },
            timestamp: Date.now(),
            mode: "active",
            webhookEventId: "event_text_1",
            deliveryContext: { isRedelivery: false },
            replyToken: "reply_token_1",
            message: {
              id: "msg_1",
              type: "text",
              text: "����",
            },
          },
        ],
      };

      const { status, body } = await invokeWebhook(event);

      expect(status).toBe(200);
      expect(body.processed_events).toBe(1);
      expect(body.skipped_events).toBe(0);
      expect(body.errors).toHaveLength(0);
      expect(mockReplyMessage).toHaveBeenCalledTimes(1);
    });

    it("processes a postback event", async () => {
      const event: LineWebhookRequest = {
        destination: "channel_dest",
        events: [
          {
            type: "postback",
            source: { userId: "test-user" },
            timestamp: Date.now(),
            mode: "active",
            webhookEventId: "event_postback_1",
            deliveryContext: { isRedelivery: false },
            replyToken: "reply_token_2",
            postback: { data: "{}" },
          },
        ],
      };

      const { status, body } = await invokeWebhook(event);

      expect(status).toBe(200);
      expect(body.processed_events).toBe(1);
      expect(body.skipped_events).toBe(0);
    });

    it("processes a location message event", async () => {
      const event: LineWebhookRequest = {
        destination: "channel_dest",
        events: [
          {
            type: "message",
            source: { userId: "test-user" },
            timestamp: Date.now(),
            mode: "active",
            webhookEventId: "event_location_1",
            deliveryContext: { isRedelivery: false },
            replyToken: "reply_token_loc",
            message: {
              id: "msg_loc",
              type: "location",
              latitude: 13.75,
              longitude: 100.5,
              address: "Bangkok",
            },
          },
        ],
      };

      const { status, body } = await invokeWebhook(event);

      expect(status).toBe(200);
      expect(body.processed_events).toBe(1);
      expect(body.skipped_events).toBe(0);
      expect(mockHandleLocation).toHaveBeenCalled();
    });

    it("processes a follow event", async () => {
      const event: LineWebhookRequest = {
        destination: "channel_dest",
        events: [
          {
            type: "follow",
            source: { userId: "test-user" },
            timestamp: Date.now(),
            mode: "active",
            webhookEventId: "event_follow_1",
            deliveryContext: { isRedelivery: false },
            replyToken: "reply_token_follow",
          },
        ],
      };

      const { status, body } = await invokeWebhook(event);

      expect(status).toBe(200);
      expect(body.processed_events).toBe(1);
      expect(mockReplyMessage).toHaveBeenCalledTimes(1);
    });
  });

  describe("Signature Validation", () => {
    it("rejects webhook with invalid signature", async () => {
      const payload: LineWebhookRequest = {
        destination: "channel_dest",
        events: [],
      };

      const { status, body } = await invokeWebhook(payload, {
        signatureOverride: generateLineSignature("{}", "wrong_secret"),
      });

      const error = body as unknown as AuthenticationErrorResponse;
      expect(status).toBe(401);
      expect(error.success).toBe(false);
      expect(error.error.code).toBe("WEBHOOK_AUTHENTICATION_ERROR");
    });

    it("rejects webhook with missing signature header", async () => {
      const payload: LineWebhookRequest = {
        destination: "channel_dest",
        events: [],
      };

      const { status, body } = await invokeWebhook(payload, {
        includeSignature: false,
      });

      const error = body as unknown as AuthenticationErrorResponse;
      expect(status).toBe(401);
      expect(error.error.code).toBe("WEBHOOK_AUTHENTICATION_ERROR");
    });
  });

  describe("Validation Errors", () => {
    it("rejects invalid JSON", async () => {
      const rawBody = "{ invalid json }";
      const { status, body } = await invokeWebhook(
        "" as unknown as LineWebhookRequest,
        {
          rawBody,
          signatureOverride: generateLineSignature(rawBody, mockChannelSecret),
        }
      );

      const error = body as unknown as ValidationErrorResponse;
      expect(status).toBe(400);
      expect(error.error.code).toBe("VALIDATION_ERROR");
    });

    it("rejects payload with missing required fields", async () => {
      const payload = {
        events: "not_an_array",
      } as unknown as LineWebhookRequest;
      const { status, body } = await invokeWebhook(payload);

      const error = body as unknown as ValidationErrorResponse;
      expect(status).toBe(400);
      expect(error.error.code).toBe("VALIDATION_ERROR");
      expect(error.error.details?.field_errors).toBeDefined();
    });
  });

  describe("Idempotency Handling", () => {
    it("skips duplicate events by message id", async () => {
      const baseEvent = {
        type: "message" as const,
        source: { userId: "dup-user" },
        timestamp: Date.now(),
        mode: "active" as const,
        webhookEventId: "event_dup",
        deliveryContext: { isRedelivery: false },
        replyToken: "reply_dup",
        message: {
          id: "msg_dup",
          type: "text" as const,
          text: "hello",
        },
      };

      const payload: LineWebhookRequest = {
        destination: "channel_dest",
        events: [baseEvent, baseEvent],
      };

      const { status, body } = await invokeWebhook(payload);

      expect(status).toBe(200);
      expect(body.processed_events).toBe(1);
      expect(body.skipped_events).toBe(1);
    });

    it("skips events flagged as redelivery", async () => {
      const payload: LineWebhookRequest = {
        destination: "channel_dest",
        events: [
          {
            type: "message",
            source: { userId: "redeliver" },
            timestamp: Date.now(),
            mode: "active",
            webhookEventId: "event_redelivery",
            deliveryContext: { isRedelivery: true },
            replyToken: "reply_redelivery",
            message: {
              id: "msg_redelivery",
              type: "text",
              text: "ignored",
            },
          },
        ],
      };

      const { status, body } = await invokeWebhook(payload);

      expect(status).toBe(200);
      expect(body.processed_events).toBe(0);
      expect(body.skipped_events).toBe(1);
    });
  });

  describe("Error Handling", () => {
    it("records errors for unsupported event types", async () => {
      const payload: LineWebhookRequest = {
        destination: "channel_dest",
        events: [
          {
            type: "unknown" as "message",
            source: { userId: "test-user" },
            timestamp: Date.now(),
            mode: "active",
            webhookEventId: "event_unknown",
            deliveryContext: { isRedelivery: false },
            replyToken: "reply_unknown",
          },
        ],
      };

      const { status, body } = await invokeWebhook(payload);

      expect(status).toBe(200);
      expect(body.processed_events).toBe(0);
      expect(body.skipped_events).toBe(1);
    });

    it("captures downstream failures and continues", async () => {
      const payload: LineWebhookRequest = {
        destination: "channel_dest",
        events: [
          {
            type: "message",
            source: { userId: "service_down_test_user" },
            timestamp: Date.now(),
            mode: "active",
            webhookEventId: "event_failure",
            deliveryContext: { isRedelivery: false },
            replyToken: "reply_failure",
            message: {
              id: "msg_failure",
              type: "text",
              text: "Service test",
            },
          },
        ],
      };

      const { status, body } = await invokeWebhook(payload);

      expect(status).toBe(200);
      expect(body.errors).toHaveLength(1);
      expect(body.errors[0].event_id).toBe("event_failure");
    });
  });
});
