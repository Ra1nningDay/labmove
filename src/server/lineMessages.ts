import type { LineMessage, LineQuickReply } from "@/server/types/line";
import type { SignupProgress } from "@/server/agent/signupFlow";
import type { BookingProgress } from "@/server/agent/bookingFlow";
import type { BookingRow, BookingSessionRow } from "@/server/repo/bookings";
import type { UserRow } from "@/server/repo/users";

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

export function welcomeFlex(): LineMessage {
  return {
    type: "flex",
    altText: "ยินดีต้อนรับสู่ Labmove",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "md",
        contents: [
          {
            type: "text",
            text: "ยินดีต้อนรับสู่ Labmove",
            weight: "bold",
            size: "lg",
          },
          {
            type: "text",
            text: "เริ่มใช้งานได้ทันที: สมัครสมาชิกหรือจองนัด",
            wrap: true,
            size: "sm",
            color: "#666666",
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            action: {
              type: "postback",
              label: "สมัครสมาชิก",
              data: JSON.stringify({ mode: "signup_start" }),
            },
          },
          {
            type: "button",
            style: "secondary",
            action: {
              type: "postback",
              label: "จองนัด",
              data: JSON.stringify({ mode: "booking_start" }),
            },
          },
          {
            type: "button",
            style: "link",
            action: {
              type: "message",
              label: "คุยกับผู้ช่วย",
              text: "คุยกับผู้ช่วย",
            },
          },
        ],
      },
    },
  };
}

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

export function signupSummaryFlex(p: SignupProgress): LineMessage {
  return {
    type: "flex",
    altText: "สรุปข้อมูลสมัครสมาชิก",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          { type: "text", text: "สรุปสมัครสมาชิก", weight: "bold", size: "lg" },
          {
            type: "box",
            layout: "vertical",
            spacing: "xs",
            margin: "md",
            contents: [
              {
                type: "text",
                text: `ยินยอม: ${p.consent ? "ใช่" : "ไม่"}`,
                size: "sm",
              },
              { type: "text", text: `ชื่อ: ${p.name || "-"}`, size: "sm" },
              { type: "text", text: `โทร: ${p.phone || "-"}`, size: "sm" },
              { type: "text", text: `HN: ${p.hn || "-"}`, size: "sm" },
              {
                type: "text",
                text: `โรงพยาบาล: ${p.hospital || "-"}`,
                size: "sm",
              },
              {
                type: "text",
                text: `ผู้แนะนำ: ${p.referral || "-"}`,
                size: "sm",
              },
            ],
          },
        ],
      },
      footer: {
        type: "box",
        layout: "horizontal",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            action: {
              type: "postback",
              label: "ยืนยัน",
              data: JSON.stringify({ action: "signup_confirm" }),
            },
          },
          {
            type: "button",
            style: "secondary",
            action: {
              type: "postback",
              label: "แก้ไข",
              data: JSON.stringify({ action: "signup_edit" }),
            },
          },
        ],
      },
    },
  };
}

export function bookingSummaryFlex(p: BookingProgress): LineMessage {
  return {
    type: "flex",
    altText: "ยืนยันการจอง",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          { type: "text", text: "ยืนยันการจอง", weight: "bold", size: "lg" },
          {
            type: "box",
            layout: "vertical",
            spacing: "xs",
            margin: "md",
            contents: [
              {
                type: "text",
                text: `วันที่ที่ต้องการ: ${
                  (p as BookingProgress & { datePreference?: string })
                    .datePreference ||
                  p.bookingDate ||
                  "-"
                }`,
                size: "sm",
              },
              {
                type: "text",
                text: `📍 ที่อยู่: ${p.address || "-"}`,
                size: "sm",
                wrap: true,
              },
              {
                type: "text",
                text: `พิกัด: ${
                  ((p as BookingProgress & { lat?: number; lng?: number })
                    .lat ??
                    "") &&
                  ((p as BookingProgress & { lat?: number; lng?: number })
                    .lng ??
                    "")
                    ? `${
                        (p as BookingProgress & { lat?: number; lng?: number })
                          .lat
                      }, ${
                        (p as BookingProgress & { lat?: number; lng?: number })
                          .lng
                      }`
                    : "-"
                }`,
                size: "xs",
              },
              {
                type: "text",
                text: `หมายเหตุ: ${p.note || "-"}`,
                size: "sm",
                wrap: true,
              },
            ],
          },
        ],
      },
      footer: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "primary",
            action: {
              type: "postback",
              label: "ยืนยัน",
              data: JSON.stringify({ action: "booking_confirm" }),
            },
          },
          {
            type: "button",
            style: "secondary",
            action: {
              type: "postback",
              label: "แก้ไขวัน",
              data: JSON.stringify({ action: "booking_edit_date" }),
            },
          },
          {
            type: "button",
            style: "secondary",
            action: {
              type: "postback",
              label: "แก้ไขที่อยู่",
              data: JSON.stringify({ action: "booking_edit_address" }),
            },
          },
        ],
      },
    },
  };
}

export function bookingDetailsFlex(
  p: Partial<BookingRow & BookingSessionRow>
): LineMessage {
  return {
    type: "flex",
    altText: "รายละเอียดการจองล่าสุด",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          { type: "text", text: "รายละเอียดการจอง", weight: "bold", size: "lg" },
          {
            type: "box",
            layout: "vertical",
            spacing: "xs",
            margin: "md",
            contents: [
              {
                type: "text",
                text: `วันที่นัด: ${p.bookingDate || p.datePreference || "-"}`,
                size: "sm",
              },
              {
                type: "text",
                text: `📍 ${p.address || "-"}`,
                size: "sm",
                wrap: true,
              },
              {
                type: "text",
                text: `พิกัด: ${
                  p.lat != null && p.lng != null ? `${p.lat}, ${p.lng}` : "-"
                }`,
                size: "xs",
              },
              {
                type: "text",
                text: `สถานะ: ${(p as any).status || "-"}`,
                size: "sm",
              },
              p.note
                ? { type: "text", text: `หมายเหตุ: ${p.note}`, size: "sm", wrap: true }
                : { type: "text", text: "", size: "sm" },
            ].filter((x) => (x as any).text !== ""),
          },
        ],
      },
      footer: {
        type: "box",
        layout: "horizontal",
        spacing: "sm",
        contents: [
          {
            type: "button",
            style: "secondary",
            action: {
              type: "postback",
              label: "แก้ไขวัน",
              data: JSON.stringify({ action: "booking_edit_date" }),
            },
          },
          {
            type: "button",
            style: "secondary",
            action: {
              type: "postback",
              label: "แก้ไขที่อยู่",
              data: JSON.stringify({ action: "booking_edit_address" }),
            },
          },
        ],
      },
    },
  };
}

export function profileListFlex(members: UserRow[]): LineMessage {
  const items = members.slice(-5); // show last 5
  return {
    type: "flex",
    altText: "โปรไฟล์สมาชิก",
    contents: {
      type: "bubble",
      body: {
        type: "box",
        layout: "vertical",
        spacing: "sm",
        contents: [
          { type: "text", text: "โปรไฟล์สมาชิก", size: "lg", weight: "bold" },
          ...items.map((m) => ({
            type: "box",
            layout: "vertical",
            spacing: "xs",
            margin: "md",
            contents: [
              { type: "text", text: m.name || "(ไม่มีชื่อ)", weight: "bold", size: "sm" },
              { type: "text", text: `โทร: ${m.phone || "-"}`, size: "xs" },
              { type: "text", text: `HN: ${m.hn || "-"}`, size: "xs" },
              { type: "text", text: `โรงพยาบาล: ${m.hospital || "-"}`, size: "xs" },
            ],
          })),
        ],
      },
    },
  };
}
