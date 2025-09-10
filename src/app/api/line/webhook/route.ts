import { NextRequest, NextResponse } from "next/server";
import { verifyLineSignature, replyMessage } from "@/server/line";
import {
  upsertUserProgress,
  getUserProgress,
  clearUserProgress,
} from "@/server/store/session";
import { handleSignupStep } from "@/server/agent/signupFlow";
import type { LineWebhookEvent } from "@/server/types/line";
import { saveUser } from "@/server/repo/users";
import { upsertSignupSession } from "@/server/repo/sessions";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  const raw = await req.text();
  // console.log("LINE Webhook received:", raw);
  const ok = verifyLineSignature(
    raw,
    req.headers.get("x-line-signature") || ""
  );
  if (!ok) return new NextResponse("Invalid signature", { status: 401 });

  let body: { events?: LineWebhookEvent[] };
  try {
    body = JSON.parse(raw);
  } catch {
    return new NextResponse("Bad JSON", { status: 400 });
  }

  const events = body.events || [];
  for (const ev of events) {
    if (ev.type !== "message" || ev.message.type !== "text") continue;
    const userId = ev.source.userId;
    const replyToken = ev.replyToken;
    if (!userId || !replyToken) continue;

    // Load session progress
    const progress = getUserProgress(userId);
    const { nextProgress, responseText, completedUser } = handleSignupStep(
      progress,
      ev.message.text
    );
    // Persist session state
    upsertUserProgress(userId, nextProgress);

    // Persist step progress to repository (Sheets/CSV)
    try {
      await upsertSignupSession(userId, nextProgress);
    } catch (e) {
      console.error("upsertSignupSession failed", e);
    }

    // Save to repository when completed
    if (completedUser) {
      await saveUser({
        lineUserId: userId,
        name: completedUser.name,
        phone: completedUser.phone,
        hn: completedUser.hn,
        hospital: completedUser.hospital,
        referral: completedUser.referral,
        consent: completedUser.consent,
      });
      clearUserProgress(userId);
      // Mark session completed
      try {
        await upsertSignupSession(userId, { ...nextProgress, step: "done" });
      } catch {}
    }

    // Reply message to LINE
    await replyMessage(replyToken, [{ type: "text", text: responseText }]);
  }

  return NextResponse.json({ ok: true });
}
