/**
 * Minimal contract tests to ensure Zod schema wiring returns 400 on bad payloads
 */
import request from "supertest";
import { createServer } from "http";
import { NextRequest } from "next/server";

// Note: In this harness, we assume Next.js API routes are exported and testable via supertest

describe("Validation: LIFF endpoints", () => {
  test("signup: returns 400 on invalid payload", async () => {
    const { POST } = await import("@/app/api/liff/signup/route");
    const req = new NextRequest("http://localhost/api/liff/signup", {
      method: "POST",
      body: JSON.stringify({ bad: true }),
    } as any);
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });

  test("booking: returns 400 on invalid payload", async () => {
    const { POST } = await import("@/app/api/liff/booking/route");
    const req = new NextRequest("http://localhost/api/liff/booking", {
      method: "POST",
      body: JSON.stringify({}),
    } as any);
    const res = await POST(req as any);
    expect(res.status).toBe(400);
  });
});

