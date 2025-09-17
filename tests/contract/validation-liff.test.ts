/**
 * Minimal contract tests to ensure Zod schema wiring returns 400 on bad payloads
 */
import { NextRequest } from "next/server";

// Note: In this harness, we assume Next.js API routes are exported and testable via supertest

describe("Validation: LIFF endpoints", () => {
  test("signup: returns 400 on invalid payload", async () => {
    const { POST } = await import("@/app/api/liff/signup/route");
    const req = {
      json: async () => ({ bad: true }),
      headers: new Headers(),
      method: "POST",
    } as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });

  test("booking: returns 400 on invalid payload", async () => {
    const { POST } = await import("@/app/api/liff/booking/route");
    const req = {
      json: async () => ({}),
      headers: new Headers(),
      method: "POST",
    } as unknown as NextRequest;
    const res = await POST(req);
    expect(res.status).toBe(400);
  });
});

