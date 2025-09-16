import crypto from "crypto";
import type { LineReplyBody, LineMessage } from "@/server/types/line";

const LINE_REPLY_URL = "https://api.line.me/v2/bot/message/reply";
const LINE_PUSH_URL = "https://api.line.me/v2/bot/message/push";

export function verifyLineSignature(rawBody: string, signature: string) {
  const secret = process.env.LINE_CHANNEL_SECRET || "";
  if (!secret || !signature) return false;
  const hmac = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  // timing-safe compare
  const a = Buffer.from(hmac);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

function messagingDisabled(): boolean {
  const flag = process.env.LINE_MESSAGING_ENABLED;
  if (typeof flag === "string" && flag.trim().length > 0) {
    return flag.trim().toLowerCase() === "false";
  }
  return false;
}

async function postLineEndpoint(url: string, body: unknown) {
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (messagingDisabled() || !accessToken) {
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "LINE messaging skipped: disabled via LINE_MESSAGING_ENABLED or missing LINE_CHANNEL_ACCESS_TOKEN"
      );
    }
    return;
  }
  const res = await fetch(url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`LINE request failed: ${res.status} ${text}`);
  }
}

export async function replyMessage(replyToken: string, messages: LineMessage[]) {
  const payload: LineReplyBody = { replyToken, messages };
  await postLineEndpoint(LINE_REPLY_URL, payload);
}

export async function pushMessage(to: string, messages: LineMessage[]) {
  const payload = { to, messages };
  await postLineEndpoint(LINE_PUSH_URL, payload);
}
