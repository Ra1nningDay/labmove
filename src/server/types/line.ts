export type LineQuickReplyItemAction = { type: "message"; label: string; text: string };
export type LineQuickReply = { items: Array<{ type: "action"; action: LineQuickReplyItemAction }> };
export type LineMessageText = { type: "text"; text: string; quickReply?: LineQuickReply };

// Flex message (minimal typing)
export type LineMessageFlex = { type: "flex"; altText: string; contents: any };

// Template confirm
export type LineActionPostback = { type: "postback"; label: string; data: string; displayText?: string };
export type LineActionMessage = { type: "message"; label: string; text: string };
export type LineMessageTemplateConfirm = {
  type: "template";
  altText: string;
  template: { type: "confirm"; text: string; actions: Array<LineActionPostback | LineActionMessage> };
};

export type LineMessage = LineMessageText | LineMessageFlex | LineMessageTemplateConfirm;

export type LineWebhookEventMessageText = {
  type: "message";
  replyToken: string;
  source: { userId?: string };
  timestamp: number;
  message: { id: string; type: "text"; text: string };
};

export type LineWebhookEventMessageLocation = {
  type: "message";
  replyToken: string;
  source: { userId?: string };
  timestamp: number;
  message: {
    id: string;
    type: "location";
    title?: string;
    address?: string;
    latitude: number;
    longitude: number;
  };
};

export type LineWebhookEventPostback = {
  type: "postback";
  replyToken: string;
  source: { userId?: string };
  timestamp: number;
  postback: { data: string };
};

export type LineWebhookEventFollow = {
  type: "follow";
  replyToken: string;
  source: { userId?: string };
  timestamp: number;
};

export type LineWebhookEvent =
  | LineWebhookEventMessageText
  | LineWebhookEventMessageLocation
  | LineWebhookEventPostback
  | LineWebhookEventFollow;

export type LineReplyBody = {
  replyToken: string;
  messages: Array<LineMessage>;
};
