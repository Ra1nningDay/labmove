export type LineQuickReplyItemAction = {
  type: "message";
  label: string;
  text: string;
};
export type LineQuickReply = {
  items: Array<{ type: "action"; action: LineQuickReplyItemAction }>;
};
export type LineMessageText = {
  type: "text";
  text: string;
  quickReply?: LineQuickReply;
};

// Flex message contents (simplified typing)
export type LineFlexContents = {
  type: "bubble";
  body?: {
    type: "box";
    layout: "vertical";
    spacing?: string;
    contents: Array<
      | {
          type: "text";
          text: string;
          weight?: string;
          size?: string;
          color?: string;
          wrap?: boolean;
          margin?: string;
        }
      | {
          type: "box";
          layout: "vertical" | "horizontal";
          spacing?: string;
          margin?: string;
          contents: Array<unknown>; // Recursive, using unknown for simplicity
        }
    >;
  };
  footer?: {
    type: "box";
    layout: "vertical" | "horizontal";
    spacing?: string;
    contents: Array<{
      type: "button";
      style?: "primary" | "secondary" | "link";
      action: LineActionPostback | LineActionMessage;
    }>;
  };
};

export type LineMessageFlex = {
  type: "flex";
  altText: string;
  contents: LineFlexContents;
};

// Template confirm
export type LineActionPostback = {
  type: "postback";
  label: string;
  data: string;
  displayText?: string;
};
export type LineActionMessage = {
  type: "message";
  label: string;
  text: string;
};
export type LineMessageTemplateConfirm = {
  type: "template";
  altText: string;
  template: {
    type: "confirm";
    text: string;
    actions: Array<LineActionPostback | LineActionMessage>;
  };
};

export type LineMessage =
  | LineMessageText
  | LineMessageFlex
  | LineMessageTemplateConfirm;

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
