import { verifyLiffIdToken } from "@/server/lib/liffAuth";

const originalFetch = global.fetch;
const ORIGINAL_CHANNEL_ID = process.env.LINE_LOGIN_CHANNEL_ID;

describe("Integration: LIFF token verification", () => {
  beforeEach(() => {
    process.env.LINE_LOGIN_CHANNEL_ID = "test_channel";
    global.fetch = jest.fn();
  });

  afterEach(() => {
    if (ORIGINAL_CHANNEL_ID === undefined) {
      delete process.env.LINE_LOGIN_CHANNEL_ID;
    } else {
      process.env.LINE_LOGIN_CHANNEL_ID = ORIGINAL_CHANNEL_ID;
    }
    global.fetch = originalFetch;
    jest.resetAllMocks();
  });

  it("should return token info when LINE verify succeeds", async () => {
    const mockResponse = {
      ok: true,
      json: async () => ({
        sub: "U1234567890",
        name: "Test User",
        email: "test@example.com",
        aud: "test_channel",
      }),
    } as Response;
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    const result = await verifyLiffIdToken("token-123");

    expect(global.fetch).toHaveBeenCalledWith(
      "https://api.line.me/oauth2/v2.1/verify",
      expect.objectContaining({
        method: "POST",
      })
    );
    expect(result.sub).toBe("U1234567890");
    expect(result.name).toBe("Test User");
    expect(result.email).toBe("test@example.com");
    expect(result.aud).toBe("test_channel");
  });

  it("should throw when verify endpoint rejects", async () => {
    const mockResponse = {
      ok: false,
      status: 400,
      text: async () => "invalid token",
    } as Response;
    (global.fetch as jest.Mock).mockResolvedValue(mockResponse);

    await expect(verifyLiffIdToken("bad-token")).rejects.toThrow(
      "LINE verify failed"
    );
  });

  it("should throw when LINE_LOGIN_CHANNEL_ID is missing", async () => {
    delete process.env.LINE_LOGIN_CHANNEL_ID;
    await expect(verifyLiffIdToken("token")).rejects.toThrow(
      "Missing LINE_LOGIN_CHANNEL_ID env"
    );
  });
});
