import { handleSignupStep, SignupProgress } from "@/server/agent/signupFlow";
import { handleBookingStep, BookingProgress } from "@/server/agent/bookingFlow";
import {
  getUserProgress,
  upsertUserProgress,
  clearUserProgress,
  getBookingProgress,
  upsertBookingProgress,
  clearBookingProgress,
  getRegisteredUserCached,
  upsertRegisteredUserCached,
  upsertUserMeta,
} from "@/server/store/session";
import { saveUser, findUserByLineId } from "@/server/repo/users";
import { upsertSignupSession } from "@/server/repo/sessions";
import { appendBooking, upsertBookingSession } from "@/server/repo/bookings";
import type { LineMessage } from "@/server/types/line";
import { bookingSummaryFlex, signupSummaryFlex } from "@/server/lineMessages";
import { geocodeTextServer, parseLatLngFromText } from "@/server/lib/geocode";

export async function handleChat(
  userId: string,
  text: string
): Promise<LineMessage[]> {
  const t = text.trim();

  // Ensure registered cache
  let reg = getRegisteredUserCached(userId);
  if (!reg) {
    const u = await findUserByLineId(userId);
    if (u) {
      reg = {
        lineUserId: u.lineUserId,
        name: u.name,
        phone: u.phone,
        hn: u.hn,
        hospital: u.hospital,
        referral: u.referral,
        registered: true,
      };
    } else {
      reg = { lineUserId: userId, registered: false };
    }
    upsertRegisteredUserCached(userId, reg);
  }

  // Decide current mode by ongoing progress
  const signupProgress = getUserProgress(userId);
  const bookingProgress = getBookingProgress(userId);
  const hasSignupFlow =
    signupProgress &&
    signupProgress.step !== "start" &&
    signupProgress.step !== "done";
  const hasBookingFlow =
    bookingProgress &&
    bookingProgress.step !== "start" &&
    bookingProgress.step !== "done";

  // Commands override
  if (/^เมนู$|^menu$/i.test(t)) {
    upsertUserMeta(userId, { mode: "idle" });
    return [
      {
        type: "text",
        text: reg.registered
          ? "เลือกเมนูที่ต้องการ:\n- พิมพ์ 'จองนัด' เพื่อเริ่มจอง\n- พิมพ์ 'คุยกับผู้ช่วย' เพื่อถามตอบทั่วไป"
          : "คุณยังไม่ได้สมัครสมาชิก พิมพ์ 'สมัคร' เพื่อเริ่ม หรือถามคำถามทั่วไปได้เลย",
      },
    ];
  }

  if (/^คุยกับผู้ช่วย$|^ผู้ช่วย$|^help$|^assist$/i.test(t)) {
    upsertUserMeta(userId, { mode: "llm" });
    return [
      {
        type: "text",
        text:
          "ผู้ช่วยแชต: พิมพ์คำถามได้เลย\nหรือกด 'เมนู' เพื่อดูตัวเลือก",
      },
    ];
  }

  // Continue ongoing flows first
  if (hasSignupFlow) {
    const { nextProgress, responseText, completedUser } = handleSignupStep(
      signupProgress,
      t
    );
    upsertUserProgress(userId, nextProgress);
    try {
      await upsertSignupSession(userId, nextProgress);
    } catch {}
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
      upsertRegisteredUserCached(userId, {
        lineUserId: userId,
        registered: true,
        name: completedUser.name,
        phone: completedUser.phone,
        hn: completedUser.hn,
        hospital: completedUser.hospital,
        referral: completedUser.referral,
      });
    }
    if (nextProgress.step === "confirm" && !completedUser) {
      return [signupSummaryFlex(nextProgress as SignupProgress)];
    }
    return [{ type: "text", text: responseText }];
  }

  if (hasBookingFlow) {
    const { nextProgress, responseText, completedBooking } = handleBookingStep(
      bookingProgress,
      t
    );
    // If we just left address step → try to enrich with lat/lng from text
    if (
      bookingProgress?.step === "address" &&
      nextProgress.step === "date_pref"
    ) {
      const fromText = parseLatLngFromText(t);
      if (fromText) {
        nextProgress.lat = fromText.lat;
        nextProgress.lng = fromText.lng;
      } else if (nextProgress.address && nextProgress.address.length >= 6) {
        try {
          const gc = await geocodeTextServer(nextProgress.address);
          if (gc) {
            nextProgress.lat = gc.coords.lat;
            nextProgress.lng = gc.coords.lng;
            // overwrite address with formatted if present
            if (gc.formattedAddress) nextProgress.address = gc.formattedAddress;
          }
        } catch {}
      }
    }
    upsertBookingProgress(userId, nextProgress);
    try {
      await upsertBookingSession(userId, {
        userId,
        step: nextProgress.step,
        address: nextProgress.address,
        lat: nextProgress.lat,
        lng: nextProgress.lng,
        bookingDate: nextProgress.bookingDate,
        datePreference: nextProgress.datePreference,
        imagesUrl: undefined,
        lastUpdated: new Date().toISOString(),
      });
    } catch {}
    if (completedBooking) {
      await appendBooking({
        userId,
        bookingDate: completedBooking.bookingDate,
        datePreference: completedBooking.datePreference,
        address: completedBooking.address,
        lat: completedBooking.lat,
        lng: completedBooking.lng,
        note: completedBooking.note,
        status: "pending",
      });
      clearBookingProgress(userId);
    }
    if (nextProgress.step === "confirm" && !completedBooking) {
      return [bookingSummaryFlex(nextProgress as BookingProgress)];
    }
    if (nextProgress.step === "address") {
      return [
        { type: "text", text: responseText },
        {
          type: "text",
          text: "หรือส่งตำแหน่ง (Location) จากเมนู📎ด้านซ้ายได้เลยค่ะ",
        },
      ];
    }
    if (nextProgress.step === "date_pref") {
      return [
        { type: "text", text: responseText },
        { type: "text", text: "ตัวอย่าง: วันนี้ / พรุ่งนี้ / 2025-12-01" },
      ];
    }
    return [{ type: "text", text: responseText }];
  }

  // Start flows when commands appear
  if (/^สมัคร/i.test(t)) {
    const { nextProgress, responseText } = handleSignupStep(undefined, "สมัคร");
    upsertUserProgress(userId, nextProgress);
    try {
      await upsertSignupSession(userId, nextProgress);
    } catch {}
    return [{ type: "text", text: responseText }];
  }

  if (/^จองนัด/i.test(t)) {
    if (!reg.registered) {
      return [
        {
          type: "text",
          text: "ยังไม่พบข้อมูลสมาชิกของคุณ กรุณาพิมพ์ 'สมัคร' เพื่อสมัครก่อนทำการจอง",
        },
      ];
    }
    const { nextProgress, responseText } = handleBookingStep(
      undefined,
      "จองนัด"
    );
    upsertBookingProgress(userId, nextProgress);
    try {
      await upsertBookingSession(userId, { userId, step: nextProgress.step });
    } catch {}
    return [{ type: "text", text: responseText }];
  }

  // Default: assistant chat stub
  upsertUserMeta(userId, { mode: "llm" });
  return [
    {
      type: "text",
      text: reg.registered
        ? "ผู้ช่วยแชต: ถามอะไรก็ได้เกี่ยวกับ Labmove\nพิมพ์ 'จองนัด' เพื่อเริ่มการจอง หรือ 'เมนู' เพื่อดูตัวเลือก"
        : "ผู้ช่วยแชต: ถามข้อมูลทั่วไปได้เลย\nหากต้องการใช้บริการ พิมพ์ 'สมัคร' เพื่อเริ่มสมัคร",
    },
  ];
}

export async function handleLocation(
  userId: string,
  latitude: number,
  longitude: number,
  address?: string
): Promise<LineMessage[]> {
  const prog = getBookingProgress(userId);
  // Ensure booking flow exists
  const base: BookingProgress =
    prog && prog.step !== "done" ? prog : { step: "address" };
  const next: BookingProgress = {
    ...base,
    step: "date_pref",
    address: address || base.address,
    lat: latitude,
    lng: longitude,
  };
  upsertBookingProgress(userId, next);
  try {
    await upsertBookingSession(userId, {
      userId,
      step: next.step,
      address: next.address,
      lat: latitude,
      lng: longitude,
      lastUpdated: new Date().toISOString(),
    });
  } catch {}
  return [
    { type: "text", text: "✅ รับตำแหน่งแล้วค่ะ" },
    {
      type: "text",
      text: "🗓 ต้องการวันไหนคะ (พิมพ์ ‘เร็วที่สุด’ / ‘วันนี้’ / ‘พรุ่งนี้’ หรือ YYYY-MM-DD)",
    },
  ];
}

// Force booking step for edit actions from Flex
export async function forceBookingStep(
  userId: string,
  step: "address" | "date_pref"
): Promise<LineMessage[]> {
  const current = getBookingProgress(userId) || { step: "start" };
  const next: BookingProgress = { ...current, step } as BookingProgress;
  upsertBookingProgress(userId, next);
  try {
    await upsertBookingSession(userId, {
      userId,
      step: next.step,
      address: next.address,
      lat: next.lat,
      lng: next.lng,
      lastUpdated: new Date().toISOString(),
    });
  } catch {}
  if (step === "address") {
    return [
      { type: "text", text: "โปรดส่งตำแหน่งหรือพิมพ์ที่อยู่ใหม่ค่ะ" },
      { type: "text", text: "สามารถส่ง Location จากเมนู📎ได้เช่นกัน" },
    ];
  }
  return [
    {
      type: "text",
      text: "กรุณาระบุวันที่ที่ต้องการ (เร็วที่สุด/วันนี้/พรุ่งนี้ หรือ YYYY-MM-DD)",
    },
  ];
}
