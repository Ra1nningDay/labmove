// Booking flow state machine for LINE chat — LabMove copy tuned

export type BookingProgress = {
  step: "start" | "address" | "date_pref" | "note" | "confirm" | "done";
  bookingDate?: string; // YYYY-MM-DD (if user specified)
  datePreference?: string; // เร็วที่สุด/วันนี้/พรุ่งนี้/หรือวันที่
  address?: string;
  lat?: number;
  lng?: number;
  note?: string;
};

export type CompletedBooking = {
  bookingDate?: string;
  datePreference: string;
  address: string;
  lat?: number;
  lng?: number;
  note?: string;
};

function isValidDateYYYYMMDD(s: string) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return false;
  const d = new Date(s + "T00:00:00Z");
  return !isNaN(d.getTime());
}

// remove time window validation; backend will schedule

export function handleBookingStep(
  progress: BookingProgress | undefined,
  text: string
): {
  nextProgress: BookingProgress;
  responseText: string;
  completedBooking?: CompletedBooking;
} {
  const p: BookingProgress = progress ?? { step: "start" };
  const t = text.trim();

  // Global cancel
  if (t.toLowerCase() === "ยกเลิก" || t.toLowerCase() === "cancel") {
    return {
      nextProgress: { step: "start" },
      responseText:
        "ยกเลิกการจองแล้วค่ะ พิมพ์ “จองนัด” เพื่อเริ่มใหม่ หรือพิมพ์ “เมนู” เพื่อกลับเมนูหลัก",
    };
  }

  // Start
  if (p.step === "start") {
    if (/^จองนัด$|^เริ่มจอง|^book/i.test(t)) {
      return {
        nextProgress: { step: "address" },
        responseText:
          "📍 โปรดส่งตำแหน่งที่อยู่สำหรับเจาะเลือด หรือพิมพ์ที่อยู่โดยย่อได้เลย",
      };
    }
    return {
      nextProgress: p,
      responseText: "พิมพ์ “จองนัด” เพื่อเริ่มจองตรวจเลือดถึงบ้านค่ะ",
    };
  }

  // Address (text mode if user typed)
  if (p.step === "address") {
    const address = t;
    if (address.length < 6) {
      return {
        nextProgress: p,
        responseText:
          "ที่อยู่สั้นไปนิดค่ะ กรุณาระบุรายละเอียดเพิ่ม หรือส่งตำแหน่ง (Location) ก็ได้",
      };
    }
    return {
      nextProgress: { ...p, step: "date_pref", address },
      responseText:
        "🗓 ต้องการวันไหนคะ (พิมพ์ ‘เร็วที่สุด’ / ‘วันนี้’ / ‘พรุ่งนี้’ หรือ YYYY-MM-DD)",
    };
  }

  // Date preference
  if (p.step === "date_pref") {
    let pref = t;
    if (/^เร็วที่สุด$/i.test(pref)) pref = "เร็วที่สุด";
    else if (/^วันนี้$/i.test(pref)) pref = "วันนี้";
    else if (/^พรุ่งนี้$/i.test(pref)) pref = "พรุ่งนี้";
    else if (isValidDateYYYYMMDD(pref)) {
      return {
        nextProgress: { ...p, step: "note", bookingDate: pref, datePreference: pref },
        responseText: "มีข้อมูลเพิ่มเติมไหมคะ (พิมพ์ '-' ถ้าไม่มี)",
      };
    } else if (pref.length < 2) {
      return {
        nextProgress: p,
        responseText:
          "กรุณาระบุ ‘เร็วที่สุด’ / ‘วันนี้’ / ‘พรุ่งนี้’ หรือ YYYY-MM-DD",
      };
    }
    return {
      nextProgress: { ...p, step: "note", datePreference: pref },
      responseText: "มีข้อมูลเพิ่มเติมไหมคะ (พิมพ์ '-' ถ้าไม่มี)",
    };
  }

  // Note
  if (p.step === "note") {
    const note = t === "-" ? "" : t;
    const summary =
      `โปรดยืนยันรายละเอียดการนัด\n` +
      `• วันที่ที่ต้องการ: ${p.datePreference || p.bookingDate || "-"}\n` +
      `• ที่อยู่: ${p.address}\n` +
      `• หมายเหตุ: ${note || "-"}\n\n` +
      `พิมพ์ “ยืนยัน” เพื่อบันทึก หรือพิมพ์ “แก้ไข” เพื่อปรับข้อมูล`;
    return {
      nextProgress: { ...p, step: "confirm", note },
      responseText: summary,
    };
  }

  // Confirm
  if (p.step === "confirm") {
    if (/^ยืนยัน$|^confirm$/i.test(t)) {
      const completed: CompletedBooking = {
        bookingDate: p.bookingDate,
        datePreference: p.datePreference || p.bookingDate || "",
        address: p.address!,
        lat: p.lat,
        lng: p.lng,
        note: p.note || "",
      };
      return {
        nextProgress: { step: "done" },
        responseText:
          "บันทึกการจองเรียบร้อยค่ะ ทีม LabMove จะยืนยันคิวอีกครั้งก่อนเข้าบริการ 🙏\nพิมพ์ “เมนู” เพื่อกลับหน้าหลัก",
        completedBooking: completed,
      };
    }
    if (/^แก้ไข$|^edit$/i.test(t)) {
      return {
        nextProgress: { step: "address" },
        responseText: "เริ่มแก้ไขใหม่ค่ะ ส่งตำแหน่งหรือพิมพ์ที่อยู่สำหรับเข้ารับบริการ",
      };
    }
    return {
      nextProgress: p,
      responseText:
        "พิมพ์ “ยืนยัน” เพื่อบันทึก หรือ “แก้ไข” เพื่อปรับข้อมูลค่ะ",
    };
  }

  // Fallback
  return {
    nextProgress: { step: "start" },
    responseText: "พิมพ์ “จองนัด” เพื่อเริ่มการจองใหม่ได้ค่ะ",
  };
}
