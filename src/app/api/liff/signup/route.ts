import { NextRequest, NextResponse } from "next/server";
import { getBearerToken, originAllowed, verifyLiffIdToken } from "@/server/lib/liffAuth";
import { saveUser } from "@/server/repo/users";
import { upsertRegisteredUserCached } from "@/server/store/session";
import { pushMessage } from "@/server/line";
import { signupSummaryFlex, quickReplyMenu } from "@/server/lineMessages";
import type { SignupProgress } from "@/server/agent/signupFlow";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest) {
  // CSRF-lite: only allow same-origin (or configured PUBLIC_BASE_URL)
  if (!originAllowed(req))
    return new NextResponse("Forbidden origin", { status: 403 });

  let body: {
    consent?: boolean;
    name?: string;
    phone?: string;
    hn?: string;
    hospital?: string;
    referral?: string;
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
  if (!body.consent)
    return new NextResponse("Consent required", { status: 400 });
  const name = (body.name || "").trim();
  const phone = (body.phone || "").replace(/[^0-9]/g, "");
  if (name.length < 2)
    return new NextResponse("Invalid name", { status: 400 });
  if (phone.length < 9 || phone.length > 12)
    return new NextResponse("Invalid phone", { status: 400 });

  // Persist user minimal fields
  await saveUser({
    lineUserId: info.sub,
    name,
    phone,
    hn: (body.hn || "").trim() || undefined,
    hospital: (body.hospital || "").trim() || undefined,
    referral: (body.referral || "").trim() || undefined,
    consent: !!body.consent,
  });

  // Update cache
  upsertRegisteredUserCached(info.sub, {
    lineUserId: info.sub,
    registered: true,
    name,
    phone,
    hn: body.hn,
    hospital: body.hospital,
    referral: body.referral,
  });

  // Push confirmation summary
  try {
    const p: SignupProgress = {
      step: "confirm",
      consent: !!body.consent,
      name,
      phone,
      hn: body.hn,
      hospital: body.hospital,
      referral: body.referral,
    };
    await pushMessage(info.sub, [
      signupSummaryFlex(p),
      { type: "text", text: "บันทึกข้อมูลแล้ว ขอบคุณค่ะ", quickReply: quickReplyMenu() },
    ]);
  } catch {}

  return NextResponse.json({ ok: true, line_user_id: info.sub });
}
