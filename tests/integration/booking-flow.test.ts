/**
 * Integration Test: Complete Booking Flow
 *
 * This test MUST FAIL initially (TDD principle) and defines the integration
 * behavior for the complete booking flow before any implementation exists.
 *
 * Tests the end-to-end booking process from LIFF authentication through
 * appointment scheduling, confirmation, and LINE notification delivery.
 */

import request from "supertest";
import { getRedisClient } from "@/lib/redis";
import type {
  LiffBookingRequest,
  LiffBookingResponse,
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

  generatePatientId(): string {
    const dateStr = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const randomId = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `PAT_${dateStr}_${randomId}`;
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

  generateBangkokCoordinates(): { lat: number; lng: number } {
    // Bangkok approximate bounds
    const lat = 13.5 + Math.random() * 0.6; // 13.5 to 14.1
    const lng = 100.3 + Math.random() * 0.6; // 100.3 to 100.9
    return {
      lat: Math.round(lat * 10000) / 10000,
      lng: Math.round(lng * 10000) / 10000,
    };
  },

  generateFutureDate(daysFromNow: number = 1): Date {
    const date = new Date();
    date.setDate(date.getDate() + daysFromNow);
    return date;
  },

  generateTimeSlot(): string {
    const hours = [8, 9, 10, 11, 13, 14, 15, 16];
    const hour = hours[Math.floor(Math.random() * hours.length)];
    return `${hour.toString().padStart(2, "0")}:00`;
  },
};

describe("Integration: Complete Booking Flow", () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let app: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let redis: any;
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
      const port = 3006; // Different test port

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

  describe("Successful Booking Flow", () => {
    it("should complete full booking flow for registered patient", async () => {
      const mockLineUserId = testUtils.generateLineUserId();
      const mockPatientId = testUtils.generatePatientId();
      const mockAccessToken = `mock_access_token_${mockLineUserId}`;
      const appointmentDate = testUtils.generateFutureDate(3);
      const timeSlot = testUtils.generateTimeSlot();
      const coordinates = testUtils.generateBangkokCoordinates();

      const bookingRequest: LiffBookingRequest = {
        accessToken: mockAccessToken,
        patient_id: mockPatientId,
        booking: {
          scheduled_at: `${
            appointmentDate.toISOString().split("T")[0]
          }T${timeSlot}:00.000Z`,
          type: "blood_test",
          services: ["basic_health_checkup"],
          instructions:
            "ผู้ป่วยมีประวัติแพ้ยา paracetamol กรุณาแจ้งเจ้าหน้าที่",
          priority: "normal",
        },
        location: {
          address: testUtils.generateThaiAddress(),
          lat: coordinates.lat,
          lng: coordinates.lng,
        },
        auto_confirm: true,
      };

      // This WILL FAIL until we implement the API handler
      const response = await request(app)
        .post(bookingEndpoint)
        .send(bookingRequest)
        .expect(201);

      const responseBody: LiffBookingResponse = response.body;

      // Verify API response structure
      expect(responseBody.booking_id).toBeDefined();
      expect(responseBody.booking_id).toMatch(/^BK_\d{8}_[A-Z0-9]{6}$/);
      expect(responseBody.confirmation_id).toBeDefined();
      expect(responseBody.status).toBe("confirmed");
      expect(responseBody.estimated_arrival).toBeDefined();
      expect(responseBody.officer_assigned).toBe(true);
      expect(responseBody.officer).toBeDefined();
      expect(responseBody.officer?.name).toBeDefined();
      expect(responseBody.officer?.phone).toBeDefined();
      expect(responseBody.next_steps).toContain("await_officer_arrival");

      // Verify Redis session was updated
      if (redis) {
        const sessionKey = `user_session:${mockLineUserId}`;
        const sessionData = await redis.get(sessionKey);
        expect(sessionData).toBeDefined();

        const session = JSON.parse(sessionData!);
        expect(session.current_booking_id).toBe(responseBody.booking_id);
        expect(session.last_activity).toBeDefined();
        expect(session.current_flow).toBe("booking_confirmed");
      }
    });

    it("should handle booking with multiple services", async () => {
      const mockLineUserId = testUtils.generateLineUserId();
      const mockPatientId = testUtils.generatePatientId();
      const mockAccessToken = `mock_access_token_${mockLineUserId}`;
      const appointmentDate = testUtils.generateFutureDate(5);
      const timeSlot = testUtils.generateTimeSlot();
      const coordinates = testUtils.generateBangkokCoordinates();

      const bookingRequest: LiffBookingRequest = {
        accessToken: mockAccessToken,
        patient_id: mockPatientId,
        booking: {
          scheduled_at: `${
            appointmentDate.toISOString().split("T")[0]
          }T${timeSlot}:00.000Z`,
          type: "checkup",
          services: [
            "comprehensive_health_checkup",
            "diabetes_screening",
            "cholesterol_check",
          ],
          instructions: "งดอาหาร 12 ชั่วโมงก่อนตรวจ",
          priority: "normal",
        },
        location: {
          address: testUtils.generateThaiAddress(),
          lat: coordinates.lat,
          lng: coordinates.lng,
        },
        auto_confirm: true,
      };

      // This WILL FAIL until implementation
      const response = await request(app)
        .post(bookingEndpoint)
        .send(bookingRequest)
        .expect(201);

      const responseBody: LiffBookingResponse = response.body;

      // Verify comprehensive booking response
      expect(responseBody.booking_id).toBeDefined();
      expect(responseBody.status).toBe("confirmed");
      expect(responseBody.officer_assigned).toBe(true);
      expect(responseBody.estimated_arrival).toBeDefined();
      expect(responseBody.next_steps).toBeInstanceOf(Array);
      expect(responseBody.next_steps.length).toBeGreaterThan(0);
    });

    it("should handle urgent appointment booking", async () => {
      const mockLineUserId = testUtils.generateLineUserId();
      const mockPatientId = testUtils.generatePatientId();
      const mockAccessToken = `mock_access_token_${mockLineUserId}`;
      const appointmentDate = testUtils.generateFutureDate(1); // Tomorrow
      const timeSlot = "08:00"; // Early slot
      const coordinates = testUtils.generateBangkokCoordinates();

      const bookingRequest: LiffBookingRequest = {
        accessToken: mockAccessToken,
        patient_id: mockPatientId,
        booking: {
          scheduled_at: `${
            appointmentDate.toISOString().split("T")[0]
          }T${timeSlot}:00.000Z`,
          type: "emergency",
          services: ["urgent_health_checkup"],
          instructions: "ผู้ป่วยไม่สามารถเดินทางได้",
          priority: "urgent",
        },
        location: {
          address: testUtils.generateThaiAddress(),
          lat: coordinates.lat,
          lng: coordinates.lng,
        },
        auto_confirm: true,
      };

      // This WILL FAIL until implementation
      const response = await request(app)
        .post(bookingEndpoint)
        .send(bookingRequest)
        .expect(201);

      const responseBody: LiffBookingResponse = response.body;

      // Verify urgent booking handling
      expect(responseBody.booking_id).toBeDefined();
      expect(responseBody.status).toBe("confirmed");
      expect(responseBody.officer_assigned).toBe(true);
      expect(responseBody.officer?.eta).toBeDefined();

      // Verify faster response time for urgent bookings
      const arrivalTime = new Date(responseBody.estimated_arrival);
      const bookingTime = new Date();
      const timeDiff = arrivalTime.getTime() - bookingTime.getTime();
      expect(timeDiff).toBeLessThan(4 * 60 * 60 * 1000); // Within 4 hours
    });
  });

  describe("Booking Validation and Constraints", () => {
    it("should validate appointment date is not in the past", async () => {
      const mockLineUserId = testUtils.generateLineUserId();
      const mockPatientId = testUtils.generatePatientId();
      const mockAccessToken = `mock_access_token_${mockLineUserId}`;
      const pastDate = new Date();
      pastDate.setDate(pastDate.getDate() - 1); // Yesterday

      const bookingRequest: LiffBookingRequest = {
        accessToken: mockAccessToken,
        patient_id: mockPatientId,
        booking: {
          scheduled_at: `${pastDate.toISOString().split("T")[0]}T10:00:00.000Z`,
          type: "blood_test",
          services: ["basic_health_checkup"],
        },
        location: {
          address: testUtils.generateThaiAddress(),
          lat: 13.7563,
          lng: 100.5018,
        },
      };

      const response = await request(app)
        .post(bookingEndpoint)
        .send(bookingRequest)
        .expect(400);

      const errorResponse: ValidationErrorResponse = response.body;
      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.code).toBe("VALIDATION_ERROR");
      expect(errorResponse.error.details?.field_errors).toContainEqual(
        expect.objectContaining({
          field: "booking.scheduled_at",
          message: expect.stringContaining("cannot be in the past"),
        })
      );
    });

    it("should validate time slot format", async () => {
      const mockLineUserId = testUtils.generateLineUserId();
      const mockPatientId = testUtils.generatePatientId();
      const mockAccessToken = `mock_access_token_${mockLineUserId}`;
      const appointmentDate = testUtils.generateFutureDate(2);

      const bookingRequest: LiffBookingRequest = {
        accessToken: mockAccessToken,
        patient_id: mockPatientId,
        booking: {
          scheduled_at: `${
            appointmentDate.toISOString().split("T")[0]
          }T25:00:00.000Z`, // Invalid time
          type: "blood_test",
          services: ["basic_health_checkup"],
        },
        location: {
          address: testUtils.generateThaiAddress(),
          lat: 13.7563,
          lng: 100.5018,
        },
      };

      const response = await request(app)
        .post(bookingEndpoint)
        .send(bookingRequest)
        .expect(400);

      const errorResponse: ValidationErrorResponse = response.body;
      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.details?.field_errors).toContainEqual(
        expect.objectContaining({
          field: "booking.scheduled_at",
          message: expect.stringContaining("invalid time format"),
        })
      );
    });

    it("should validate service area coverage", async () => {
      const mockLineUserId = testUtils.generateLineUserId();
      const mockPatientId = testUtils.generatePatientId();
      const mockAccessToken = `mock_access_token_${mockLineUserId}`;
      const appointmentDate = testUtils.generateFutureDate(3);

      // Coordinates outside Bangkok service area
      const outsideBangkok = { lat: 12.0, lng: 99.0 }; // Far from Bangkok

      const bookingRequest: LiffBookingRequest = {
        accessToken: mockAccessToken,
        patient_id: mockPatientId,
        booking: {
          scheduled_at: `${
            appointmentDate.toISOString().split("T")[0]
          }T10:00:00.000Z`,
          type: "blood_test",
          services: ["basic_health_checkup"],
        },
        location: {
          address: "พัทยา ชลบุรี", // Outside service area
          lat: outsideBangkok.lat,
          lng: outsideBangkok.lng,
        },
      };

      const response = await request(app)
        .post(bookingEndpoint)
        .send(bookingRequest)
        .expect(400);

      const errorResponse: ValidationErrorResponse = response.body;
      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.code).toBe("VALIDATION_ERROR");
      expect(errorResponse.error.message).toContain("outside service area");
    });
  });

  describe("Error Handling and Edge Cases", () => {
    it("should handle invalid LIFF access token", async () => {
      const invalidAccessToken = "invalid_access_token_123";
      const mockPatientId = testUtils.generatePatientId();

      const bookingRequest: LiffBookingRequest = {
        accessToken: invalidAccessToken,
        patient_id: mockPatientId,
        booking: {
          scheduled_at: testUtils.generateFutureDate(2).toISOString(),
          type: "blood_test",
          services: ["basic_health_checkup"],
        },
        location: {
          address: testUtils.generateThaiAddress(),
          lat: 13.7563,
          lng: 100.5018,
        },
      };

      const response = await request(app)
        .post(bookingEndpoint)
        .send(bookingRequest)
        .expect(401);

      const errorResponse: AuthenticationErrorResponse = response.body;
      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.code).toBe("AUTHENTICATION_ERROR");
      expect(errorResponse.error.message).toContain("Invalid access token");
    });

    it("should handle non-existent patient ID", async () => {
      const mockLineUserId = testUtils.generateLineUserId();
      const mockAccessToken = `mock_access_token_${mockLineUserId}`;
      const nonExistentPatientId = "PAT_20240101_NOTFOUND";

      const bookingRequest: LiffBookingRequest = {
        accessToken: mockAccessToken,
        patient_id: nonExistentPatientId,
        booking: {
          scheduled_at: testUtils.generateFutureDate(2).toISOString(),
          type: "blood_test",
          services: ["basic_health_checkup"],
        },
        location: {
          address: testUtils.generateThaiAddress(),
          lat: 13.7563,
          lng: 100.5018,
        },
      };

      const response = await request(app)
        .post(bookingEndpoint)
        .send(bookingRequest)
        .expect(404);

      const errorResponse = response.body;
      expect(errorResponse.success).toBe(false);
      expect(errorResponse.error.code).toBe("PATIENT_NOT_FOUND");
      expect(errorResponse.error.message).toContain("Patient not found");
    });
  });

  describe("Performance and Concurrency", () => {
    it("should complete booking within acceptable time limits", async () => {
      const mockLineUserId = testUtils.generateLineUserId();
      const mockPatientId = testUtils.generatePatientId();
      const mockAccessToken = `mock_access_token_${mockLineUserId}`;

      const bookingRequest: LiffBookingRequest = {
        accessToken: mockAccessToken,
        patient_id: mockPatientId,
        booking: {
          scheduled_at: testUtils.generateFutureDate(3).toISOString(),
          type: "blood_test",
          services: ["basic_health_checkup"],
        },
        location: {
          address: testUtils.generateThaiAddress(),
          lat: 13.7563,
          lng: 100.5018,
        },
      };

      const startTime = Date.now();

      const response = await request(app)
        .post(bookingEndpoint)
        .send(bookingRequest)
        .expect(201);

      const endTime = Date.now();
      const processingTime = endTime - startTime;

      // Should complete within 10 seconds (includes officer assignment, geocoding, scheduling)
      expect(processingTime).toBeLessThan(10000);
      expect(response.body.booking_id).toBeDefined();
      expect(response.body.status).toBe("confirmed");
    });
  });
});
