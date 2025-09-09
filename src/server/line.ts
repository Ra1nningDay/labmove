import crypto from "crypto";
import type { LineReplyBody, LineMessageText } from "@/server/types/line";

const LINE_REPLY_URL = "https://api.line.me/v2/bot/message/reply";

export function verifyLineSignature(rawBody: string, signature: string) {
  const secret = process.env.LINE_CHANNEL_SECRET || "";
  if (!secret || !signature) return false;
  const hmac = crypto.createHmac("sha256", secret).update(rawBody).digest("base64");
  // timing-safe compare
  const a = Buffer.from(hmac);
  const b = Buffer.from(signature);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

export async function replyMessage(replyToken: string, messages: LineMessageText[]) {
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN;
  if (!accessToken) throw new Error("Missing LINE_CHANNEL_ACCESS_TOKEN");
  const body: LineReplyBody = { replyToken, messages };
  const res = await fetch(LINE_REPLY_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${accessToken}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(body),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`LINE reply failed: ${res.status} ${text}`);
  }
}

