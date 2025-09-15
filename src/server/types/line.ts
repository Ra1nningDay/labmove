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
export type LineBoxText = {
  type: "text";
  text: string;
  weight?: string;
  size?: string;
  color?: string;
  wrap?: boolean;
  margin?: string;
  backgroundColor?: string;
};

export type LineBoxButton = {
  type: "button";
  style?: "primary" | "secondary" | "link";
  color?: string;
  action: LineActionPostback | LineActionMessage | LineActionURI;
};

export type LineBox = {
  type: "box";
  layout: "vertical" | "horizontal" | "baseline";
  spacing?: string;
  margin?: string;
  paddingAll?: string;
  backgroundColor?: string;
  contents: Array<LineBoxText | LineBox | LineBoxButton | unknown>;
};

export type LineFlexBubble = {
  type: "bubble";
  header?: LineBox;
  body?: LineBox;
  footer?: LineBox;
  styles?: {
    footer?: {
      separator?: boolean;
    };
  };
};

export type LineFlexCarousel = {
  type: "carousel";
  contents: LineFlexBubble[];
};

export type LineFlexContents = LineFlexBubble | LineFlexCarousel;

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
// URI action for opening external URLs (e.g., LIFF)
export type LineActionURI = {
  type: "uri";
  label?: string;
  uri: string;
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
