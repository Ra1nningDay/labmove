import { NextRequest, NextResponse } from "next/server";
import { verifyLineSignature, replyMessage } from "@/server/line";
import { getUserMeta, upsertUserMeta } from "@/server/store/session";
import { handleChat } from "@/server/agent/router";
import type { LineWebhookEvent } from "@/server/types/line";
import { quickReplyMenu, welcomeFlex, consentConfirm } from "@/server/lineMessages";
import { handleLocation, forceBookingStep } from "@/server/agent/router";
// Side effects (saving users/bookings, sessions) are handled inside router

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
    const userId = (ev as any).source?.userId;
    const replyToken = (ev as any).replyToken;
    if (!userId || !replyToken) continue;

    if (ev.type === "follow") {
      await replyMessage(replyToken, [
        welcomeFlex(),
        { type: "text", text: "ยินดีต้อนรับ พิมพ์ 'สมัคร' เพื่อเริ่ม หรือใช้เมนูลัดด้านล่าง", quickReply: quickReplyMenu() },
      ]);
      continue;
    }

    if (ev.type === "postback") {
      const dataStr = ev.postback.data || "";
      let payload: any = {};
      try { payload = JSON.parse(dataStr); } catch {
        dataStr.split("&").forEach((pair) => {
          const [k, v] = pair.split("=");
          if (k) (payload as any)[decodeURIComponent(k)] = decodeURIComponent(v || "");
        });
      }

      if (payload.mode === "signup_start") {
        await handleChat(userId, "สมัคร");
        await replyMessage(replyToken, [
          consentConfirm(),
          { type: "text", text: "โปรดยืนยันการยินยอมเพื่อดำเนินการต่อ", quickReply: quickReplyMenu() },
        ]);
        continue;
      }
      if (payload.mode === "booking_start") {
        const messages = await handleChat(userId, "จองนัด");
        if (messages.length === 0) messages.push({ type: "text", text: "เริ่มจองนัด", quickReply: quickReplyMenu() });
        else if (messages[messages.length - 1].type === "text") (messages[messages.length - 1] as any).quickReply = quickReplyMenu();
        else messages.push({ type: "text", text: "เลือกตัวเลือกถัดไปจากเมนูลัด", quickReply: quickReplyMenu() });
        await replyMessage(replyToken, messages);
        continue;
      }
      if (payload.action === "consent_yes") {
        const messages = await handleChat(userId, "ยินยอม");
        if (messages.length === 0) messages.push({ type: "text", text: "ดำเนินการต่อ", quickReply: quickReplyMenu() });
        else if (messages[messages.length - 1].type === "text") (messages[messages.length - 1] as any).quickReply = quickReplyMenu();
        else messages.push({ type: "text", text: "ดำเนินการต่อ", quickReply: quickReplyMenu() });
        await replyMessage(replyToken, messages);
        continue;
      }
      if (payload.action === "consent_no") {
        const messages = await handleChat(userId, "ไม่ยินยอม");
        if (messages.length === 0) messages.push({ type: "text", text: "ยกเลิกการสมัครแล้ว", quickReply: quickReplyMenu() });
        else if (messages[messages.length - 1].type === "text") (messages[messages.length - 1] as any).quickReply = quickReplyMenu();
        else messages.push({ type: "text", text: "ยกเลิกการสมัครแล้ว", quickReply: quickReplyMenu() });
        await replyMessage(replyToken, messages);
        continue;
      }

      if (payload.action === "signup_confirm") {
        const messages = await handleChat(userId, "ยืนยัน");
        if (messages.length === 0) messages.push({ type: "text", text: "บันทึกข้อมูลแล้ว", quickReply: quickReplyMenu() });
        else if (messages[messages.length - 1].type === "text") (messages[messages.length - 1] as any).quickReply = quickReplyMenu();
        else messages.push({ type: "text", text: "บันทึกข้อมูลแล้ว", quickReply: quickReplyMenu() });
        await replyMessage(replyToken, messages);
        continue;
      }
      if (payload.action === "signup_edit") {
        const messages = await handleChat(userId, "แก้ไข");
        if (messages.length === 0) messages.push({ type: "text", text: "กรุณาระบุชื่อ-นามสกุลใหม่", quickReply: quickReplyMenu() });
        else if (messages[messages.length - 1].type === "text") (messages[messages.length - 1] as any).quickReply = quickReplyMenu();
        else messages.push({ type: "text", text: "กรุณาระบุชื่อ-นามสกุลใหม่", quickReply: quickReplyMenu() });
        await replyMessage(replyToken, messages);
        continue;
      }

      if (payload.action === "booking_confirm") {
        const messages = await handleChat(userId, "ยืนยัน");
        if (messages.length === 0) messages.push({ type: "text", text: "บันทึกการจองแล้ว", quickReply: quickReplyMenu() });
        else if (messages[messages.length - 1].type === "text") (messages[messages.length - 1] as any).quickReply = quickReplyMenu();
        else messages.push({ type: "text", text: "บันทึกการจองแล้ว", quickReply: quickReplyMenu() });
        await replyMessage(replyToken, messages);
        continue;
      }

      if (payload.action === "booking_edit_date") {
        const messages = await forceBookingStep(userId, "date_pref");
        if (messages.length === 0)
          messages.push({ type: "text", text: "กรุณาระบุวันที่ที่ต้องการ", quickReply: quickReplyMenu() });
        else if (messages[messages.length - 1].type === "text") (messages[messages.length - 1] as any).quickReply = quickReplyMenu();
        else messages.push({ type: "text", text: "พิมพ์วัน เช่น 2025-12-01", quickReply: quickReplyMenu() });
        await replyMessage(replyToken, messages);
        continue;
      }
      if (payload.action === "booking_edit_address") {
        const messages = await forceBookingStep(userId, "address");
        if (messages.length === 0)
          messages.push({ type: "text", text: "โปรดส่งตำแหน่งหรือพิมพ์ที่อยู่ใหม่", quickReply: quickReplyMenu() });
        else if (messages[messages.length - 1].type === "text") (messages[messages.length - 1] as any).quickReply = quickReplyMenu();
        else messages.push({ type: "text", text: "ส่ง Location จากเมนู📎ได้เลย", quickReply: quickReplyMenu() });
        await replyMessage(replyToken, messages);
        continue;
      }

      await replyMessage(replyToken, [{ type: "text", text: "ไม่เข้าใจคำสั่ง กด 'เมนู' เพื่อเริ่ม", quickReply: quickReplyMenu() }]);
      continue;
    }

    if (ev.type === "message" && ev.message.type === "text") {
      // Idempotency: skip duplicate message IDs
      const meta = getUserMeta(userId);
      const messageId = ev.message.id;
      if (meta?.lastEventId === messageId) continue;

      const messages = await handleChat(userId, ev.message.text);
      upsertUserMeta(userId, { lastEventId: messageId });
      if (messages.length === 0) messages.push({ type: "text", text: "", quickReply: quickReplyMenu() });
      else if (messages[messages.length - 1].type === "text") (messages[messages.length - 1] as any).quickReply = quickReplyMenu();
      else messages.push({ type: "text", text: "เลือกตัวเลือกจากเมนูลัด", quickReply: quickReplyMenu() });
      await replyMessage(replyToken, messages);
      continue;
    }

    if (ev.type === "message" && (ev as any).message.type === "location") {
      const meta = getUserMeta(userId);
      const messageId = (ev as any).message.id;
      if (meta?.lastEventId === messageId) continue;

      const loc = (ev as any).message;
      const messages = await handleLocation(userId, loc.latitude, loc.longitude, loc.address || loc.title);
      upsertUserMeta(userId, { lastEventId: messageId });
      if (messages.length === 0) messages.push({ type: "text", text: "รับตำแหน่งแล้ว", quickReply: quickReplyMenu() });
      else if (messages[messages.length - 1].type === "text") (messages[messages.length - 1] as any).quickReply = quickReplyMenu();
      else messages.push({ type: "text", text: "เลือกตัวเลือกจากเมนูลัด", quickReply: quickReplyMenu() });
      await replyMessage(replyToken, messages);
      continue;
    }
  }

  return NextResponse.json({ ok: true });
}
