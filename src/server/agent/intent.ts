export type Intent =
  | "menu"
  | "signup"
  | "booking"
  | "profile"
  | "booking_details"
  | "help"
  | "edit_date"
  | "edit_address"
  | "unknown";

export function detectIntent(input: string): Intent {
  const t = (input || "").trim().toLowerCase();
  if (!t) return "unknown";

  // Menu
  if (/^(เมนู|menu)$/.test(t)) return "menu";

  // Signup
  if (/^(สมัคร|สมัครสมาชิก|ลงทะเบียน|signup|register)/.test(t)) return "signup";

  // Booking
  if (/^(จองนัด|นัดเจาะเลือด|booking|book)/.test(t)) return "booking";

  // Profile / booking details (typed entrypoints)
  if (/^(โปรไฟล์|profile)/.test(t)) return "profile";
  if (/^(รายละเอียดนัด|appointment details)/.test(t)) return "booking_details";

  // Edits inside booking
  if (/^(แก้ไขวัน|edit date)/.test(t)) return "edit_date";
  if (/^(แก้ไขที่อยู่|edit address)/.test(t)) return "edit_address";

  // Help/assistant
  if (/^(คุยกับผู้ช่วย|ช่วยเหลือ|ช่วย|assistant|help)/.test(t)) return "help";

  return "unknown";
}

