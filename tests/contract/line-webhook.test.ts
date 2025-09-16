/**
 * Contract Test: POST /api/line/webhook
 *
 * This test MUST FAIL initially (TDD principle) and defines the contract
 * for the LINE webhook API endpoint before any implementation exists.
 *
 * Tests the LINE messaging webhook processing flow.
 */

import request from "supertest";
import crypto from "crypto";
import type {
  LineWebhookRequest,
  LineWebhookResponse,
  ValidationErrorResponse,
  AuthenticationErrorResponse,
  RateLimitErrorResponse,
} from "@/server/types/api";

describe("Contract: POST /api/line/webhook", () => {
  let app: any;
  const webhookEndpoint = "/api/line/webhook";
  const mockChannelSecret = "mock_channel_secret_12345";

  beforeAll(async () => {
    // This will fail until we implement the Next.js API handler
    try {
      // Import the Next.js app for testing
      const { createServer } = await import("http");
      const { parse } = await import("url");
      const next = await import("next");

      const dev = process.env.NODE_ENV !== "production";
      const hostname = "localhost";
      const port = 3003; // Different test port

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
    } catch (error) {
      console.log("Expected failure: Next.js app not ready for testing");
      // This is expected to fail in TDD - we haven't implemented the API yet
    }
  });

  afterAll(async () => {
    if (app && app.close) {
      await new Promise((resolve) => app.close(resolve));
    }
  });

  /**
   * Generate LINE webhook signature for testing
   */
  function generateLineSignature(body: string, secret: string): string {
    return crypto.createHmac("sha256", secret).update(body).digest("base64");
  }

  describe("Successful Webhook Processing", () => {
    it("should process text message event successfully", async () => {
      const textMessageEvent: LineWebhookRequest = {
        destination: "Ua1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p",
        events: [
          {
            type: "message",
            source: {
              userId: testUtils.generateLineUserId(),
            },
            timestamp: Date.now(),
            mode: "active",
            webhookEventId: "webhook_123456789",
            deliveryContext: {
              isRedelivery: false,
            },
            replyToken: "reply_token_123456789",
            message: {
              id: "msg_123456789",
              type: "text",
              text: "สวัสดีครับ ต้องการจองนัดเจาะเลือด",
            },
          },
        ],
      };

      const bodyString = JSON.stringify(textMessageEvent);
      const signature = generateLineSignature(bodyString, mockChannelSecret);

      // This WILL FAIL until we implement the API handler
      const response = await request(app)
        .post(webhookEndpoint)
        .set("X-Line-Signature", signature)
        .set("Content-Type", "application/json")
        .send(textMessageEvent)
        .expect(200);

      const responseBody: LineWebhookResponse = response.body;

      // Contract assertions - these define what the API MUST return
      expect(responseBody.processed_events).toBe(1);
      expect(responseBody.skipped_events).toBe(0);
      expect(responseBody.errors).toHaveLength(0);
    });

    it("should process postback event successfully", async () => {
      const postbackEvent: LineWebhookRequest = {
        destination: "Ua1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p",
        events: [
          {
            type: "postback",
            source: {
              userId: testUtils.generateLineUserId(),
            },
            timestamp: Date.now(),
            mode: "active",
            webhookEventId: "webhook_postback_123",
            deliveryContext: {
              isRedelivery: false,
            },
            replyToken: "reply_token_postback",
            postback: {
              data: JSON.stringify({
                action: "book_appointment",
                date: "2025-09-20",
                time: "10:00",
              }),
            },
          },
        ],
      };

      const bodyString = JSON.stringify(postbackEvent);
      const signature = generateLineSignature(bodyString, mockChannelSecret);

      // This WILL FAIL until implementation
      const response = await request(app)
        .post(webhookEndpoint)
        .set("X-Line-Signature", signature)
        .send(postbackEvent)
        .expect(200);

      const responseBody: LineWebhookResponse = response.body;

      expect(responseBody.processed_events).toBe(1);
      expect(responseBody.skipped_events).toBe(0);
      expect(responseBody.errors).toHaveLength(0);
    });

    it("should process location message event successfully", async () => {
      const locationEvent: LineWebhookRequest = {
        destination: "Ua1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p",
        events: [
          {
            type: "message",
            source: {
              userId: testUtils.generateLineUserId(),
            },
            timestamp: Date.now(),
            mode: "active",
            webhookEventId: "webhook_location_123",
            deliveryContext: {
              isRedelivery: false,
            },
            replyToken: "reply_token_location",
            message: {
              id: "msg_location_123",
              type: "location",
              title: "สำนักงาน",
              address: "123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร",
              latitude: 13.7563,
              longitude: 100.5018,
            },
          },
        ],
      };

      const bodyString = JSON.stringify(locationEvent);
      const signature = generateLineSignature(bodyString, mockChannelSecret);

      // This WILL FAIL until implementation
      const response = await request(app)
        .post(webhookEndpoint)
        .set("X-Line-Signature", signature)
        .send(locationEvent)
        .expect(200);

      const responseBody: LineWebhookResponse = response.body;

      expect(responseBody.processed_events).toBe(1);
      expect(responseBody.skipped_events).toBe(0);
      expect(responseBody.errors).toHaveLength(0);
    });

    it("should process follow event and trigger welcome flow", async () => {
      const followEvent: LineWebhookRequest = {
        destination: "Ua1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p",
        events: [
          {
            type: "follow",
            source: {
              userId: testUtils.generateLineUserId(),
            },
            timestamp: Date.now(),
            mode: "active",
            webhookEventId: "webhook_follow_123",
            deliveryContext: {
              isRedelivery: false,
            },
            replyToken: "reply_token_follow",
          },
        ],
      };

      const bodyString = JSON.stringify(followEvent);
      const signature = generateLineSignature(bodyString, mockChannelSecret);

      // This WILL FAIL until implementation
      const response = await request(app)
        .post(webhookEndpoint)
        .set("X-Line-Signature", signature)
        .send(followEvent)
        .expect(200);

      const responseBody: LineWebhookResponse = response.body;

      expect(responseBody.processed_events).toBe(1);
      expect(responseBody.skipped_events).toBe(0);
      expect(responseBody.errors).toHaveLength(0);
    });

    it("should handle multiple events in single webhook", async () => {
      const multipleEvents: LineWebhookRequest = {
        destination: "Ua1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p",
        events: [
          {
            type: "message",
            source: { userId: testUtils.generateLineUserId() },
            timestamp: Date.now(),
            mode: "active",
            webhookEventId: "webhook_multi_1",
            deliveryContext: { isRedelivery: false },
            replyToken: "reply_token_1",
            message: { id: "msg_1", type: "text", text: "Hello" },
          },
          {
            type: "message",
            source: { userId: testUtils.generateLineUserId() },
            timestamp: Date.now(),
            mode: "active",
            webhookEventId: "webhook_multi_2",
            deliveryContext: { isRedelivery: false },
            replyToken: "reply_token_2",
            message: { id: "msg_2", type: "text", text: "World" },
          },
        ],
      };

      const bodyString = JSON.stringify(multipleEvents);
      const signature = generateLineSignature(bodyString, mockChannelSecret);

      // This WILL FAIL until implementation
      const response = await request(app)
        .post(webhookEndpoint)
        .set("X-Line-Signature", signature)
        .send(multipleEvents)
        .expect(200);

      const responseBody: LineWebhookResponse = response.body;

      expect(responseBody.processed_events).toBe(2);
      expect(responseBody.skipped_events).toBe(0);
      expect(responseBody.errors).toHaveLength(0);
    });
  });

  describe("Signature Validation", () => {
    it("should reject webhook with invalid signature", async () => {
      const validEvent: LineWebhookRequest = {
        destination: "Ua1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p",
        events: [
          {
            type: "message",
            source: { userId: testUtils.generateLineUserId() },
            timestamp: Date.now(),
            mode: "active",
            webhookEventId: "webhook_invalid_sig",
            deliveryContext: { isRedelivery: false },
            replyToken: "reply_token_invalid",
            message: { id: "msg_invalid", type: "text", text: "Test" },
          },
        ],
      };

      // This WILL FAIL until implementation
      const response = await request(app)
        .post(webhookEndpoint)
        .set("X-Line-Signature", "invalid_signature_123")
        .send(validEvent)
        .expect(401);

      const errorResponse: AuthenticationErrorResponse = response.body;

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.code).toBe("AUTHENTICATION_ERROR");
      expect(errorResponse.error.message).toContain("signature");
    });

    it("should reject webhook with missing signature", async () => {
      const validEvent: LineWebhookRequest = {
        destination: "Ua1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p",
        events: [
          {
            type: "message",
            source: { userId: testUtils.generateLineUserId() },
            timestamp: Date.now(),
            mode: "active",
            webhookEventId: "webhook_no_sig",
            deliveryContext: { isRedelivery: false },
            replyToken: "reply_token_no_sig",
            message: { id: "msg_no_sig", type: "text", text: "Test" },
          },
        ],
      };

      // This WILL FAIL until implementation
      const response = await request(app)
        .post(webhookEndpoint)
        .send(validEvent)
        .expect(401);

      const errorResponse: AuthenticationErrorResponse = response.body;

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.code).toBe("AUTHENTICATION_ERROR");
    });
  });

  describe("Validation Errors", () => {
    it("should reject webhook with invalid JSON format", async () => {
      const invalidJson = '{"destination": "test", "events": [invalid json}';
      const signature = generateLineSignature(invalidJson, mockChannelSecret);

      // This WILL FAIL until implementation
      const response = await request(app)
        .post(webhookEndpoint)
        .set("X-Line-Signature", signature)
        .set("Content-Type", "application/json")
        .send(invalidJson)
        .expect(400);

      const errorResponse: ValidationErrorResponse = response.body;

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.code).toBe("VALIDATION_ERROR");
    });

    it("should reject webhook with missing required fields", async () => {
      const invalidEvent = {
        // Missing destination
        events: [
          {
            type: "message",
            // Missing other required fields
          },
        ],
      };

      const bodyString = JSON.stringify(invalidEvent);
      const signature = generateLineSignature(bodyString, mockChannelSecret);

      // This WILL FAIL until implementation
      const response = await request(app)
        .post(webhookEndpoint)
        .set("X-Line-Signature", signature)
        .send(invalidEvent)
        .expect(400);

      const errorResponse: ValidationErrorResponse = response.body;

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.code).toBe("VALIDATION_ERROR");
      expect(errorResponse.error.details?.field_errors).toContainEqual(
        expect.objectContaining({ field: "destination" })
      );
    });

    it("should reject webhook with empty events array", async () => {
      const emptyEvents: LineWebhookRequest = {
        destination: "Ua1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p",
        events: [], // Empty events array
      };

      const bodyString = JSON.stringify(emptyEvents);
      const signature = generateLineSignature(bodyString, mockChannelSecret);

      // This WILL FAIL until implementation
      const response = await request(app)
        .post(webhookEndpoint)
        .set("X-Line-Signature", signature)
        .send(emptyEvents)
        .expect(400);

      const errorResponse: ValidationErrorResponse = response.body;

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.details?.field_errors).toContainEqual(
        expect.objectContaining({
          field: "events",
          message: expect.stringContaining("at least one event"),
        })
      );
    });
  });

  describe("Idempotency Handling", () => {
    it("should handle duplicate webhook events idempotently", async () => {
      const duplicateEvent: LineWebhookRequest = {
        destination: "Ua1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p",
        events: [
          {
            type: "message",
            source: { userId: testUtils.generateLineUserId() },
            timestamp: Date.now(),
            mode: "active",
            webhookEventId: "webhook_idempotent_123", // Same webhook ID
            deliveryContext: { isRedelivery: false },
            replyToken: "reply_token_idempotent",
            message: {
              id: "msg_idempotent",
              type: "text",
              text: "Duplicate test",
            },
          },
        ],
      };

      const bodyString = JSON.stringify(duplicateEvent);
      const signature = generateLineSignature(bodyString, mockChannelSecret);

      // First request - should process normally
      const firstResponse = await request(app)
        .post(webhookEndpoint)
        .set("X-Line-Signature", signature)
        .send(duplicateEvent)
        .expect(200);

      expect(firstResponse.body.processed_events).toBe(1);

      // Duplicate request - should be idempotent
      const secondResponse = await request(app)
        .post(webhookEndpoint)
        .set("X-Line-Signature", signature)
        .send(duplicateEvent)
        .expect(200);

      expect(secondResponse.body.processed_events).toBe(0); // Already processed
      expect(secondResponse.body.skipped_events).toBe(1);
    });

    it("should handle redelivery flag correctly", async () => {
      const redeliveryEvent: LineWebhookRequest = {
        destination: "Ua1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p",
        events: [
          {
            type: "message",
            source: { userId: testUtils.generateLineUserId() },
            timestamp: Date.now(),
            mode: "active",
            webhookEventId: "webhook_redelivery_123",
            deliveryContext: { isRedelivery: true }, // Redelivery flag
            replyToken: "reply_token_redelivery",
            message: {
              id: "msg_redelivery",
              type: "text",
              text: "Redelivery test",
            },
          },
        ],
      };

      const bodyString = JSON.stringify(redeliveryEvent);
      const signature = generateLineSignature(bodyString, mockChannelSecret);

      // This WILL FAIL until implementation
      const response = await request(app)
        .post(webhookEndpoint)
        .set("X-Line-Signature", signature)
        .send(redeliveryEvent)
        .expect(200);

      // Should still process but log as redelivery
      expect(response.body.processed_events).toBe(1);
    });
  });

  describe("Rate Limiting", () => {
    it("should enforce rate limits for webhook processing", async () => {
      const userId = testUtils.generateLineUserId();

      // Create multiple rapid webhook requests from same user
      const requests = Array(10)
        .fill(null)
        .map((_, index) => {
          const event: LineWebhookRequest = {
            destination: "Ua1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p",
            events: [
              {
                type: "message",
                source: { userId },
                timestamp: Date.now() + index,
                mode: "active",
                webhookEventId: `webhook_rate_limit_${index}`,
                deliveryContext: { isRedelivery: false },
                replyToken: `reply_token_rate_${index}`,
                message: {
                  id: `msg_rate_${index}`,
                  type: "text",
                  text: `Message ${index}`,
                },
              },
            ],
          };

          const bodyString = JSON.stringify(event);
          const signature = generateLineSignature(
            bodyString,
            mockChannelSecret
          );

          return request(app)
            .post(webhookEndpoint)
            .set("X-Line-Signature", signature)
            .send(event);
        });

      // This WILL FAIL until implementation
      const responses = await Promise.all(requests);

      // Should have at least one rate limited response
      const rateLimitedResponses = responses.filter((r) => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      const rateLimitResponse: RateLimitErrorResponse =
        rateLimitedResponses[0].body;
      expect(rateLimitResponse.success).toBe(false);
      expect(rateLimitResponse.error.code).toBe("RATE_LIMIT_EXCEEDED");
      expect(
        rateLimitResponse.error.details.retry_after_seconds
      ).toBeGreaterThan(0);
    });
  });

  describe("Error Handling", () => {
    it("should handle partial failures gracefully", async () => {
      const mixedEvents: LineWebhookRequest = {
        destination: "Ua1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p",
        events: [
          {
            type: "message",
            source: { userId: testUtils.generateLineUserId() },
            timestamp: Date.now(),
            mode: "active",
            webhookEventId: "webhook_valid_1",
            deliveryContext: { isRedelivery: false },
            replyToken: "reply_token_valid",
            message: { id: "msg_valid", type: "text", text: "Valid message" },
          },
          {
            type: "unknown_event_type" as any, // Invalid event type
            source: { userId: testUtils.generateLineUserId() },
            timestamp: Date.now(),
            mode: "active",
            webhookEventId: "webhook_invalid_1",
            deliveryContext: { isRedelivery: false },
          },
        ],
      };

      const bodyString = JSON.stringify(mixedEvents);
      const signature = generateLineSignature(bodyString, mockChannelSecret);

      // This WILL FAIL until implementation
      const response = await request(app)
        .post(webhookEndpoint)
        .set("X-Line-Signature", signature)
        .send(mixedEvents)
        .expect(200); // Should still return 200 with partial success

      const responseBody: LineWebhookResponse = response.body;

      expect(responseBody.processed_events).toBe(1); // One valid event
      expect(responseBody.skipped_events).toBe(0);
      expect(responseBody.errors).toHaveLength(1); // One error
      expect(responseBody.errors[0].event_id).toBe("webhook_invalid_1");
    });

    it("should handle service unavailability gracefully", async () => {
      // This test simulates when external services (Redis, Sheets) are down
      const serviceDownEvent: LineWebhookRequest = {
        destination: "Ua1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p",
        events: [
          {
            type: "message",
            source: { userId: "service_down_test_user" }, // Special test user
            timestamp: Date.now(),
            mode: "active",
            webhookEventId: "webhook_service_down",
            deliveryContext: { isRedelivery: false },
            replyToken: "reply_token_service_down",
            message: {
              id: "msg_service_down",
              type: "text",
              text: "Service test",
            },
          },
        ],
      };

      const bodyString = JSON.stringify(serviceDownEvent);
      const signature = generateLineSignature(bodyString, mockChannelSecret);

      // This WILL FAIL until implementation
      const response = await request(app)
        .post(webhookEndpoint)
        .set("X-Line-Signature", signature)
        .send(serviceDownEvent)
        .expect(200); // Should handle gracefully, not return 500

      const responseBody: LineWebhookResponse = response.body;

      // Should acknowledge receipt even if processing fails
      expect(responseBody.processed_events).toBeDefined();
      expect(responseBody.errors).toBeDefined();
    });
  });

  describe("Performance Requirements", () => {
    it("should process webhook within acceptable time limits", async () => {
      const performanceEvent: LineWebhookRequest = {
        destination: "Ua1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p",
        events: [
          {
            type: "message",
            source: { userId: testUtils.generateLineUserId() },
            timestamp: Date.now(),
            mode: "active",
            webhookEventId: "webhook_performance_test",
            deliveryContext: { isRedelivery: false },
            replyToken: "reply_token_performance",
            message: {
              id: "msg_performance",
              type: "text",
              text: "Performance test",
            },
          },
        ],
      };

      const bodyString = JSON.stringify(performanceEvent);
      const signature = generateLineSignature(bodyString, mockChannelSecret);

      const startTime = Date.now();

      // This WILL FAIL until implementation
      const response = await request(app)
        .post(webhookEndpoint)
        .set("X-Line-Signature", signature)
        .send(performanceEvent)
        .expect(200);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should process within 5 seconds (LINE's timeout)
      expect(processingTime).toBeLessThan(5000);
      expect(response.body.processed_events).toBe(1);
    });
  });
});
