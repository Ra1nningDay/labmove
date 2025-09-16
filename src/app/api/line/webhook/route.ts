import crypto from "crypto";
import { NextRequest, NextResponse } from "next/server";
import { verifyLineSignature, replyMessage } from "@/server/line";
import { getUserMeta, upsertUserMeta } from "@/server/store/session";
import {
  handleChat,
  handleLocation,
  forceBookingStep,
} from "@/server/agent/router";
import type {
  LineWebhookEvent,
  LineMessage,
  LineMessageText,
} from "@/server/types/line";
import type {
  LineWebhookResponse,
  ValidationErrorResponse,
  AuthenticationErrorResponse,
  ServerErrorResponse,
} from "@/server/types/api";
import {
  quickReplyMenu,
  welcomeFlex,
  consentConfirm,
  bookingDetailsFlex,
  profileListFlex,
} from "@/server/lineMessages";
import {
  getLatestBookingByUserId,
  getBookingSessionByUserId,
} from "@/server/repo/bookings";
import { findUsersByLineId } from "@/server/repo/users";
import { reportHealthcareError } from "@/lib/sentry";

export const dynamic = "force-dynamic";

interface FieldError {
  field: string;
  message: string;
  value?: unknown;
}

const SIGNATURE_HEADER = "x-line-signature";
const DEFAULT_FALLBACK_TEXT = "Type 'menu' to see available options.";

function buildValidationError(
  fieldErrors: FieldError[],
  requestId: string,
  status = 400
) {
  const response: ValidationErrorResponse = {
    success: false,
    error: {
      code: "VALIDATION_ERROR",
      message: "Invalid webhook payload",
      details: { field_errors: fieldErrors },
    },
    meta: {
      request_id: requestId,
      timestamp: new Date().toISOString(),
    },
  };
  return NextResponse.json(response, { status });
}

function buildAuthenticationError(message: string, requestId: string) {
  const response: AuthenticationErrorResponse = {
    success: false,
    error: {
      code: "AUTHENTICATION_ERROR",
      message,
    },
    meta: {
      request_id: requestId,
      timestamp: new Date().toISOString(),
    },
  };
  return NextResponse.json(response, { status: 401 });
}

function buildServerError(
  code: ServerErrorResponse["error"]["code"],
  message: string,
  requestId: string,
  extraDetails?: Record<string, unknown>,
  status = 503
) {
  const response: ServerErrorResponse = {
    success: false,
    error: {
      code,
      message,
      details: {
        service: "line-webhook",
        operation: "webhook-processing",
        retry_possible: true,
        ...extraDetails,
      },
    },
    meta: {
      request_id: requestId,
      timestamp: new Date().toISOString(),
    },
  };
  return NextResponse.json(response, { status });
}

function withQuickReply(
  messages: LineMessage[],
  fallbackText: string
): LineMessage[] {
  const normalized: LineMessage[] = messages.map((message) => {
    if (message.type === "text") {
      return { ...message } as LineMessageText;
    }
    return message;
  });

  if (normalized.length === 0) {
    return [
      {
        type: "text",
        text: fallbackText,
        quickReply: quickReplyMenu(),
      },
    ];
  }

  const last = normalized[normalized.length - 1];
  if (last.type === "text") {
    (last as LineMessageText).quickReply = quickReplyMenu();
    return normalized;
  }

  return [
    ...normalized,
    {
      type: "text",
      text: fallbackText,
      quickReply: quickReplyMenu(),
    },
  ];
}

export async function POST(req: NextRequest) {
  const requestId = crypto.randomUUID();

  try {
    // Basic environment validation first
    if (!process.env.LINE_CHANNEL_SECRET) {
      console.error("LINE_CHANNEL_SECRET not configured");
      return buildServerError(
        "SERVICE_UNAVAILABLE",
        "LINE channel secret not configured",
        requestId,
        { missing: "LINE_CHANNEL_SECRET" }
      );
    }

    const raw = await req.text();
    const signature = req.headers.get(SIGNATURE_HEADER) || "";

    // Verify LINE signature (this should not depend on external services)
    let signatureValid = false;
    try {
      signatureValid = verifyLineSignature(raw, signature);
    } catch (error) {
      console.error("Signature verification failed:", error);
      return buildAuthenticationError(
        "Signature verification failed",
        requestId
      );
    }

    if (!signatureValid) {
      return buildAuthenticationError("Invalid webhook signature", requestId);
    }

    let body: { destination?: unknown; events?: LineWebhookEvent[] };
    try {
      body = JSON.parse(raw);
    } catch {
      return buildValidationError(
        [
          {
            field: "body",
            message: "Request body must be valid JSON",
          },
        ],
        requestId
      );
    }

    const fieldErrors: FieldError[] = [];
    if (!body || typeof body !== "object") {
      fieldErrors.push({ field: "body", message: "Payload must be an object" });
    }

    if (
      typeof body.destination !== "string" ||
      body.destination.trim().length === 0
    ) {
      fieldErrors.push({
        field: "destination",
        message: "destination is required",
      });
    }

    if (!Array.isArray(body.events)) {
      fieldErrors.push({
        field: "events",
        message: "events must be an array",
        value: body.events,
      });
    }

    if (fieldErrors.length > 0) {
      return buildValidationError(fieldErrors, requestId);
    }

    const events = body.events || [];
    let processed = 0;
    let skipped = 0;
    const errors: LineWebhookResponse["errors"] = [];

    for (let idx = 0; idx < events.length; idx++) {
      const ev = events[idx];
      const eventId =
        ev &&
        typeof ev === "object" &&
        "webhookEventId" in ev &&
        ev.webhookEventId
          ? String(ev.webhookEventId)
          : `event_${idx}`;

      try {
        if (ev?.deliveryContext?.isRedelivery) {
          skipped++;
          continue;
        }

        const userId =
          ev.source && "userId" in ev.source ? ev.source.userId : undefined;
        if (!userId) {
          skipped++;
          continue;
        }

        if (!("replyToken" in ev) || !ev.replyToken) {
          skipped++;
          continue;
        }

        const replyToken = ev.replyToken;
        const sendMessages = async (
          messages: LineMessage[],
          fallbackText = DEFAULT_FALLBACK_TEXT
        ) => {
          try {
            await replyMessage(
              replyToken,
              withQuickReply(messages, fallbackText)
            );
          } catch (replyError) {
            // Log but don't fail webhook if reply fails
            console.error("Failed to reply to LINE message:", replyError);
            await reportHealthcareError(replyError as Error, {
              operation: "line_reply_message",
              userId,
              eventId,
              requestId,
              severity: "medium",
            });
          }
        };
        const sendChat = async (
          input: string,
          fallbackText = DEFAULT_FALLBACK_TEXT
        ) => {
          try {
            const messages = await handleChat(userId, input);
            await sendMessages(messages, fallbackText);
          } catch (chatError) {
            console.error("Failed to handle chat:", chatError);
            await reportHealthcareError(chatError as Error, {
              operation: "line_handle_chat",
              userId,
              eventId,
              requestId,
              severity: "medium",
            });
            // Send fallback message
            try {
              await replyMessage(replyToken, [
                {
                  type: "text",
                  text: "Sorry, something went wrong. Please type 'menu' to return to the main menu.",
                  quickReply: quickReplyMenu(),
                },
              ]);
            } catch {
              // If even fallback fails, just continue
            }
            throw chatError;
          }
        };

        if (ev.type === "follow") {
          await replyMessage(replyToken, [
            welcomeFlex(),
            {
              type: "text",
              text: "ยินดีต้อนรับค่ะ พิมพ์ 'เมนู' เพื่อดูตัวเลือกได้เลยนะคะ",
              quickReply: quickReplyMenu(),
            },
          ]);
          processed++;
          continue;
        }

        if (ev.type === "postback") {
          const dataStr = ev.postback?.data || "";
          let payload: Record<string, string> = {};
          try {
            payload = JSON.parse(dataStr);
          } catch {
            const parsedPayload: Record<string, string> = {};
            dataStr.split("&").forEach((pair) => {
              const [k, v] = pair.split("=");
              if (k) {
                parsedPayload[decodeURIComponent(k)] = decodeURIComponent(
                  v || ""
                );
              }
            });
            payload = parsedPayload;
          }

          if (payload.mode === "signup_start") {
            await handleChat(userId, "สมัคร");
            await sendMessages(
              [
                consentConfirm(),
                {
                  type: "text",
                  text: "กด 'ยินยอม' เพื่อเปิดแบบฟอร์ม LIFF และสมัครสมาชิกได้เลยค่ะ",
                },
              ],
              DEFAULT_FALLBACK_TEXT
            );
            processed++;
            continue;
          }

          if (payload.mode === "booking_start") {
            const messages = await handleChat(userId, "จองนัด");
            await sendMessages(
              messages,
              "พร้อมเริ่มจองนัดแล้วค่ะ หากต้องการกลับเมนูพิมพ์ 'เมนู' ได้เลย"
            );
            processed++;
            continue;
          }

          if (payload.action === "consent_yes") {
            await sendChat(
              "ยินยอม",
              "บันทึกการยินยอมเรียบร้อยค่ะ หากต้องการดูตัวเลือกอื่นพิมพ์ 'เมนู'"
            );
            processed++;
            continue;
          }

          if (payload.action === "consent_no") {
            await sendChat(
              "ไม่ยินยอม",
              "ยกเลิกขั้นตอนสมัครแล้วค่ะ หากต้องการเริ่มใหม่พิมพ์ 'สมัคร' ได้เลย"
            );
            processed++;
            continue;
          }

          if (payload.action === "signup_confirm") {
            await sendChat(
              "ยืนยัน",
              "บันทึกข้อมูลสมัครสมาชิกเรียบร้อยค่ะ ทีมงานจะติดต่อคุณหากต้องการข้อมูลเพิ่มเติม"
            );
            processed++;
            continue;
          }

          if (payload.action === "signup_edit") {
            await sendChat("แก้ไข", "เริ่มแก้ไขข้อมูลสมัครสมาชิกได้เลยค่ะ");
            processed++;
            continue;
          }

          if (payload.action === "booking_confirm") {
            await sendChat(
              "ยืนยัน",
              "บันทึกการจองเรียบร้อยค่ะ ทีม LabMove จะยืนยันคิวอีกครั้งก่อนเข้าบริการ"
            );
            processed++;
            continue;
          }

          if (payload.action === "booking_date") {
            const requestedDate =
              payload.date || payload.bookingDate || payload.value || "";
            if (requestedDate) {
              await sendChat(
                requestedDate,
                "ปรับวันที่ตามที่ระบุแล้วค่ะ หากต้องการแก้ไขเพิ่มเติมพิมพ์วันที่ใหม่ได้เลย"
              );
            } else {
              const messages = await forceBookingStep(userId, "date_pref");
              await sendMessages(
                messages,
                "กรุณาระบุวันที่ที่สะดวกสำหรับการเจาะเลือดค่ะ"
              );
            }
            processed++;
            continue;
          }

          if (payload.action === "booking_address") {
            const providedAddress = payload.address || payload.value || "";
            if (providedAddress) {
              await sendChat(
                providedAddress,
                "บันทึกที่อยู่แล้วค่ะ หากต้องการส่งพิกัดใหม่สามารถส่ง Location ได้เลย"
              );
            } else {
              const messages = await forceBookingStep(userId, "address");
              await sendMessages(
                messages,
                "ส่งตำแหน่งหรือพิมพ์ที่อยู่ใหม่ได้เลยค่ะ"
              );
            }
            processed++;
            continue;
          }

          if (payload.action === "booking_edit_date") {
            const messages = await forceBookingStep(userId, "date_pref");
            await sendMessages(
              messages,
              "กรุณาระบุวันที่ที่ต้องการอีกครั้งค่ะ"
            );
            processed++;
            continue;
          }

          if (payload.action === "booking_edit_address") {
            const messages = await forceBookingStep(userId, "address");
            await sendMessages(
              messages,
              "ส่งตำแหน่งหรือพิมพ์ที่อยู่ใหม่สำหรับเข้าบริการได้เลยค่ะ"
            );
            processed++;
            continue;
          }

          if (payload.action === "booking_start_for") {
            const members = await findUsersByLineId(userId);
            const targetName = members.find(
              (member) => member.lineUserId === payload.userId
            )?.name;
            const messages = await handleChat(userId, "จองนัด");
            const infoText = targetName
              ? `เริ่มจองให้ ${targetName} แล้วค่ะ กรุณาระบุรายละเอียดตามขั้นตอน`
              : "พร้อมเริ่มจองนัดแล้วค่ะ";
            await sendMessages(
              [...messages, { type: "text", text: infoText }],
              DEFAULT_FALLBACK_TEXT
            );
            processed++;
            continue;
          }

          if (payload.action === "booking_details") {
            const latest =
              (await getLatestBookingByUserId(userId)) ||
              (await getBookingSessionByUserId(userId));
            if (latest) {
              await sendMessages(
                [bookingDetailsFlex(latest)],
                "หากต้องการแก้ไขรายละเอียด พิมพ์ 'เมนู' เพื่อกลับเมนูหลักได้เลยนะคะ"
              );
            } else {
              await sendMessages(
                [
                  {
                    type: "text",
                    text: "ยังไม่มีข้อมูลการจองล่าสุดค่ะ",
                  },
                ],
                DEFAULT_FALLBACK_TEXT
              );
            }
            processed++;
            continue;
          }

          if (payload.action === "profile_show") {
            const members = await findUsersByLineId(userId);
            if (members.length > 0) {
              await sendMessages(
                [profileListFlex(members)],
                "หากต้องการเลือกเมนูอื่น พิมพ์ 'เมนู' เพื่อกลับไปหน้าเมนูหลักได้เลยนะคะ"
              );
            } else {
              await sendMessages(
                [
                  {
                    type: "text",
                    text: "ยังไม่พบข้อมูลสมาชิก กรุณาเปิด LIFF เพื่อเพิ่มข้อมูลก่อนนะคะ",
                  },
                ],
                DEFAULT_FALLBACK_TEXT
              );
            }
            processed++;
            continue;
          }

          await sendMessages(
            [
              {
                type: "text",
                text: "ยังไม่เข้าใจคำสั่งค่ะ พิมพ์ 'เมนู' เพื่อดูตัวเลือกได้เลยนะคะ",
              },
            ],
            DEFAULT_FALLBACK_TEXT
          );
          processed++;
          continue;
        }

        if (ev.type === "message" && ev.message.type === "text") {
          const meta = getUserMeta(userId);
          const messageId = ev.message.id;
          if (meta?.lastEventId === messageId) {
            skipped++;
            continue;
          }

          await sendChat(ev.message.text);
          upsertUserMeta(userId, { lastEventId: messageId });
          processed++;
          continue;
        }

        if (ev.type === "message" && ev.message.type === "location") {
          const meta = getUserMeta(userId);
          const messageId = ev.message.id;
          if (meta?.lastEventId === messageId) {
            skipped++;
            continue;
          }

          const loc = ev.message;
          const messages = await handleLocation(
            userId,
            loc.latitude,
            loc.longitude,
            loc.address || loc.title
          );
          await sendMessages(
            messages,
            "รับพิกัดเรียบร้อยค่ะ หากต้องการปรับวันที่หรือข้อมูลอื่นพิมพ์แจ้งได้เลย"
          );
          upsertUserMeta(userId, { lastEventId: messageId });
          processed++;
          continue;
        }

        skipped++;
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        errors.push({ event_id: eventId, error: message });
        await reportHealthcareError(error as Error, {
          operation: "line_webhook_event",
          eventId,
          requestId,
        });
      }
    }

    const response: LineWebhookResponse = {
      processed_events: processed,
      skipped_events: skipped,
      errors,
    };
    const json = NextResponse.json(response);
    json.headers.set("X-Request-ID", requestId);
    json.headers.set("Cache-Control", "no-store");
    return json;
  } catch (error) {
    await reportHealthcareError(error as Error, {
      operation: "line_webhook",
      requestId,
    });
    return buildServerError(
      "INTERNAL_SERVER_ERROR",
      "Unexpected error while processing webhook",
      requestId,
      undefined,
      500
    );
  }
}
