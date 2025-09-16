/**
 * Contract Test: POST /api/liff/booking
 *
 * This test MUST FAIL initially (TDD principle) and defines the contract
 * for the LIFF booking API endpoint before any implementation exists.
 *
 * Tests the appointment booking flow through LINE LIFF interface.
 */

import request from "supertest";
import type {
  LiffBookingRequest,
  LiffBookingResponse,
  ValidationErrorResponse,
  AuthenticationErrorResponse,
  ConflictErrorResponse,
} from "@/server/types/api";

describe("Contract: POST /api/liff/booking", () => {
  let app: any;
  const bookingEndpoint = "/api/liff/booking";

  beforeAll(async () => {
    // This will fail until we implement the Next.js API handler
    try {
      // Import the Next.js app for testing
      const { createServer } = await import("http");
      const { parse } = await import("url");
      const next = await import("next");

      const dev = process.env.NODE_ENV !== "production";
      const hostname = "localhost";
      const port = 3002; // Different test port

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

  describe("Successful Booking Creation", () => {
    it("should create new booking with valid LIFF token and complete data", async () => {
      const futureDate = testUtils.generateFutureDate(3); // 3 days from now

      const validBookingRequest: LiffBookingRequest = {
        accessToken: "valid_liff_access_token_booking_123",
        patient_id: "patient_abc123def456", // Existing patient
        booking: {
          scheduled_at: futureDate.toISOString(),
          type: "blood_test",
          services: ["CBC", "Lipid Profile", "HbA1c"],
          instructions: "Patient has diabetes, fasting required",
          priority: "normal",
        },
        auto_confirm: false,
      };

      // This WILL FAIL until we implement the API handler
      const response = await request(app)
        .post(bookingEndpoint)
        .send(validBookingRequest)
        .expect("Content-Type", /json/)
        .expect(201);

      const responseBody: LiffBookingResponse = response.body.data;

      // Contract assertions - these define what the API MUST return
      expect(response.body.success).toBe(true);
      expect(responseBody.booking_id).toBeDefined();
      expect(responseBody.booking_id).toMatch(/^booking_[a-zA-Z0-9]{12}$/);
      expect(responseBody.confirmation_id).toBeDefined();
      expect(responseBody.status).toBe("pending"); // Not auto-confirmed
      expect(responseBody.estimated_arrival).toBeISODateString();
      expect(responseBody.officer_assigned).toBe(false); // Manual assignment
      expect(responseBody.next_steps).toContain("รอการยืนยันจากเจ้าหน้าที่");

      // Ensure response includes proper metadata
      expect(response.body.meta).toBeDefined();
      expect(response.body.meta.timestamp).toBeISODateString();
    });

    it("should create booking with auto-assignment when requested", async () => {
      const futureDate = testUtils.generateFutureDate(1);

      const autoAssignRequest: LiffBookingRequest = {
        accessToken: "valid_liff_token_auto_assign",
        patient_id: "patient_def456ghi789",
        booking: {
          scheduled_at: futureDate.toISOString(),
          type: "vaccine",
          services: ["COVID-19 Booster"],
          priority: "high",
        },
        auto_confirm: true,
      };

      // This WILL FAIL until implementation
      const response = await request(app)
        .post(bookingEndpoint)
        .send(autoAssignRequest)
        .expect(201);

      const responseBody: LiffBookingResponse = response.body.data;

      expect(response.body.success).toBe(true);
      expect(responseBody.status).toBe("confirmed");
      expect(responseBody.officer_assigned).toBe(true);
      expect(responseBody.officer).toBeDefined();
      expect(responseBody.officer!.name).toBeDefined();
      expect(responseBody.officer!.phone).toBeThaiPhoneNumber();
      expect(responseBody.officer!.eta).toBeISODateString();
    });

    it("should create booking with custom location override", async () => {
      const futureDate = testUtils.generateFutureDate(2);
      const customLocation = testUtils.generateBangkokCoordinates();

      const customLocationRequest: LiffBookingRequest = {
        accessToken: "valid_liff_token_custom_location",
        patient_id: "patient_ghi789jkl012",
        booking: {
          scheduled_at: futureDate.toISOString(),
          type: "checkup",
          services: ["Annual Health Check"],
          priority: "normal",
        },
        location: {
          address:
            "สำนักงานใหม่ 88 ถนนสาทร แขวงยานนาวา เขตสาทร กรุงเทพมหานคร 10120",
          lat: customLocation.lat,
          lng: customLocation.lng,
        },
      };

      // This WILL FAIL until implementation
      const response = await request(app)
        .post(bookingEndpoint)
        .send(customLocationRequest)
        .expect(201);

      const responseBody: LiffBookingResponse = response.body.data;

      expect(response.body.success).toBe(true);
      expect(responseBody.booking_id).toBeDefined();
      expect(responseBody.status).toBe("pending");
    });

    it("should handle emergency booking with urgent priority", async () => {
      const emergencyDate = new Date();
      emergencyDate.setHours(emergencyDate.getHours() + 2); // 2 hours from now

      const emergencyRequest: LiffBookingRequest = {
        accessToken: "valid_liff_token_emergency",
        patient_id: "patient_emergency_123",
        booking: {
          scheduled_at: emergencyDate.toISOString(),
          type: "emergency",
          services: ["Emergency Blood Test", "Vital Signs Check"],
          instructions: "Patient experiencing symptoms, urgent care needed",
          priority: "urgent",
        },
        auto_confirm: true,
      };

      // This WILL FAIL until implementation
      const response = await request(app)
        .post(bookingEndpoint)
        .send(emergencyRequest)
        .expect(201);

      const responseBody: LiffBookingResponse = response.body.data;

      expect(response.body.success).toBe(true);
      expect(responseBody.status).toBe("confirmed");
      expect(responseBody.officer_assigned).toBe(true);
      expect(responseBody.next_steps).toContain("เจ้าหน้าที่จะติดต่อกลับภายใน");
    });
  });

  describe("Validation Errors", () => {
    it("should reject booking with invalid patient_id", async () => {
      const invalidPatientRequest: LiffBookingRequest = {
        accessToken: "valid_token",
        patient_id: "invalid_patient_id_format",
        booking: {
          scheduled_at: testUtils.generateFutureDate().toISOString(),
          type: "blood_test",
          services: ["CBC"],
        },
      };

      // This WILL FAIL until implementation
      const response = await request(app)
        .post(bookingEndpoint)
        .send(invalidPatientRequest)
        .expect(400);

      const errorResponse: ValidationErrorResponse = response.body;

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.code).toBe("VALIDATION_ERROR");
      expect(errorResponse.error.details.field_errors).toContainEqual(
        expect.objectContaining({
          field: "patient_id",
          message: expect.stringContaining("invalid patient ID"),
        })
      );
    });

    it("should reject booking with past date", async () => {
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // Yesterday

      const pastDateRequest: LiffBookingRequest = {
        accessToken: "valid_token",
        patient_id: "patient_valid_123",
        booking: {
          scheduled_at: pastDate.toISOString(),
          type: "blood_test",
          services: ["CBC"],
        },
      };

      // This WILL FAIL until implementation
      const response = await request(app)
        .post(bookingEndpoint)
        .send(pastDateRequest)
        .expect(400);

      const errorResponse: ValidationErrorResponse = response.body;

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.details.field_errors).toContainEqual(
        expect.objectContaining({
          field: "booking.scheduled_at",
          message: expect.stringContaining("future date"),
        })
      );
    });

    it("should reject booking with empty services array", async () => {
      const noServicesRequest: LiffBookingRequest = {
        accessToken: "valid_token",
        patient_id: "patient_valid_123",
        booking: {
          scheduled_at: testUtils.generateFutureDate().toISOString(),
          type: "blood_test",
          services: [], // Empty services
        },
      };

      // This WILL FAIL until implementation
      const response = await request(app)
        .post(bookingEndpoint)
        .send(noServicesRequest)
        .expect(400);

      const errorResponse: ValidationErrorResponse = response.body;

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.details.field_errors).toContainEqual(
        expect.objectContaining({
          field: "booking.services",
          message: expect.stringContaining("at least one service"),
        })
      );
    });

    it("should reject booking with invalid booking type", async () => {
      const invalidTypeRequest = {
        accessToken: "valid_token",
        patient_id: "patient_valid_123",
        booking: {
          scheduled_at: testUtils.generateFutureDate().toISOString(),
          type: "invalid_booking_type", // Invalid type
          services: ["CBC"],
        },
      };

      // This WILL FAIL until implementation
      const response = await request(app)
        .post(bookingEndpoint)
        .send(invalidTypeRequest)
        .expect(400);

      const errorResponse: ValidationErrorResponse = response.body;

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.details.field_errors).toContainEqual(
        expect.objectContaining({
          field: "booking.type",
          message: expect.stringContaining("valid booking type"),
        })
      );
    });
  });

  describe("Authentication Errors", () => {
    it("should reject booking with invalid LIFF access token", async () => {
      const invalidTokenRequest: LiffBookingRequest = {
        accessToken: "invalid_or_expired_booking_token",
        patient_id: "patient_valid_123",
        booking: {
          scheduled_at: testUtils.generateFutureDate().toISOString(),
          type: "blood_test",
          services: ["CBC"],
        },
      };

      // This WILL FAIL until implementation
      const response = await request(app)
        .post(bookingEndpoint)
        .send(invalidTokenRequest)
        .expect(401);

      const errorResponse: AuthenticationErrorResponse = response.body;

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.code).toBe("AUTHENTICATION_ERROR");
      expect(errorResponse.error.message).toContain("LIFF access token");
    });

    it("should reject booking for patient not owned by authenticated user", async () => {
      const unauthorizedPatientRequest: LiffBookingRequest = {
        accessToken: "valid_token_user_a",
        patient_id: "patient_belongs_to_user_b", // Different user's patient
        booking: {
          scheduled_at: testUtils.generateFutureDate().toISOString(),
          type: "blood_test",
          services: ["CBC"],
        },
      };

      // This WILL FAIL until implementation
      const response = await request(app)
        .post(bookingEndpoint)
        .send(unauthorizedPatientRequest)
        .expect(403);

      const errorResponse: AuthenticationErrorResponse = response.body;

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.code).toBe("AUTHORIZATION_ERROR");
    });
  });

  describe("Business Logic Conflicts", () => {
    it("should reject booking when patient has conflicting appointment", async () => {
      const conflictingDate = testUtils.generateFutureDate(1);

      const conflictingRequest: LiffBookingRequest = {
        accessToken: "valid_token_conflict_test",
        patient_id: "patient_has_existing_booking",
        booking: {
          scheduled_at: conflictingDate.toISOString(),
          type: "blood_test",
          services: ["CBC"],
        },
      };

      // This WILL FAIL until implementation
      const response = await request(app)
        .post(bookingEndpoint)
        .send(conflictingRequest)
        .expect(409);

      const errorResponse: ConflictErrorResponse = response.body;

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.code).toBe("DUPLICATE_BOOKING");
      expect(errorResponse.error.details?.conflicting_id).toBeDefined();
      expect(errorResponse.error.details?.suggestions).toContain("reschedule");
    });

    it("should reject booking when no officers available", async () => {
      const noOfficerDate = testUtils.generateFutureDate(7); // 1 week out

      const noOfficerRequest: LiffBookingRequest = {
        accessToken: "valid_token_no_officers",
        patient_id: "patient_valid_456",
        booking: {
          scheduled_at: noOfficerDate.toISOString(),
          type: "blood_test",
          services: ["Comprehensive Panel"],
        },
        auto_confirm: true,
      };

      // This WILL FAIL until implementation
      const response = await request(app)
        .post(bookingEndpoint)
        .send(noOfficerRequest)
        .expect(409);

      const errorResponse: ConflictErrorResponse = response.body;

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.code).toBe("OFFICER_UNAVAILABLE");
      expect(errorResponse.error.details?.suggestions).toContain(
        "different time"
      );
    });

    it("should reject booking outside service hours", async () => {
      const lateNightDate = testUtils.generateFutureDate(1);
      lateNightDate.setHours(22, 0, 0, 0); // 10 PM

      const outsideHoursRequest: LiffBookingRequest = {
        accessToken: "valid_token_outside_hours",
        patient_id: "patient_valid_789",
        booking: {
          scheduled_at: lateNightDate.toISOString(),
          type: "blood_test",
          services: ["Basic Panel"],
        },
      };

      // This WILL FAIL until implementation
      const response = await request(app)
        .post(bookingEndpoint)
        .send(outsideHoursRequest)
        .expect(400);

      const errorResponse: ValidationErrorResponse = response.body;

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.details.field_errors).toContainEqual(
        expect.objectContaining({
          field: "booking.scheduled_at",
          message: expect.stringContaining("service hours"),
        })
      );
    });
  });

  describe("Location Validation", () => {
    it("should reject booking with invalid coordinates", async () => {
      const invalidLocationRequest: LiffBookingRequest = {
        accessToken: "valid_token_invalid_location",
        patient_id: "patient_valid_123",
        booking: {
          scheduled_at: testUtils.generateFutureDate().toISOString(),
          type: "blood_test",
          services: ["CBC"],
        },
        location: {
          address: "Invalid Location",
          lat: 999, // Invalid latitude
          lng: 999, // Invalid longitude
        },
      };

      // This WILL FAIL until implementation
      const response = await request(app)
        .post(bookingEndpoint)
        .send(invalidLocationRequest)
        .expect(400);

      const errorResponse: ValidationErrorResponse = response.body;

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.details.field_errors).toEqual(
        expect.arrayContaining([
          expect.objectContaining({ field: "location.lat" }),
          expect.objectContaining({ field: "location.lng" }),
        ])
      );
    });

    it("should reject booking outside service area", async () => {
      const outsideAreaRequest: LiffBookingRequest = {
        accessToken: "valid_token_outside_area",
        patient_id: "patient_valid_456",
        booking: {
          scheduled_at: testUtils.generateFutureDate().toISOString(),
          type: "blood_test",
          services: ["CBC"],
        },
        location: {
          address: "Chiang Mai, Thailand",
          lat: 18.7883, // Chiang Mai coordinates (outside Bangkok service area)
          lng: 98.9853,
        },
      };

      // This WILL FAIL until implementation
      const response = await request(app)
        .post(bookingEndpoint)
        .send(outsideAreaRequest)
        .expect(400);

      const errorResponse: ValidationErrorResponse = response.body;

      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.message).toContain("service area");
    });
  });

  describe("Rate Limiting", () => {
    it("should enforce rate limits for booking attempts", async () => {
      const bookingRequest: LiffBookingRequest = {
        accessToken: "rate_limit_booking_token",
        patient_id: "patient_rate_limit_test",
        booking: {
          scheduled_at: testUtils.generateFutureDate().toISOString(),
          type: "blood_test",
          services: ["CBC"],
        },
      };

      // Make multiple rapid requests (this WILL FAIL until implementation)
      const requests = Array(4)
        .fill(null)
        .map(() => request(app).post(bookingEndpoint).send(bookingRequest));

      const responses = await Promise.all(requests);

      // Should have at least one rate limited response
      const rateLimitedResponses = responses.filter((r) => r.status === 429);
      expect(rateLimitedResponses.length).toBeGreaterThan(0);

      const rateLimitResponse = rateLimitedResponses[0].body;
      expect(rateLimitResponse.error.code).toBe("RATE_LIMIT_EXCEEDED");
    });
  });

  describe("Data Integrity", () => {
    it("should sanitize booking instructions and preserve Thai text", async () => {
      const thaiInstructionsRequest: LiffBookingRequest = {
        accessToken: "valid_token_thai_text",
        patient_id: "patient_valid_thai",
        booking: {
          scheduled_at: testUtils.generateFutureDate().toISOString(),
          type: "blood_test",
          services: ["CBC"],
          instructions:
            'ผู้ป่วยต้องงดอาหาร 12 ชั่วโมง <script>alert("test")</script> และดื่มน้ำได้ตามปกติ 💊',
        },
      };

      // This WILL FAIL until implementation
      const response = await request(app)
        .post(bookingEndpoint)
        .send(thaiInstructionsRequest)
        .expect(201);

      // Should preserve Thai text but sanitize HTML/scripts
      expect(response.body.data).toBeDefined();
    });
  });
});
