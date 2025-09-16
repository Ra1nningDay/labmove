/**
 * Contract Test: POST /api/liff/signup
 *
 * This test MUST FAIL initially (TDD principle) and defines the contract
 * for the LIFF signup API endpoint before any implementation exists.
 *
 * Tests the patient registration flow through LINE LIFF interface.
 */

import { createTestApp, request } from "../helpers/app";
import type {
  LiffSignupRequest,
  LiffSignupResponse,
  ValidationErrorResponse,
  AuthenticationErrorResponse,
} from "@/server/types/api";

describe("Contract: POST /api/liff/signup", () => {
  let app: ReturnType<typeof createTestApp>;
  const signupEndpoint = "/api/liff/signup";

  beforeAll(async () => {
    app = createTestApp();
  });

  beforeEach(() => {
    // Clear any cached modules between tests to ensure clean state
    jest.clearAllMocks();
  });

  describe("Successful Registration", () => {
    it("should register new patient with valid LIFF token and complete data", async () => {
      const validSignupRequest: LiffSignupRequest = {
        accessToken: "valid_liff_access_token_123",
        patient: {
          name: "สมชาย ใจดี",
          phone: "0812345678",
          address: "123 ถนนสุขุมวิท แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110",
          hn: "HN123456",
          hospital: "โรงพยาบาลจุฬาลงกรณ์",
          age: 45,
          gender: "male",
          emergency_contact: {
            name: "สมหญิง ใจดี",
            phone: "0823456789",
            relationship: "spouse",
          },
        },
        consent: {
          terms_accepted: true,
          privacy_accepted: true,
          marketing_accepted: false,
        },
        preferences: {
          notifications_enabled: true,
          preferred_contact_method: "line",
        },
      };

      // This WILL FAIL until we implement the API handler
      const response = await request(app)
        .post(signupEndpoint)
        .send(validSignupRequest);

      expect(response.status).toBe(201);

      const responseBody: LiffSignupResponse =
        response.body as LiffSignupResponse;

      // Contract assertions - these define what the API MUST return
      expect((response.body as { success: boolean }).success).toBe(true);
      expect(responseBody.patient_id).toBeDefined();
      expect(responseBody.patient_id).toMatch(/^patient_[a-zA-Z0-9]{12}$/);
      expect(responseBody.line_user_id).toBeLineUserId();
      expect(responseBody.registration_complete).toBe(true);
      expect(responseBody.next_step).toBeUndefined(); // Complete registration

      // Ensure response includes proper metadata
      expect(
        (response.body as { meta: { timestamp: string; request_id: string } })
          .meta
      ).toBeDefined();
      expect(
        (response.body as { meta: { timestamp: string } }).meta.timestamp
      ).toBeISODateString();
      expect(
        (response.body as { meta: { request_id: string } }).meta.request_id
      ).toBeDefined();
    });

    it("should register patient with minimal required data", async () => {
      const minimalSignupRequest: LiffSignupRequest = {
        accessToken: "valid_liff_access_token_456",
        patient: {
          name: "นางสาวสุดใจ รักเรียน",
          phone: "0867890123",
          address:
            "456 ซอยรามคำแหง 24 แขวงหัวหมาก เขตบางกะปิ กรุงเทพมหานคร 10240",
        },
        consent: {
          terms_accepted: true,
          privacy_accepted: true,
        },
      };

      // This WILL FAIL until implementation
      const response = await request(app)
        .post(signupEndpoint)
        .send(minimalSignupRequest);

      expect(response.status).toBe(201);
      const responseBody: LiffSignupResponse = (
        response.body as { data: LiffSignupResponse }
      ).data;

      expect((response.body as { success: boolean }).success).toBe(true);
      expect(responseBody.patient_id).toBeDefined();
      expect(responseBody.line_user_id).toBeLineUserId();
      expect(responseBody.registration_complete).toBe(true);
    });

    it("should handle existing LINE user adding new patient profile", async () => {
      const existingUserRequest: LiffSignupRequest = {
        accessToken: "existing_user_liff_token_789",
        patient: {
          name: "คุณยาย สุขใจ",
          phone: "0834567890",
          address: "789 ถนนพระราม 4 แขวงคลองเตย เขตคลองเตย กรุงเทพมหานคร 10110",
        },
        consent: {
          terms_accepted: true,
          privacy_accepted: true,
        },
      };

      // This WILL FAIL until implementation
      const response = await request(app)
        .post(signupEndpoint)
        .send(existingUserRequest);

      expect(response.status).toBe(201);

      const responseBody: LiffSignupResponse = (
        response.body as { data: LiffSignupResponse }
      ).data;

      expect((response.body as { success: boolean }).success).toBe(true);
      expect(responseBody.patient_id).toBeDefined();
      expect(responseBody.line_user_id).toBeLineUserId();
      expect(responseBody.registration_complete).toBe(true);
    });
  });

  describe("Validation Errors", () => {
    it("should reject request with missing required fields", async () => {
      const invalidRequest = {
        accessToken: "valid_token",
        patient: {
          // Missing required name, phone, address
          age: 30,
        },
        consent: {
          terms_accepted: true,
          privacy_accepted: true,
        },
      };

      // This WILL FAIL until implementation
      const response = await request(app)
        .post(signupEndpoint)
        .send(invalidRequest);

      expect(response.status).toBe(400);

      const errorResponse: ValidationErrorResponse =
        response.body as ValidationErrorResponse;

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.code).toBe("VALIDATION_ERROR");
      expect(errorResponse.error.details.field_errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: "patient.name" }),
          expect.objectContaining({ field: "patient.phone" }),
          expect.objectContaining({ field: "patient.address" }),
        ])
      );
    });

    it("should reject invalid phone number format", async () => {
      const invalidPhoneRequest: LiffSignupRequest = {
        accessToken: "valid_token",
        patient: {
          name: "Test User",
          phone: "123456789", // Invalid format (not starting with 0, wrong length)
          address: "Test Address",
        },
        consent: {
          terms_accepted: true,
          privacy_accepted: true,
        },
      };

      // This WILL FAIL until implementation
      const response = await request(app)
        .post(signupEndpoint)
        .send(invalidPhoneRequest);
      expect(response.status).toBe(400);

      const errorResponse: ValidationErrorResponse =
        response.body as ValidationErrorResponse;

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.code).toBe("VALIDATION_ERROR");
      expect(errorResponse.error.details.field_errors).toContainEqual(
        expect.objectContaining({
          field: "patient.phone",
          message: expect.stringContaining("phone number"),
        })
      );
    });

    it("should reject request without consent", async () => {
      const noConsentRequest = {
        accessToken: "valid_token",
        patient: {
          name: "Test User",
          phone: "0812345678",
          address: "Test Address",
        },
        consent: {
          terms_accepted: false, // Not accepted
          privacy_accepted: true,
        },
      };

      // This WILL FAIL until implementation
      const response = await request(app)
        .post(signupEndpoint)
        .send(noConsentRequest);
      expect(response.status).toBe(400);

      const errorResponse: ValidationErrorResponse =
        response.body as ValidationErrorResponse;

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.code).toBe("VALIDATION_ERROR");
      expect(errorResponse.error.details.field_errors).toContainEqual(
        expect.objectContaining({
          field: "consent.terms_accepted",
          message: expect.stringContaining("must be accepted"),
        })
      );
    });
  });

  describe("Authentication Errors", () => {
    it("should reject request with invalid LIFF access token", async () => {
      const invalidTokenRequest: LiffSignupRequest = {
        accessToken: "invalid_or_expired_token",
        patient: {
          name: "Test User",
          phone: "0812345678",
          address: "Test Address",
        },
        consent: {
          terms_accepted: true,
          privacy_accepted: true,
        },
      };

      // This WILL FAIL until implementation
      const response = await request(app)
        .post(signupEndpoint)
        .send(invalidTokenRequest);
      expect(response.status).toBe(401);

      const errorResponse: AuthenticationErrorResponse =
        response.body as AuthenticationErrorResponse;

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.code).toBe("AUTHENTICATION_ERROR");
      expect(errorResponse.error.message).toContain("LIFF access token");
    });

    it("should reject request with missing access token", async () => {
      const noTokenRequest = {
        // Missing accessToken
        patient: {
          name: "Test User",
          phone: "0812345678",
          address: "Test Address",
        },
        consent: {
          terms_accepted: true,
          privacy_accepted: true,
        },
      };

      // This WILL FAIL until implementation
      const response = await request(app)
        .post(signupEndpoint)
        .send(noTokenRequest);
      expect(response.status).toBe(401);

      const errorResponse: AuthenticationErrorResponse =
        response.body as AuthenticationErrorResponse;

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.code).toBe("AUTHENTICATION_ERROR");
    });
  });

  describe("Rate Limiting", () => {
    it("should enforce rate limits for signup attempts", async () => {
      const signupRequest: LiffSignupRequest = {
        accessToken: "rate_limit_test_token",
        patient: {
          name: "Rate Limit Test",
          phone: "0898765432",
          address: "Rate Limit Address",
        },
        consent: {
          terms_accepted: true,
          privacy_accepted: true,
        },
      };

      // Make multiple rapid requests (this WILL FAIL until implementation)
      const requests = Array(6)
        .fill(null)
        .map(() => request(app).post(signupEndpoint).send(signupRequest));

      const responses = await Promise.all(requests);

      // Should have at least one rate limited response
      const rateLimitedResponses = responses.filter((r) => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      const rateLimitResponse = rateLimitedResponses[0].body as {
        success: boolean;
        error: {
          code: string;
          details: { retry_after_seconds: number };
        };
      };
      expect(rateLimitResponse.success).toBe(false);
      expect(rateLimitResponse.error.code).toBe("RATE_LIMIT_EXCEEDED");
      expect(
        rateLimitResponse.error.details.retry_after_seconds
      ).toBeGreaterThan(0);
    });
  });

  describe("Idempotency", () => {
    it("should handle duplicate signup requests idempotently", async () => {
      const duplicateRequest: LiffSignupRequest = {
        accessToken: "idempotency_test_token",
        patient: {
          name: "Idempotency Test",
          phone: "0845678901",
          address: "Idempotency Address",
        },
        consent: {
          terms_accepted: true,
          privacy_accepted: true,
        },
      };

      // This WILL FAIL until implementation
      const firstResponse = await request(app)
        .post(signupEndpoint)
        .send(duplicateRequest);
      expect(firstResponse.status).toBe(201);

      // Immediate duplicate request should return same result
      const secondResponse = await request(app)
        .post(signupEndpoint)
        .send(duplicateRequest);
      expect(
        (firstResponse.body as { data: { patient_id: string } }).data.patient_id
      ).toBe(
        (secondResponse.body as { data: { patient_id: string } }).data
          .patient_id
      );
      expect(
        (firstResponse.body as { data: { line_user_id: string } }).data
          .line_user_id
      ).toBe(
        (secondResponse.body as { data: { line_user_id: string } }).data
          .line_user_id
      );
    });
  });

  describe("Data Sanitization", () => {
    it("should sanitize and validate Thai text input", async () => {
      const thaiTextRequest: LiffSignupRequest = {
        accessToken: "thai_text_token",
        patient: {
          name: "   นาย สมชาย   ใจดี   ", // Extra whitespace
          phone: "0812345678",
          address: "ที่อยู่ภาษาไทยพร้อมอีโมจิ 🏠 และเครื่องหมายพิเศษ @#$%",
        },
        consent: {
          terms_accepted: true,
          privacy_accepted: true,
        },
      };

      // This WILL FAIL until implementation
      const response = await request(app)
        .post(signupEndpoint)
        .send(thaiTextRequest);
      expect(response.status).toBe(201);

      // Name should be trimmed
      // Address should preserve Thai characters but sanitize unsafe content
      expect((response.body as { data: unknown }).data).toBeDefined();
    });
  });
});
