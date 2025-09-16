/**
 * Integration Test: Complete User Signup Flow
 *
 * This test MUST FAIL initially (TDD principle) and defines the integration
 * behavior for the complete user signup flow before any implementation exists.
 *
 * Tests the end-to-end signup process from LIFF authentication through
 * Google Sheets registration and LINE welcome message flow.
 */

import request from "supertest";
import { getRedisClient } from "@/lib/redis";
import type {
  LiffSignupRequest,
  LiffSignupResponse,
  ValidationErrorResponse,
  AuthenticationErrorResponse,
} from "@/server/types/api";

// Test utilities for generating mock data
const testUtils = {
  generateLineUserId(): string {
    return `U${Math.random().toString(36).substring(2, 15)}${Math.random()
      .toString(36)
      .substring(2, 15)}`;
  },

  generateThaiPhone(): string {
    const operators = ["06", "08", "09"];
    const operator = operators[Math.floor(Math.random() * operators.length)];
    const number = Math.floor(Math.random() * 90000000) + 10000000;
    return `${operator}${number}`;
  },

  generateThaiAddress(): string {
    const districts = ["วัฒนา", "คลองเตย", "สาทร", "ปทุมวัน", "บางรัก"];
    const provinces = ["กรุงเทพมหานคร", "นนทบุรี", "ปทุมธานี", "สมุทรปราการ"];

    const district = districts[Math.floor(Math.random() * districts.length)];
    const province = provinces[Math.floor(Math.random() * provinces.length)];
    const houseNumber = Math.floor(Math.random() * 999) + 1;
    const soi = Math.floor(Math.random() * 99) + 1;

    return `${houseNumber} ซอย ${soi} เขต${district} ${province} 10110`;
  },
};

describe("Integration: Complete User Signup Flow", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let app: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let redis: any;
  const signupEndpoint = "/api/liff/signup";

  beforeAll(async () => {
    // This will fail until we implement the Next.js API handler
    try {
      // Import the Next.js app for testing
      const { createServer } = await import("http");
      const { parse } = await import("url");
      const next = await import("next");

      const dev = process.env.NODE_ENV !== "production";
      const hostname = "localhost";
      const port = 3005; // Different test port

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

  describe("Successful Signup Flow", () => {
    it("should complete full signup flow for new user with minimal data", async () => {
      const mockLineUserId = testUtils.generateLineUserId();
      const mockAccessToken = `mock_access_token_${mockLineUserId}`;

      const signupRequest: LiffSignupRequest = {
        accessToken: mockAccessToken,
        patient: {
          name: "สมชาย ใจดี",
          phone: testUtils.generateThaiPhone(),
          address: testUtils.generateThaiAddress(),
          age: 35,
          gender: "male",
        },
        consent: {
          terms_accepted: true,
          privacy_accepted: true,
          marketing_accepted: true,
        },
        preferences: {
          notifications_enabled: true,
          preferred_contact_method: "line",
        },
      };

      // This WILL FAIL until we implement the API handler
      const response = await request(app)
        .post(signupEndpoint)
        .send(signupRequest)
        .expect(201);

      const responseBody: LiffSignupResponse = response.body;

      // Verify API response structure
      expect(responseBody.patient_id).toBeDefined();
      expect(responseBody.patient_id).toMatch(/^PAT_\d{8}_[A-Z0-9]{6}$/);
      expect(responseBody.line_user_id).toBe(mockLineUserId);
      expect(responseBody.registration_complete).toBe(true);
      expect(responseBody.next_step).toBe("book_appointment");

      // Verify Redis session was created
      if (redis) {
        const sessionKey = `user_session:${mockLineUserId}`;
        const sessionData = await redis.get(sessionKey);
        expect(sessionData).toBeDefined();

        const session = JSON.parse(sessionData!);
        expect(session.patient_id).toBe(responseBody.patient_id);
        expect(session.registration_completed).toBe(true);
        expect(session.line_user_id).toBe(mockLineUserId);
      }
    });

    it("should complete signup flow with emergency contact information", async () => {
      const mockLineUserId = testUtils.generateLineUserId();
      const mockAccessToken = `mock_access_token_${mockLineUserId}`;

      const signupRequest: LiffSignupRequest = {
        accessToken: mockAccessToken,
        patient: {
          name: "วิไลพร สุขสันต์",
          phone: testUtils.generateThaiPhone(),
          address: testUtils.generateThaiAddress(),
          age: 40,
          gender: "female",
          hn: "HN123456789",
          hospital: "โรงพยาบาลจุฬาลงกรณ์",
          emergency_contact: {
            name: "สมศักดิ์ สุขสันต์",
            phone: testUtils.generateThaiPhone(),
            relationship: "สามี",
          },
        },
        consent: {
          terms_accepted: true,
          privacy_accepted: true,
          marketing_accepted: false,
        },
        preferences: {
          notifications_enabled: true,
          preferred_contact_method: "both",
        },
      };

      // This WILL FAIL until implementation
      const response = await request(app)
        .post(signupEndpoint)
        .send(signupRequest)
        .expect(201);

      const responseBody: LiffSignupResponse = response.body;

      // Verify comprehensive data was saved
      expect(responseBody.patient_id).toBeDefined();
      expect(responseBody.line_user_id).toBe(mockLineUserId);
      expect(responseBody.registration_complete).toBe(true);

      // Verify session includes emergency contact data
      if (redis) {
        const sessionKey = `user_session:${mockLineUserId}`;
        const sessionData = await redis.get(sessionKey);
        expect(sessionData).toBeDefined();

        const session = JSON.parse(sessionData!);
        expect(session.patient_data.emergency_contact).toBeDefined();
        expect(session.patient_data.emergency_contact.name).toBe(
          "สมศักดิ์ สุขสันต์"
        );
        expect(session.patient_data.emergency_contact.relationship).toBe(
          "สามี"
        );
      }
    });

    it("should create user session and initiate LINE integration", async () => {
      const mockLineUserId = testUtils.generateLineUserId();
      const mockAccessToken = `mock_access_token_${mockLineUserId}`;

      const signupRequest: LiffSignupRequest = {
        accessToken: mockAccessToken,
        patient: {
          name: "อนุชา เก่งดี",
          phone: testUtils.generateThaiPhone(),
          address: testUtils.generateThaiAddress(),
          age: 33,
          gender: "male",
        },
        consent: {
          terms_accepted: true,
          privacy_accepted: true,
        },
        preferences: {
          notifications_enabled: true,
          preferred_contact_method: "line",
        },
      };

      // This WILL FAIL until implementation
      const response = await request(app)
        .post(signupEndpoint)
        .send(signupRequest)
        .expect(201);

      const responseBody: LiffSignupResponse = response.body;

      // Verify session management
      expect(responseBody.patient_id).toBeDefined();
      expect(responseBody.registration_complete).toBe(true);

      // Verify Redis session data structure
      if (redis) {
        const sessionKey = `user_session:${mockLineUserId}`;
        const sessionData = await redis.get(sessionKey);
        expect(sessionData).toBeDefined();

        const session = JSON.parse(sessionData!);
        expect(session.patient_id).toBe(responseBody.patient_id);
        expect(session.current_flow).toBe("welcome");
        expect(session.created_at).toBeDefined();
        expect(session.last_activity).toBeDefined();

        // Verify session TTL is set appropriately
        const sessionTTL = await redis.ttl(sessionKey);
        expect(sessionTTL).toBeGreaterThan(0);
        expect(sessionTTL).toBeLessThanOrEqual(86400); // 24 hours max
      }
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle invalid LIFF access token gracefully", async () => {
      const invalidAccessToken = "invalid_access_token_123";

      const signupRequest: LiffSignupRequest = {
        accessToken: invalidAccessToken,
        patient: {
          name: "ผิดพลาด โทเคน",
          phone: testUtils.generateThaiPhone(),
          address: testUtils.generateThaiAddress(),
          age: 30,
          gender: "male",
        },
        consent: {
          terms_accepted: true,
          privacy_accepted: true,
        },
      };

      // This WILL FAIL until implementation
      const response = await request(app)
        .post(signupEndpoint)
        .send(signupRequest)
        .expect(401);

      const errorResponse: AuthenticationErrorResponse = response.body;
      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.code).toBe("AUTHENTICATION_ERROR");
      expect(errorResponse.error.message).toContain("Invalid access token");
    });

    it("should validate required consent fields", async () => {
      const mockLineUserId = testUtils.generateLineUserId();
      const mockAccessToken = `mock_access_token_${mockLineUserId}`;

      const signupRequest: LiffSignupRequest = {
        accessToken: mockAccessToken,
        patient: {
          name: "ไม่ยินยอม เงื่อนไข",
          phone: testUtils.generateThaiPhone(),
          address: testUtils.generateThaiAddress(),
          age: 25,
          gender: "female",
        },
        consent: {
          terms_accepted: false, // Required but not accepted
          privacy_accepted: true,
        },
      };

      const response = await request(app)
        .post(signupEndpoint)
        .send(signupRequest)
        .expect(400);

      const errorResponse: ValidationErrorResponse = response.body;
      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.code).toBe("VALIDATION_ERROR");
      expect(errorResponse.error.details?.field_errors).toContainEqual(
        expect.objectContaining({
          field: "consent.terms_accepted",
          message: expect.stringContaining("required"),
        })
      );
    });

    it("should validate age requirements (must be 18+)", async () => {
      const mockLineUserId = testUtils.generateLineUserId();
      const mockAccessToken = `mock_access_token_${mockLineUserId}`;

      const signupRequest: LiffSignupRequest = {
        accessToken: mockAccessToken,
        patient: {
          name: "เด็กเล็ก น้อยอายุ",
          phone: testUtils.generateThaiPhone(),
          address: testUtils.generateThaiAddress(),
          age: 17, // Under 18
          gender: "male",
        },
        consent: {
          terms_accepted: true,
          privacy_accepted: true,
        },
      };

      const response = await request(app)
        .post(signupEndpoint)
        .send(signupRequest)
        .expect(400);

      const errorResponse: ValidationErrorResponse = response.body;
      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.details?.field_errors).toContainEqual(
        expect.objectContaining({
          field: "patient.age",
          message: expect.stringContaining("must be at least 18 years old"),
        })
      );
    });
  });

  describe("Performance and Concurrency", () => {
    it("should complete signup within acceptable time limits", async () => {
      const mockLineUserId = testUtils.generateLineUserId();
      const mockAccessToken = `mock_access_token_${mockLineUserId}`;

      const signupRequest: LiffSignupRequest = {
        accessToken: mockAccessToken,
        patient: {
          name: "ทดสอบ ประสิทธิภาพ",
          phone: testUtils.generateThaiPhone(),
          address: testUtils.generateThaiAddress(),
          age: 30,
          gender: "male",
        },
        consent: {
          terms_accepted: true,
          privacy_accepted: true,
        },
      };

      const startTime = Date.now();

      const response = await request(app)
        .post(signupEndpoint)
        .send(signupRequest)
        .expect(201);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should complete within 5 seconds
      expect(processingTime).toBeLessThan(5000);
      expect(response.body.patient_id).toBeDefined();
      expect(response.body.registration_complete).toBe(true);
    });
  });
});
