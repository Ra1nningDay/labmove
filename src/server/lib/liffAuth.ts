// Server-side LIFF ID token verification (LINE Login OpenID Connect)
// Uses LINE verify endpoint to validate ID token against channel ID.

export type LiffTokenInfo = {
  sub: string; // LINE user ID (subject)
  name?: string;
  picture?: string;
  email?: string;
  exp?: number;
  iss?: string;
  aud?: string | string[];
};

type LineVerifyResponse = {
  sub: string;
  name?: string;
  picture?: string;
  email?: string;
  exp?: number;
  iss?: string;
  aud?: string | string[];
};

export async function verifyLiffIdToken(
  idToken: string
): Promise<LiffTokenInfo> {
  const clientId = process.env.LINE_LOGIN_CHANNEL_ID;
  if (!clientId) throw new Error("Missing LINE_LOGIN_CHANNEL_ID env");
  if (!idToken) throw new Error("Missing ID token");

  const body = new URLSearchParams({ id_token: idToken, client_id: clientId });
  const res = await fetch("https://api.line.me/oauth2/v2.1/verify", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body,
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`LINE verify failed: ${res.status} ${text}`);
  }
  const data = (await res.json()) as LineVerifyResponse;
  if (!data || !data.sub) throw new Error("Invalid verify response");
  return {
    sub: String(data.sub),
    name: data.name ? String(data.name) : undefined,
    picture: data.picture ? String(data.picture) : undefined,
    email: data.email ? String(data.email) : undefined,
    exp: typeof data.exp === "number" ? data.exp : undefined,
    iss: data.iss ? String(data.iss) : undefined,
    aud: data.aud,
  };
}

export function getBearerToken(authHeader: string | null | undefined): string {
  if (!authHeader) return "";
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  return m ? m[1] : "";
}

export function originAllowed(req: {
  headers: { get(name: string): string | null };
  nextUrl?: { origin: string };
}) {
  const origin = req.headers.get("origin");
  if (!origin) return true; // Some clients may omit; allow in MVP
  const self = req.nextUrl?.origin;
  if (self && origin === self) return true;
  const allowed = process.env.PUBLIC_BASE_URL;
  if (allowed && origin === allowed) return true;
  return false;
}
