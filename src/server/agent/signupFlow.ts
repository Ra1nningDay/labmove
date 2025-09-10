// Simple signup flow state machine for LINE chat onboarding

export type SignupProgress = {
  step:
    | "start"
    | "consent"
    | "name"
    | "phone"
    | "hn"
    | "hospital"
    | "referral"
    | "confirm"
    | "done";
  consent?: boolean;
  name?: string;
  phone?: string;
  hn?: string;
  hospital?: string;
  referral?: string;
};

export type CompletedUser = {
  consent: boolean;
  name: string;
  phone: string;
  hn?: string;
  hospital?: string;
  referral?: string;
};

function cleanPhone(input: string) {
  const digits = input.replace(/[^0-9]/g, "");
  // Accept 9-12 digits as a naive check
  return digits.length >= 9 && digits.length <= 12 ? digits : "";
}

export function handleSignupStep(progress: SignupProgress | undefined, text: string): {
  nextProgress: SignupProgress;
  responseText: string;
  completedUser?: CompletedUser;
} {
  const p: SignupProgress = progress ?? { step: "start" };
  const t = text.trim();

  if (t.toLowerCase() === "ยกเลิก" || t.toLowerCase() === "cancel") {
    return {
      nextProgress: { step: "start" },
      responseText: "ยกเลิกขั้นตอนสมัครแล้ว สามารถพิมพ์ 'สมัคร' เพื่อเริ่มใหม่ได้",
    };
  }

  if (p.step === "start") {
    if (/^สมัคร/i.test(t) || /^start/i.test(t)) {
      const consentMsg =
        "ก่อนเริ่มสมัคร กรุณายืนยันการยินยอมให้จัดเก็บและใช้ข้อมูลส่วนบุคคลเพื่อการให้บริการ\nพิมพ์ 'ยินยอม' เพื่อดำเนินการต่อ หรือ 'ยกเลิก' เพื่อยุติ";
      return { nextProgress: { step: "consent" }, responseText: consentMsg };
    }
    // Guide user to begin
    return { nextProgress: p, responseText: "พิมพ์ 'สมัคร' เพื่อเริ่มต้นการสมัครสมาชิกครับ/ค่ะ" };
  }

  if (p.step === "consent") {
    if (/^(ยินยอม|ยอมรับ|ตกลง|yes)$/i.test(t)) {
      return {
        nextProgress: { ...p, step: "name", consent: true },
        responseText: "ขอทราบชื่อ-นามสกุล ผู้สมัครครับ/ค่ะ",
      };
    }
    if (/^(ไม่ยินยอม|ไม่|no)$/i.test(t)) {
      return {
        nextProgress: { step: "start" },
        responseText: "ยกเลิกขั้นตอนสมัครแล้ว หากเปลี่ยนใจ พิมพ์ 'สมัคร' เพื่อเริ่มใหม่ได้",
      };
    }
    return {
      nextProgress: p,
      responseText: "กรุณาพิมพ์ 'ยินยอม' เพื่อดำเนินการต่อ หรือ 'ยกเลิก' เพื่อยุติ",
    };
  }

  if (p.step === "name") {
    const name = t.replace(/\s+/g, " ").trim();
    if (name.length < 2) return { nextProgress: p, responseText: "ชื่อสั้นไป กรุณาพิมพ์ชื่อ-นามสกุลอีกครั้งครับ/ค่ะ" };
    return { nextProgress: { ...p, step: "phone", name }, responseText: "กรุณาระบุเบอร์โทรศัพท์" };
  }

  if (p.step === "phone") {
    const phone = cleanPhone(t);
    if (!phone) return { nextProgress: p, responseText: "รูปแบบเบอร์ไม่ถูกต้อง กรุณาพิมพ์ใหม่ (เช่น 0812345678)" };
    return { nextProgress: { ...p, step: "hn", phone }, responseText: "กรุณาระบุรหัสผู้ป่วย (HN) ถ้าไม่ทราบพิมพ์ 'ไม่มี'" };
  }

  if (p.step === "hn") {
    let hn = t.trim();
    if (/^ไม่มี$|^ไม่ทราบ$|^none$|^no$/i.test(hn)) hn = "";
    if (hn && hn.length < 3) {
      return { nextProgress: p, responseText: "HN สั้นไป กรุณาพิมพ์ใหม่ หรือพิมพ์ 'ไม่มี'" };
    }
    return {
      nextProgress: { ...p, step: "hospital", hn },
      responseText: "โรงพยาบาลที่รักษาหรือสะดวก (พิมพ์ 'ไม่มี' ถ้าไม่ระบุ)",
    };
  }

  if (p.step === "hospital") {
    let hospital = t.trim();
    if (/^ไม่มี$|^ไม่ทราบ$|^none$|^no$/i.test(hospital)) hospital = "";
    if (hospital && hospital.length < 2) {
      return { nextProgress: p, responseText: "ชื่อโรงพยาบาลสั้นไป กรุณาพิมพ์ใหม่ หรือพิมพ์ 'ไม่มี'" };
    }
    return {
      nextProgress: { ...p, step: "referral", hospital },
      responseText: "มีผู้แนะนำ/ฝ่ายขายหรือไม่? (ระบุชื่อได้ หรือพิมพ์ 'ไม่มี')",
    };
  }

  if (p.step === "referral") {
    let referral = t.trim();
    if (/^ไม่มี$|^ไม่ทราบ$|^none$|^no$/i.test(referral)) referral = "";
    const confirmText = `ตรวจสอบข้อมูล\nยินยอม: ${p.consent ? "ใช่" : "ไม่"}\nชื่อ: ${p.name}\nโทร: ${p.phone}\nHN: ${p.hn || "-"}\nโรงพยาบาล: ${p.hospital || "-"}\nผู้แนะนำ: ${referral || "-"}\n\nพิมพ์ 'ยืนยัน' เพื่อบันทึก หรือ 'แก้ไข' เพื่อเริ่มใหม่`;
    return { nextProgress: { ...p, step: "confirm", referral }, responseText: confirmText };
  }

  if (p.step === "confirm") {
    if (/^ยืนยัน$|^confirm$/i.test(t)) {
      const completed = {
        consent: !!p.consent,
        name: p.name!,
        phone: p.phone!,
        hn: p.hn,
        hospital: p.hospital,
        referral: p.referral,
      };
      return {
        nextProgress: { step: "done" },
        responseText: "บันทึกข้อมูลเรียบร้อย ขอบคุณครับ/ค่ะ",
        completedUser: completed,
      };
    }
    if (/^แก้ไข$|^edit$/i.test(t)) {
      return { nextProgress: { step: "name" }, responseText: "เริ่มใหม่ กรุณาระบุชื่อ-นามสกุล" };
    }
    return { nextProgress: p, responseText: "กรุณาพิมพ์ 'ยืนยัน' เพื่อบันทึก หรือ 'แก้ไข' เพื่อเริ่มใหม่" };
  }

  // done → allow restart
  return { nextProgress: { step: "start" }, responseText: "พิมพ์ 'สมัคร' เพื่อเริ่มสมัครใหม่ได้ครับ/ค่ะ" };
}
