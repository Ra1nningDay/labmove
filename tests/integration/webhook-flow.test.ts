/**
 * Integration Test: Complete LINE Webhook Flow
 *
 * This test MUST FAIL initially (TDD principle) and defines the integration
 * behavior for LINE webhook processing before any implementation exists.
 *
 * Tests the end-to-end webhook processing from LINE events through
 * message handling, user session management, and response generation.
 */

import request from "supertest";
import { getRedisClient } from "@/lib/redis";
import type {
  LineWebhookRequest,
  LineWebhookResponse,
  ValidationErrorResponse,
} from "@/server/types/api";

// Test utilities for generating mock LINE webhook data
const testUtils = {
  generateLineUserId(): string {
    return `U${Math.random().toString(36).substring(2, 15)}${Math.random()
      .toString(36)
      .substring(2, 15)}`;
  },

  generateWebhookEventId(): string {
    return `${Date.now().toString(36)}-${Math.random()
      .toString(36)
      .substring(2, 8)}`;
  },

  generatePatientId(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `PAT_${dateStr}_${randomId}`;
  },

  generateBookingId(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `BK_${dateStr}_${randomId}`;
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createTextMessageEvent(userId: string, text: string): any {
    return {
      type: "message",
      source: { userId },
      timestamp: Date.now(),
      mode: "active",
      webhookEventId: this.generateWebhookEventId(),
      deliveryContext: { isRedelivery: false },
      message: {
        type: "text",
        id: this.generateWebhookEventId(),
        text,
        quoteToken: `quote_token_${Math.random().toString(36).substring(2, 8)}`,
      },
      replyToken: `reply_token_${Math.random().toString(36).substring(2, 15)}`,
    };
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createPostbackEvent(userId: string, data: string): any {
    return {
      type: "postback",
      source: { userId },
      timestamp: Date.now(),
      mode: "active",
      webhookEventId: this.generateWebhookEventId(),
      deliveryContext: { isRedelivery: false },
      postback: { data },
      replyToken: `reply_token_${Math.random().toString(36).substring(2, 15)}`,
    };
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createFollowEvent(userId: string): any {
    return {
      type: "follow",
      source: { userId },
      timestamp: Date.now(),
      mode: "active",
      webhookEventId: this.generateWebhookEventId(),
      deliveryContext: { isRedelivery: false },
      replyToken: `reply_token_${Math.random().toString(36).substring(2, 15)}`,
    };
  },

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  createUnfollowEvent(userId: string): any {
    return {
      type: "unfollow",
      source: { userId },
      timestamp: Date.now(),
      mode: "active",
      webhookEventId: this.generateWebhookEventId(),
      deliveryContext: { isRedelivery: false },
    };
  },
};

describe("Integration: Complete LINE Webhook Flow", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let app: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let redis: any;
  const webhookEndpoint = "/api/line/webhook";

  beforeAll(async () => {
    // This will fail until we implement the Next.js API handler
    try {
      // Import the Next.js app for testing
      const { createServer } = await import("http");
      const { parse } = await import("url");
      const next = await import("next");

      const dev = process.env.NODE_ENV !== "production";
      const hostname = "localhost";
      const port = 3007; // Different test port

      const nextApp = next.default({ dev, hostname, port });
      await nextApp.prepare();

      const handle = nextApp.getRequestHandler();

      app = createServer(async (req, res) => {
        try {
          const parsedUrl = parse(req.url!, true);
          await handle(req, res, parsedUrl);
        } catch (err) {
          console.error("Error occurred handling", req.url, err);
          res.statusCode = 500;
          res.end("internal server error");
        }
      });

      // Setup Redis client
      redis = await getRedisClient();
    } catch {
      console.log("Expected failure: Next.js app not ready for testing");
      // This is expected to fail in TDD - we haven't implemented the API yet
    }
  });

  afterAll(async () => {
    if (app && app.close) {
      await new Promise((resolve) => app.close(resolve));
    }
  });

  beforeEach(async () => {
    // Clean up Redis test data before each test
    try {
      if (redis) {
        const testKeys = await redis.keys("test:*");
        if (testKeys.length > 0) {
          await redis.del(...testKeys);
        }
      }
    } catch {
      console.log("Redis cleanup skipped (expected in TDD)");
    }
  });

  describe("Message Processing Flow", () => {
    it("should process text message from new user", async () => {
      const mockUserId = testUtils.generateLineUserId();
      const mockDestination = `channel_destination_${Math.random()
        .toString(36)
        .substring(2, 8)}`;

      const webhookRequest: LineWebhookRequest = {
        destination: mockDestination,
        events: [testUtils.createTextMessageEvent(mockUserId, "สวัสดีครับ")],
      };

      // This WILL FAIL until we implement the webhook handler
      const response = await request(app)
        .post(webhookEndpoint)
        .send(webhookRequest)
        .expect(200);

      const responseBody: LineWebhookResponse = response.body;

      // Verify webhook response structure
      expect(responseBody.processed_events).toBe(1);
      expect(responseBody.skipped_events).toBe(0);
      expect(responseBody.errors).toHaveLength(0);

      // Verify Redis session was created for new user
      if (redis) {
        const sessionKey = `user_session:${mockUserId}`;
        const sessionData = await redis.get(sessionKey);
        expect(sessionData).toBeDefined();

        const session = JSON.parse(sessionData!);
        expect(session.line_user_id).toBe(mockUserId);
        expect(session.current_flow).toBe("welcome");
        expect(session.created_at).toBeDefined();
        expect(session.last_activity).toBeDefined();
      }
    });

    it("should process booking intent from registered user", async () => {
      const mockUserId = testUtils.generateLineUserId();
      const mockPatientId = testUtils.generatePatientId();
      const mockDestination = `channel_destination_${Math.random()
        .toString(36)
        .substring(2, 8)}`;

      // Pre-populate user session to simulate registered user
      if (redis) {
        const sessionKey = `user_session:${mockUserId}`;
        const existingSession = {
          line_user_id: mockUserId,
          patient_id: mockPatientId,
          registration_completed: true,
          current_flow: "main_menu",
          created_at: new Date().toISOString(),
          last_activity: new Date().toISOString(),
        };
        await redis.setex(sessionKey, 86400, JSON.stringify(existingSession));
      }

      const webhookRequest: LineWebhookRequest = {
        destination: mockDestination,
        events: [
          testUtils.createTextMessageEvent(mockUserId, "จองนัดตรวจเลือด"),
        ],
      };

      // This WILL FAIL until implementation
      const response = await request(app)
        .post(webhookEndpoint)
        .send(webhookRequest)
        .expect(200);

      const responseBody: LineWebhookResponse = response.body;

      // Verify successful message processing
      expect(responseBody.processed_events).toBe(1);
      expect(responseBody.skipped_events).toBe(0);
      expect(responseBody.errors).toHaveLength(0);

      // Verify session flow updated for booking
      if (redis) {
        const sessionKey = `user_session:${mockUserId}`;
        const sessionData = await redis.get(sessionKey);
        expect(sessionData).toBeDefined();

        const session = JSON.parse(sessionData!);
        expect(session.current_flow).toBe("booking_flow");
        expect(session.booking_intent).toBe("blood_test");
        expect(session.last_activity).toBeDefined();
      }
    });

    it("should process postback action for booking confirmation", async () => {
      const mockUserId = testUtils.generateLineUserId();
      const mockPatientId = testUtils.generatePatientId();
      const mockBookingId = testUtils.generateBookingId();
      const mockDestination = `channel_destination_${Math.random()
        .toString(36)
        .substring(2, 8)}`;

      // Pre-populate user session with pending booking
      if (redis) {
        const sessionKey = `user_session:${mockUserId}`;
        const existingSession = {
          line_user_id: mockUserId,
          patient_id: mockPatientId,
          registration_completed: true,
          current_flow: "booking_confirmation",
          pending_booking_id: mockBookingId,
          created_at: new Date().toISOString(),
          last_activity: new Date().toISOString(),
        };
        await redis.setex(sessionKey, 86400, JSON.stringify(existingSession));
      }

      const webhookRequest: LineWebhookRequest = {
        destination: mockDestination,
        events: [
          testUtils.createPostbackEvent(
            mockUserId,
            `confirm_booking:${mockBookingId}`
          ),
        ],
      };

      const response = await request(app)
        .post(webhookEndpoint)
        .send(webhookRequest)
        .expect(200);

      const responseBody: LineWebhookResponse = response.body;

      // Verify postback processing
      expect(responseBody.processed_events).toBe(1);
      expect(responseBody.skipped_events).toBe(0);
      expect(responseBody.errors).toHaveLength(0);

      // Verify booking confirmation in session
      if (redis) {
        const sessionKey = `user_session:${mockUserId}`;
        const sessionData = await redis.get(sessionKey);
        expect(sessionData).toBeDefined();

        const session = JSON.parse(sessionData!);
        expect(session.current_flow).toBe("booking_confirmed");
        expect(session.confirmed_booking_id).toBe(mockBookingId);
        expect(session.pending_booking_id).toBeUndefined();
      }
    });
  });

  describe("User Lifecycle Events", () => {
    it("should handle new user follow event", async () => {
      const mockUserId = testUtils.generateLineUserId();
      const mockDestination = `channel_destination_${Math.random()
        .toString(36)
        .substring(2, 8)}`;

      const webhookRequest: LineWebhookRequest = {
        destination: mockDestination,
        events: [testUtils.createFollowEvent(mockUserId)],
      };

      const response = await request(app)
        .post(webhookEndpoint)
        .send(webhookRequest)
        .expect(200);

      const responseBody: LineWebhookResponse = response.body;

      // Verify follow event processing
      expect(responseBody.processed_events).toBe(1);
      expect(responseBody.skipped_events).toBe(0);
      expect(responseBody.errors).toHaveLength(0);

      // Verify new user session creation
      if (redis) {
        const sessionKey = `user_session:${mockUserId}`;
        const sessionData = await redis.get(sessionKey);
        expect(sessionData).toBeDefined();

        const session = JSON.parse(sessionData!);
        expect(session.line_user_id).toBe(mockUserId);
        expect(session.current_flow).toBe("welcome");
        expect(session.registration_completed).toBe(false);
        expect(session.created_at).toBeDefined();
      }
    });

    it("should handle user unfollow event", async () => {
      const mockUserId = testUtils.generateLineUserId();
      const mockPatientId = testUtils.generatePatientId();
      const mockDestination = `channel_destination_${Math.random()
        .toString(36)
        .substring(2, 8)}`;

      // Pre-populate user session
      if (redis) {
        const sessionKey = `user_session:${mockUserId}`;
        const existingSession = {
          line_user_id: mockUserId,
          patient_id: mockPatientId,
          registration_completed: true,
          current_flow: "main_menu",
          created_at: new Date().toISOString(),
          last_activity: new Date().toISOString(),
        };
        await redis.setex(sessionKey, 86400, JSON.stringify(existingSession));
      }

      const webhookRequest: LineWebhookRequest = {
        destination: mockDestination,
        events: [testUtils.createUnfollowEvent(mockUserId)],
      };

      const response = await request(app)
        .post(webhookEndpoint)
        .send(webhookRequest)
        .expect(200);

      const responseBody: LineWebhookResponse = response.body;

      // Verify unfollow event processing
      expect(responseBody.processed_events).toBe(1);
      expect(responseBody.skipped_events).toBe(0);
      expect(responseBody.errors).toHaveLength(0);

      // Verify session deactivation
      if (redis) {
        const sessionKey = `user_session:${mockUserId}`;
        const sessionData = await redis.get(sessionKey);

        if (sessionData) {
          const session = JSON.parse(sessionData);
          expect(session.status).toBe("deactivated");
          expect(session.unfollowed_at).toBeDefined();
        }
      }
    });
  });

  describe("Batch Event Processing", () => {
    it("should process multiple events in single webhook request", async () => {
      const mockUserId1 = testUtils.generateLineUserId();
      const mockUserId2 = testUtils.generateLineUserId();
      const mockDestination = `channel_destination_${Math.random()
        .toString(36)
        .substring(2, 8)}`;

      const webhookRequest: LineWebhookRequest = {
        destination: mockDestination,
        events: [
          testUtils.createFollowEvent(mockUserId1),
          testUtils.createTextMessageEvent(mockUserId1, "สวัสดีครับ"),
          testUtils.createTextMessageEvent(mockUserId2, "ต้องการจองตรวจเลือด"),
          testUtils.createPostbackEvent(mockUserId2, "help:booking_info"),
        ],
      };

      const response = await request(app)
        .post(webhookEndpoint)
        .send(webhookRequest)
        .expect(200);

      const responseBody: LineWebhookResponse = response.body;

      // Verify all events processed
      expect(responseBody.processed_events).toBe(4);
      expect(responseBody.skipped_events).toBe(0);
      expect(responseBody.errors).toHaveLength(0);

      // Verify both user sessions created/updated
      if (redis) {
        const session1Key = `user_session:${mockUserId1}`;
        const session1Data = await redis.get(session1Key);
        expect(session1Data).toBeDefined();

        const session2Key = `user_session:${mockUserId2}`;
        const session2Data = await redis.get(session2Key);
        expect(session2Data).toBeDefined();
      }
    });

    it("should handle mixed success and error events gracefully", async () => {
      const mockUserId = testUtils.generateLineUserId();
      const mockDestination = `channel_destination_${Math.random()
        .toString(36)
        .substring(2, 8)}`;

      const webhookRequest: LineWebhookRequest = {
        destination: mockDestination,
        events: [
          testUtils.createTextMessageEvent(mockUserId, "สวัสดีครับ"),
          {
            // Malformed event to trigger error
            type: "unknown_event_type",
            source: { userId: mockUserId },
            timestamp: Date.now(),
            mode: "active",
            webhookEventId: testUtils.generateWebhookEventId(),
            deliveryContext: { isRedelivery: false },
          },
          testUtils.createFollowEvent(mockUserId),
        ],
      };

      const response = await request(app)
        .post(webhookEndpoint)
        .send(webhookRequest)
        .expect(200);

      const responseBody: LineWebhookResponse = response.body;

      // Should process valid events and report errors for invalid ones
      expect(responseBody.processed_events).toBe(2); // 2 valid events
      expect(responseBody.skipped_events).toBe(0);
      expect(responseBody.errors).toHaveLength(1); // 1 error event
      expect(responseBody.errors[0].error).toContain("unknown_event_type");
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should validate LINE webhook signature", async () => {
      const mockUserId = testUtils.generateLineUserId();
      const mockDestination = `channel_destination_${Math.random()
        .toString(36)
        .substring(2, 8)}`;

      const webhookRequest: LineWebhookRequest = {
        destination: mockDestination,
        events: [testUtils.createTextMessageEvent(mockUserId, "สวัสดีครับ")],
      };

      // Send without proper LINE signature header
      const response = await request(app)
        .post(webhookEndpoint)
        .send(webhookRequest)
        .expect(401);

      const errorResponse = response.body;
      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.code).toBe("WEBHOOK_AUTHENTICATION_ERROR");
      expect(errorResponse.error.message).toContain(
        "Invalid webhook signature"
      );
    });

    it("should handle empty events array", async () => {
      const mockDestination = `channel_destination_${Math.random()
        .toString(36)
        .substring(2, 8)}`;

      const webhookRequest: LineWebhookRequest = {
        destination: mockDestination,
        events: [],
      };

      const response = await request(app)
        .post(webhookEndpoint)
        .send(webhookRequest)
        .expect(200);

      const responseBody: LineWebhookResponse = response.body;

      // Should handle empty events gracefully
      expect(responseBody.processed_events).toBe(0);
      expect(responseBody.skipped_events).toBe(0);
      expect(responseBody.errors).toHaveLength(0);
    });

    it("should handle malformed webhook request", async () => {
      const malformedRequest = {
        // Missing required fields
        events: "not_an_array",
      };

      const response = await request(app)
        .post(webhookEndpoint)
        .send(malformedRequest)
        .expect(400);

      const errorResponse: ValidationErrorResponse = response.body;
      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.code).toBe("VALIDATION_ERROR");
      expect(errorResponse.error.details?.field_errors).toContainEqual(
        expect.objectContaining({
          field: "events",
          message: expect.stringContaining("must be an array"),
        })
      );
    });
  });

  describe("Performance and Concurrency", () => {
    it("should process webhook within acceptable time limits", async () => {
      const mockUserId = testUtils.generateLineUserId();
      const mockDestination = `channel_destination_${Math.random()
        .toString(36)
        .substring(2, 8)}`;

      const webhookRequest: LineWebhookRequest = {
        destination: mockDestination,
        events: [
          testUtils.createTextMessageEvent(mockUserId, "สวัสดีครับ"),
          testUtils.createFollowEvent(mockUserId),
        ],
      };

      const startTime = Date.now();

      const response = await request(app)
        .post(webhookEndpoint)
        .send(webhookRequest)
        .expect(200);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should complete within 3 seconds for fast webhook response
      expect(processingTime).toBeLessThan(3000);
      expect(response.body.processed_events).toBe(2);
    });

    it("should handle high volume of events efficiently", async () => {
      const mockDestination = `channel_destination_${Math.random()
        .toString(36)
        .substring(2, 8)}`;

      // Generate 20 events from different users
      const events = [];
      for (let i = 0; i < 20; i++) {
        const userId = testUtils.generateLineUserId();
        events.push(
          testUtils.createTextMessageEvent(userId, `สวัสดีครับ ${i}`)
        );
      }

      const webhookRequest: LineWebhookRequest = {
        destination: mockDestination,
        events,
      };

      const startTime = Date.now();

      const response = await request(app)
        .post(webhookEndpoint)
        .send(webhookRequest)
        .expect(200);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should handle 20 events within 5 seconds
      expect(processingTime).toBeLessThan(5000);
      expect(response.body.processed_events).toBe(20);
      expect(response.body.errors).toHaveLength(0);
    });
  });
});
