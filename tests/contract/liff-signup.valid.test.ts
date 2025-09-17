/**
 * Happy path: LIFF signup accepts valid payload
 */
import { NextRequest } from "next/server";

jest.mock("@/server/lib/liffAuth", () => ({
  verifyLiffIdToken: jest.fn().mockResolvedValue({ sub: "U123" }),
}));

jest.mock("@/server/repo/users", () => ({
  saveUser: jest.fn().mockResolvedValue(undefined),
  findUserByLineId: jest.fn().mockResolvedValue(null),
}));

jest.mock("@/lib/redis", () => ({
  setUserSession: jest.fn().mockResolvedValue(undefined),
}));

jest.mock("@/lib/sentry", () => ({
  reportHealthcareError: jest.fn(),
}));

describe("Contract: LIFF signup (valid)", () => {
  test("returns 201 for new user", async () => {
    const { POST } = await import("@/app/api/liff/signup/route");
    const body = {
      accessToken: "token",
      patient: {
        name: "Jane Doe",
        phone: "0912345678",
        address: "123 ซอยสุขภาพ เขตดี กรุงเทพฯ",
        age: 30,
      },
      consent: { terms_accepted: true, privacy_accepted: true },
    };
    const req = new NextRequest("http://localhost/api/liff/signup", {
      method: "POST",
      body: JSON.stringify(body),
    } as any);
    const res = await POST(req as any);
    expect([200, 201]).toContain(res.status);
  });
});

