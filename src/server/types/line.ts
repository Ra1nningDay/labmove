export type LineMessageText = { type: "text"; text: string };

export type LineWebhookEvent = {
  type: "message";
  replyToken: string;
  source: { userId?: string };
  timestamp: number;
  message: { id: string } & LineMessageText;
};

export type LineReplyBody = {
  replyToken: string;
  messages: Array<LineMessageText>;
};

