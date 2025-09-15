import type {
  LineMessage,
  LineQuickReply,
  LineFlexBubble,
  LineBox,
  LineBoxButton,
  LineActionPostback,
  LineActionMessage,
  LineActionURI,
} from "@/server/types/line";
import type { SignupProgress } from "@/server/agent/signupFlow";
import type { BookingProgress } from "@/server/agent/bookingFlow";
import type { BookingRow, BookingSessionRow } from "@/server/repo/bookings";
import type { UserRow } from "@/server/repo/users";

// ---- THEME TOKENS ----------------------------------------------------------
const BRAND = {
  primary: "#46688b",
  accent: "#78b54a",
  muted: "#6B7280",
  white: "#FFFFFF",
  surface: "#F6F8FB",
};

// ช่วยสร้างหัวการ์ดแบบสีแบรนด์
function brandHeader(title: string, subtitle?: string): LineBox {
  return {
    type: "box",
    layout: "vertical",
    paddingAll: "16px",
    backgroundColor: BRAND.primary,
    contents: [
      {
        type: "text",
        text: title,
        weight: "bold",
        size: "lg",
        color: BRAND.white,
      },
      ...(subtitle
        ? [
            {
              type: "text",
              text: subtitle,
              size: "xs",
              color: "#DFE8F3",
              margin: "sm",
            },
          ]
        : []),
    ],
  };
}

// แถวข้อมูลแบบมีไอคอน (อีโมจิ) + ค่าข้อความ
function infoRow(
  icon: string,
  text: string,
  size: "sm" | "xs" = "sm"
): LineBox {
  return {
    type: "box",
    layout: "baseline",
    spacing: "sm",
    contents: [
      { type: "text", text: icon, size, flex: 0 },
      { type: "text", text, size, wrap: true, color: BRAND.muted },
    ],
  };
}

// ปุ่ม primary / secondary ที่คง spec LINE
function primaryBtn(
  action: LineActionPostback | LineActionMessage | LineActionURI
): LineBoxButton {
  return { type: "button", style: "primary", color: BRAND.primary, action };
}
function secondaryBtn(
  action: LineActionPostback | LineActionMessage | LineActionURI
): LineBoxButton {
  return { type: "button", style: "secondary", action };
}

// ---- QUICK REPLY (เดิม) ----------------------------------------------------
export function quickReplyMenu(): LineQuickReply {
  return {
    items: [
      {
        type: "action",
        action: { type: "message", label: "เมนู", text: "เมนู" },
      },
      {
        type: "action",
        action: { type: "message", label: "จองนัด", text: "จองนัด" },
      },
      {
        type: "action",
        action: { type: "message", label: "สมัคร", text: "สมัคร" },
      },
    ],
  };
}

// ---- WELCOME ---------------------------------------------------------------
export function welcomeFlex(): LineMessage {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
  const signupAction = liffId
    ? {
        type: "uri" as const,
        label: "สมัครสมาชิก",
        uri: `https://liff.line.me/${liffId}?mode=signup`,
      }
    : {
        type: "postback" as const,
        label: "สมัครสมาชิก",
        data: JSON.stringify({ mode: "signup_start" }),
      };
  const bookingAction = liffId
    ? {
        type: "uri" as const,
        label: "จองนัด",
        uri: `https://liff.line.me/${liffId}?mode=booking`,
      }
    : {
        type: "postback" as const,
        label: "จองนัด",
        data: JSON.stringify({ mode: "booking_start" }),
      };

  return {
    type: "flex",
    altText: "ยินดีต้อนรับสู่ Labmove",
    contents: {
      type: "bubble",
      header: brandHeader(
        "ยินดีต้อนรับสู่ Labmove",
        "บริการเจาะเลือดที่บ้าน • ปลอดภัย รวดเร็ว"
      ),
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        backgroundColor: BRAND.white,
        spacing: "md",
        contents: [
          {
            type: "box",
            layout: "vertical",
            backgroundColor: BRAND.surface,
            paddingAll: "12px",
            spacing: "sm",
            contents: [
              {
                type: "text",
                text: "เริ่มใช้งานได้ทันที",
                weight: "bold",
                size: "md",
              },
              { type: "separator", margin: "md" },
              infoRow("🆔", "สมัครสมาชิกเพื่อบันทึกข้อมูล"),
              infoRow("📅", "จองนัดพยาบาลถึงหน้าบ้าน"),
              infoRow("🔔", "รับแจ้งเตือนสถานะการนัดหมาย"),
            ],
          },
        ],
      },
      footer: {
        type: "box",
        layout: "horizontal",
        spacing: "sm",
        contents: [primaryBtn(signupAction), secondaryBtn(bookingAction)],
      },
      styles: { footer: { separator: true } },
    } as LineFlexBubble,
  };
}

// ---- OPEN LIFF PROMPT ------------------------------------------------------
export function openLiffPromptFlex(mode: "signup" | "booking"): LineMessage {
  const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
  const label = mode === "signup" ? "สมัครสมาชิก" : "จองนัด";
  const title = mode === "signup" ? "เปิดหน้าสมัครสมาชิก" : "เปิดหน้าจองนัด";
  const action = liffId
    ? {
        type: "uri" as const,
        label,
        uri: `https://liff.line.me/${liffId}?mode=${mode}`,
      }
    : {
        type: "postback" as const,
        label,
        data: JSON.stringify({ mode: `${mode}_start` }),
      };

  return {
    type: "flex",
    altText: label,
    contents: {
      type: "bubble",
      header: brandHeader(title),
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        contents: [
          {
            type: "text",
            text:
              mode === "signup"
                ? "กดปุ่มด้านล่างเพื่อเปิดหน้าสมัครใน LIFF"
                : "กดปุ่มด้านล่างเพื่อเปิดหน้าจองนัดใน LIFF",
            size: "sm",
            wrap: true,
            color: BRAND.muted,
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        contents: [primaryBtn(action)],
      },
    } as LineFlexBubble,
  };
}

// ---- CONSENT CONFIRM (เดิม) -----------------------------------------------
export function consentConfirm(): LineMessage {
  return {
    type: "template",
    altText: "ยืนยันการยินยอมจัดเก็บข้อมูล",
    template: {
      type: "confirm",
      text: "ยินยอมให้เก็บและใช้ข้อมูลส่วนบุคคลเพื่อการให้บริการตามนโยบายความเป็นส่วนตัวหรือไม่?",
      actions: [
        {
          type: "postback",
          label: "ยินยอม",
          data: JSON.stringify({ action: "consent_yes" }),
          displayText: "ยินยอม",
        },
        {
          type: "postback",
          label: "ไม่ยินยอม",
          data: JSON.stringify({ action: "consent_no" }),
          displayText: "ไม่ยินยอม",
        },
      ],
    },
  };
}

// ---- SIGNUP SUMMARY --------------------------------------------------------
export function signupSummaryFlex(p: SignupProgress): LineMessage {
  return {
    type: "flex",
    altText: "สรุปข้อมูลสมัครสมาชิก",
    contents: {
      type: "bubble",
      header: brandHeader("สรุปสมัครสมาชิก"),
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        spacing: "sm",
        contents: [
          {
            type: "box",
            layout: "vertical",
            backgroundColor: BRAND.surface,
            paddingAll: "12px",
            spacing: "xs",
            contents: [
              infoRow("✅", `ยินยอม: ${p.consent ? "ใช่" : "ไม่"}`),
              infoRow("👤", `ชื่อ: ${p.name || "-"}`),
              infoRow("📞", `โทร: ${p.phone || "-"}`),
              infoRow("🩺", `HN: ${p.hn || "-"}`),
              infoRow("🏥", `โรงพยาบาล: ${p.hospital || "-"}`),
              infoRow("🧩", `ผู้แนะนำ: ${p.referral || "-"}`, "xs"),
            ],
          },
        ],
      },
      footer: {
        type: "box",
        layout: "horizontal",
        spacing: "sm",
        contents: [
          primaryBtn({
            type: "postback",
            label: "ยืนยัน",
            data: JSON.stringify({ action: "signup_confirm" }),
          }),
          secondaryBtn({
            type: "postback",
            label: "แก้ไข",
            data: JSON.stringify({ action: "signup_edit" }),
          }),
        ],
      },
      styles: { footer: { separator: true } },
    } as LineFlexBubble,
  };
}

// ---- BOOKING SUMMARY -------------------------------------------------------
export function bookingSummaryFlex(
  p: BookingProgress & { lat?: number; lng?: number }
): LineMessage {
  const wish =
    (p as BookingProgress & { datePreference?: string }).datePreference ||
    p.bookingDate ||
    "-";
  return {
    type: "flex",
    altText: "ยืนยันการจอง",
    contents: {
      type: "bubble",
      header: brandHeader("ยืนยันการจอง"),
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        spacing: "sm",
        contents: [
          {
            type: "box",
            layout: "vertical",
            backgroundColor: BRAND.surface,
            paddingAll: "12px",
            spacing: "xs",
            contents: [
              infoRow("📅", `วันที่ที่ต้องการ: ${wish}`),
              infoRow("📍", `ที่อยู่: ${p.address || "-"}`),
              infoRow(
                "🗺️",
                (p.lat ?? "") && (p.lng ?? "") ? `${p.lat}, ${p.lng}` : "-",
                "xs"
              ),
              infoRow("📝", `หมายเหตุ: ${p.note || "-"}`),
            ],
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          primaryBtn({
            type: "postback",
            label: "ยืนยัน",
            data: JSON.stringify({ action: "booking_confirm" }),
          }),
          secondaryBtn({
            type: "postback",
            label: "แก้ไขวัน",
            data: JSON.stringify({ action: "booking_edit_date" }),
          }),
          secondaryBtn({
            type: "postback",
            label: "แก้ไขที่อยู่",
            data: JSON.stringify({ action: "booking_edit_address" }),
          }),
        ],
      },
      styles: { footer: { separator: true } },
    } as LineFlexBubble,
  };
}

// ---- BOOKING DETAILS -------------------------------------------------------
export function bookingDetailsFlex(
  p: Partial<BookingRow & BookingSessionRow>
): LineMessage {
  return {
    type: "flex",
    altText: "รายละเอียดการจองล่าสุด",
    contents: {
      type: "bubble",
      header: brandHeader(
        "รายละเอียดการจอง",
        p.status ? `สถานะ: ${p.status}` : undefined
      ),
      body: {
        type: "box",
        layout: "vertical",
        paddingAll: "16px",
        spacing: "sm",
        contents: [
          {
            type: "box",
            layout: "vertical",
            backgroundColor: BRAND.surface,
            paddingAll: "12px",
            spacing: "xs",
            contents: [
              infoRow(
                "📅",
                `วันที่นัด: ${p.bookingDate || p.datePreference || "-"}`
              ),
              infoRow("📍", p.address ? `${p.address}` : "-"),
              infoRow(
                "🗺️",
                p.lat != null && p.lng != null ? `${p.lat}, ${p.lng}` : "-",
                "xs"
              ),
              ...(p.note ? [infoRow("📝", `หมายเหตุ: ${p.note}`)] : []),
            ],
          },
        ],
      },
      footer: {
        type: "box",
        layout: "horizontal",
        spacing: "sm",
        contents: [
          secondaryBtn({
            type: "postback",
            label: "แก้ไขวัน",
            data: JSON.stringify({ action: "booking_edit_date" }),
          }),
          secondaryBtn({
            type: "postback",
            label: "แก้ไขที่อยู่",
            data: JSON.stringify({ action: "booking_edit_address" }),
          }),
        ],
      },
      styles: { footer: { separator: true } },
    } as LineFlexBubble,
  };
}

// ---- PROFILE LIST ----------------------------------------------------------
export function profileListFlex(members: UserRow[]): LineMessage {
  const renderBubble = (m: UserRow) => ({
    type: "bubble" as const,
    header: brandHeader("โปรไฟล์สมาชิก"),
    body: {
      type: "box" as const,
      layout: "vertical" as const,
      paddingAll: "16px",
      spacing: "sm",
      contents: [
        {
          type: "box",
          layout: "vertical",
          backgroundColor: BRAND.surface,
          paddingAll: "12px",
          spacing: "xs",
          contents: [
            {
              type: "text",
              text: m.name || "(ไม่มีชื่อ)",
              weight: "bold",
              size: "md",
            },
            infoRow("📞", `โทร: ${m.phone || "-"}`, "xs"),
            infoRow("🩺", `HN: ${m.hn || "-"}`, "xs"),
            infoRow("🏥", `โรงพยาบาล: ${m.hospital || "-"}`, "xs"),
          ],
        },
      ],
    },
    footer: {
      type: "box",
      layout: "horizontal",
      spacing: "sm",
      contents: [
        ...(m.phone
          ? [secondaryBtn({ type: "uri", label: "โทร", uri: `tel:${m.phone}` })]
          : []),
        secondaryBtn({
          type: "postback",
          label: "จองนัด",
          data: JSON.stringify({
            action: "booking_start_for",
            userId: m.lineUserId,
          }),
        }),
      ],
    },
    styles: { footer: { separator: true } },
  });

  const list = members.slice(-10);
  if (list.length <= 1) {
    const m = list[0] || members[0];
    return {
      type: "flex",
      altText: "โปรไฟล์สมาชิก",
      contents: renderBubble(m) as LineFlexBubble,
    };
  }
  return {
    type: "flex",
    altText: "โปรไฟล์สมาชิกหลายคน",
    contents: {
      type: "carousel",
      contents: list.map((m) => renderBubble(m) as LineFlexBubble),
    },
  };
}
