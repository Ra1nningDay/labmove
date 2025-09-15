import { NextRequest, NextResponse } from "next/server";
import { getBearerToken, originAllowed, verifyLiffIdToken } from "@/server/lib/liffAuth";
import { appendBooking, upsertBookingSession } from "@/server/repo/bookings";
import { geocodeTextServer } from "@/server/lib/geocode";
import { pushMessage } from "@/server/line";
import { bookingSummaryFlex, quickReplyMenu } from "@/server/lineMessages";
import type { BookingProgress } from "@/server/agent/bookingFlow";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  if (!originAllowed(req))
    return new NextResponse("Forbidden origin", { status: 403 });

  let body: {
    address?: string;
    lat?: number;
    lng?: number;
    datePreference?: string;
    bookingDate?: string; // YYYY-MM-DD
    note?: string;
  };
  try {
    body = await req.json();
  } catch {
    return new NextResponse("Bad JSON", { status: 400 });
  }

  const token = getBearerToken(req.headers.get("authorization"));
  if (!token) return new NextResponse("Missing bearer", { status: 401 });
  let info: { sub: string };
  try {
    info = await verifyLiffIdToken(token);
  } catch (e) {
    return new NextResponse(
      e instanceof Error ? e.message : "Verify error",
      { status: 401 }
    );
  }

  // Basic validation
  const address = (body.address || "").trim();
  if (address.length < 6)
    return new NextResponse("Invalid address", { status: 400 });
  const hasPref = !!(body.datePreference && body.datePreference.trim());
  const hasDate = !!(body.bookingDate && /^\d{4}-\d{2}-\d{2}$/.test(body.bookingDate));
  if (!hasPref && !hasDate)
    return new NextResponse("Missing date preference or bookingDate", { status: 400 });

  // Enrich geocode if lat/lng missing and we have address
  let lat = body.lat;
  let lng = body.lng;
  try {
    if ((lat == null || lng == null) && address.length >= 6) {
      const gc = await geocodeTextServer(address);
      if (gc) {
        lat = gc.coords.lat;
        lng = gc.coords.lng;
      }
    }
  } catch {}

  // Persist booking
  const datePreference = body.bookingDate ? "" : (body.datePreference || "เร็วที่สุด");
  const bookingDate = body.bookingDate || undefined;
  await appendBooking({
    userId: info.sub,
    bookingDate,
    datePreference: datePreference || bookingDate || "",
    address,
    lat,
    lng,
    note: (body.note || "").trim() || undefined,
    status: "pending",
  });

  // Mark session snapshot (completed)
  try {
    await upsertBookingSession(info.sub, {
      userId: info.sub,
      step: "done",
      address,
      lat,
      lng,
      bookingDate,
      datePreference: datePreference || undefined,
      lastUpdated: new Date().toISOString(),
      status: "completed",
    });
  } catch {}

  // Push summary
  try {
    const p: BookingProgress = {
      step: "confirm",
      bookingDate,
      datePreference: datePreference || bookingDate || "",
      address,
      lat,
      lng,
      note: (body.note || "").trim() || undefined,
    } as BookingProgress;
    await pushMessage(info.sub, [
      bookingSummaryFlex(p),
      { type: "text", text: "บันทึกการจองแล้ว ทีมงานจะติดต่อยืนยันอีกครั้งค่ะ", quickReply: quickReplyMenu() },
    ]);
  } catch {}

  return NextResponse.json({ ok: true, line_user_id: info.sub });
}
