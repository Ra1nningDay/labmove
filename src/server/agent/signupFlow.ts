// Simple signup flow state machine for LINE chat onboarding

export type SignupProgress = {
  step: "start" | "name" | "phone" | "address" | "confirm" | "done";
  name?: string;
  phone?: string;
  address?: string;
};

export type CompletedUser = { name: string; phone: string; address: string };

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
      return { nextProgress: { step: "name" }, responseText: "ขอทราบชื่อ-นามสกุล ผู้สมัครครับ/ค่ะ" };
    }
    // Guide user to begin
    return { nextProgress: p, responseText: "พิมพ์ 'สมัคร' เพื่อเริ่มต้นการสมัครสมาชิกครับ/ค่ะ" };
  }

  if (p.step === "name") {
    const name = t.replace(/\s+/g, " ").trim();
    if (name.length < 2) return { nextProgress: p, responseText: "ชื่อสั้นไป กรุณาพิมพ์ชื่อ-นามสกุลอีกครั้งครับ/ค่ะ" };
    return { nextProgress: { ...p, step: "phone", name }, responseText: "กรุณาระบุเบอร์โทรศัพท์" };
  }

  if (p.step === "phone") {
    const phone = cleanPhone(t);
    if (!phone) return { nextProgress: p, responseText: "รูปแบบเบอร์ไม่ถูกต้อง กรุณาพิมพ์ใหม่ (เช่น 0812345678)" };
    return { nextProgress: { ...p, step: "address", phone }, responseText: "กรุณาระบุที่อยู่ครับ/ค่ะ" };
  }

  if (p.step === "address") {
    const address = t;
    if (address.length < 6) return { nextProgress: p, responseText: "ที่อยู่สั้นไป กรุณาพิมพ์ใหม่ให้ละเอียดขึ้นครับ/ค่ะ" };
    const confirmText = `ตรวจสอบข้อมูล\nชื่อ: ${p.name}\nโทร: ${p.phone}\nที่อยู่: ${address}\n\nพิมพ์ 'ยืนยัน' เพื่อบันทึก หรือ 'แก้ไข' เพื่อเริ่มใหม่`;
    return { nextProgress: { ...p, step: "confirm", address }, responseText: confirmText };
  }

  if (p.step === "confirm") {
    if (/^ยืนยัน$|^confirm$/i.test(t)) {
      const completed = { name: p.name!, phone: p.phone!, address: p.address! };
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

