import { z } from "zod";

// Minimal LINE webhook schema for supported event types

const Source = z.object({
  type: z.enum(["user", "group", "room"]),
  userId: z.string().optional(),
  groupId: z.string().optional(),
  roomId: z.string().optional(),
});

const Message = z.discriminatedUnion("type", [
  z.object({ type: z.literal("text"), id: z.string(), text: z.string() }),
  z.object({ type: z.literal("image"), id: z.string() }),
  z.object({ type: z.literal("sticker"), id: z.string() }),
  z.object({
    type: z.literal("location"),
    id: z.string(),
    latitude: z.number(),
    longitude: z.number(),
    address: z.string().optional(),
    title: z.string().optional(),
  }),
]);

const Postback = z.object({ data: z.string() });

const DeliveryContext = z.object({
  isRedelivery: z.boolean(),
});

export const LineEventSchema = z.discriminatedUnion("type", [
  z
    .object({
      type: z.literal("message"),
      replyToken: z.string(),
      timestamp: z.number(),
      source: Source,
      message: Message,
      mode: z.string().optional(),
      webhookEventId: z.string().optional(),
      deliveryContext: DeliveryContext,
    })
    .strict(),
  z
    .object({
      type: z.literal("postback"),
      replyToken: z.string(),
      timestamp: z.number(),
      source: Source,
      postback: Postback,
      mode: z.string().optional(),
      webhookEventId: z.string().optional(),
      deliveryContext: DeliveryContext,
    })
    .strict(),
  z
    .object({
      type: z.literal("follow"),
      replyToken: z.string(),
      timestamp: z.number(),
      source: Source,
      mode: z.string().optional(),
      webhookEventId: z.string().optional(),
      deliveryContext: DeliveryContext,
    })
    .strict(),
]);

export const LineWebhookSchema = z
  .object({
    destination: z.string(),
    events: z.array(LineEventSchema),
  })
  .strict();

export type LineWebhook = z.infer<typeof LineWebhookSchema>;
