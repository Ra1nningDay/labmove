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
  flex?: number;
  align?: "start" | "end" | "center";
};

export type LineBoxButton = {
  type: "button";
  style?: "primary" | "secondary" | "link";
  color?: string;
  action: LineActionPostback | LineActionMessage | LineActionURI;
};

export type LineBoxSeparator = {
  type: "separator";
  margin?: string;
  color?: string;
};

export type LineBoxImage = {
  type: "image";
  url: string;
  margin?: string;
  size?: string;
  aspectRatio?: string;
  aspectMode?: "cover" | "fit";
  backgroundColor?: string;
  action?: LineActionPostback | LineActionMessage | LineActionURI;
};

export type LineBoxSpacer = {
  type: "spacer";
  size?: "xs" | "sm" | "md" | "lg" | "xl" | "xxl";
};

export type LineBox = {
  type: "box";
  layout: "vertical" | "horizontal" | "baseline";
  spacing?: string;
  margin?: string;
  paddingAll?: string;
  backgroundColor?: string;
  borderWidth?: string;
  borderColor?: string;
  cornerRadius?: string;
  contents: Array<
    | LineBoxText
    | LineBox
    | LineBoxButton
    | LineBoxSeparator
    | LineBoxImage
    | LineBoxSpacer
    | unknown
  >;
  flex?: number;
  action?: LineActionPostback | LineActionMessage | LineActionURI;
};

export type LineFlexBubble = {
  type: "bubble";
  header?: LineBox;
  body?: LineBox;
  footer?: LineBox;
  styles?: {
    header?: {
      backgroundColor?: string;
      separator?: boolean;
      separatorColor?: string;
    };
    body?: {
      backgroundColor?: string;
      separator?: boolean;
      separatorColor?: string;
    };
    footer?: {
      backgroundColor?: string;
      separator?: boolean;
      separatorColor?: string;
    };
  };
  action?: LineActionPostback | LineActionMessage | LineActionURI;
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
  altUri?: {
    desktop: string;
  };
};

// Date/Time picker actions
export type LineActionDatetimePicker = {
  type: "datetimepicker";
  label: string;
  data: string;
  mode: "date" | "time" | "datetime";
  initial?: string;
  max?: string;
  min?: string;
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

// Button template for multiple choices
export type LineMessageTemplateButtons = {
  type: "template";
  altText: string;
  template: {
    type: "buttons";
    text: string;
    title?: string;
    thumbnailImageUrl?: string;
    imageAspectRatio?: "rectangle" | "square";
    imageSize?: "cover" | "contain";
    imageBackgroundColor?: string;
    actions: Array<
      | LineActionPostback
      | LineActionMessage
      | LineActionURI
      | LineActionDatetimePicker
    >;
  };
};

// Carousel template for multiple items
export type LineMessageTemplateCarousel = {
  type: "template";
  altText: string;
  template: {
    type: "carousel";
    columns: Array<{
      title?: string;
      text: string;
      thumbnailImageUrl?: string;
      imageBackgroundColor?: string;
      actions: Array<LineActionPostback | LineActionMessage | LineActionURI>;
    }>;
    imageAspectRatio?: "rectangle" | "square";
    imageSize?: "cover" | "contain";
  };
};

// Image carousel for image galleries
export type LineMessageImageCarousel = {
  type: "template";
  altText: string;
  template: {
    type: "image_carousel";
    columns: Array<{
      imageUrl: string;
      action: LineActionPostback | LineActionMessage | LineActionURI;
    }>;
  };
};

// Location message
export type LineMessageLocation = {
  type: "location";
  title: string;
  address: string;
  latitude: number;
  longitude: number;
};

// Image message
export type LineMessageImage = {
  type: "image";
  originalContentUrl: string;
  previewImageUrl: string;
};

// Sticker message
export type LineMessageSticker = {
  type: "sticker";
  packageId: string;
  stickerId: string;
};

export type LineMessage =
  | LineMessageText
  | LineMessageFlex
  | LineMessageTemplateConfirm
  | LineMessageTemplateButtons
  | LineMessageTemplateCarousel
  | LineMessageImageCarousel
  | LineMessageLocation
  | LineMessageImage
  | LineMessageSticker;

export type LineWebhookEventMessageText = {
  type: "message";
  replyToken: string;
  source: { userId?: string; groupId?: string; roomId?: string };
  timestamp: number;
  message: { id: string; type: "text"; text: string };
  mode: "active" | "standby";
  webhookEventId: string;
  deliveryContext: {
    isRedelivery: boolean;
  };
};

export type LineWebhookEventMessageLocation = {
  type: "message";
  replyToken: string;
  source: { userId?: string; groupId?: string; roomId?: string };
  timestamp: number;
  message: {
    id: string;
    type: "location";
    title?: string;
    address?: string;
    latitude: number;
    longitude: number;
  };
  mode: "active" | "standby";
  webhookEventId: string;
  deliveryContext: {
    isRedelivery: boolean;
  };
};

export type LineWebhookEventMessageImage = {
  type: "message";
  replyToken: string;
  source: { userId?: string; groupId?: string; roomId?: string };
  timestamp: number;
  message: {
    id: string;
    type: "image";
    contentProvider: {
      type: "line" | "external";
      originalContentUrl?: string;
      previewImageUrl?: string;
    };
  };
  mode: "active" | "standby";
  webhookEventId: string;
  deliveryContext: {
    isRedelivery: boolean;
  };
};

export type LineWebhookEventMessageSticker = {
  type: "message";
  replyToken: string;
  source: { userId?: string; groupId?: string; roomId?: string };
  timestamp: number;
  message: {
    id: string;
    type: "sticker";
    packageId: string;
    stickerId: string;
    stickerResourceType:
      | "STATIC"
      | "ANIMATION"
      | "SOUND"
      | "ANIMATION_SOUND"
      | "POPUP"
      | "POPUP_SOUND";
    keywords?: string[];
    text?: string;
  };
  mode: "active" | "standby";
  webhookEventId: string;
  deliveryContext: {
    isRedelivery: boolean;
  };
};

export type LineWebhookEventPostback = {
  type: "postback";
  replyToken: string;
  source: { userId?: string; groupId?: string; roomId?: string };
  timestamp: number;
  postback: {
    data: string;
    params?: {
      date?: string;
      time?: string;
      datetime?: string;
    };
  };
  mode: "active" | "standby";
  webhookEventId: string;
  deliveryContext: {
    isRedelivery: boolean;
  };
};

export type LineWebhookEventFollow = {
  type: "follow";
  replyToken: string;
  source: { userId?: string };
  timestamp: number;
  mode: "active" | "standby";
  webhookEventId: string;
  deliveryContext: {
    isRedelivery: boolean;
  };
};

export type LineWebhookEventUnfollow = {
  type: "unfollow";
  source: { userId?: string };
  timestamp: number;
  mode: "active" | "standby";
  webhookEventId: string;
  deliveryContext: {
    isRedelivery: boolean;
  };
};

export type LineWebhookEventJoin = {
  type: "join";
  replyToken: string;
  source: { groupId?: string; roomId?: string };
  timestamp: number;
  mode: "active" | "standby";
  webhookEventId: string;
  deliveryContext: {
    isRedelivery: boolean;
  };
};

export type LineWebhookEventLeave = {
  type: "leave";
  source: { groupId?: string; roomId?: string };
  timestamp: number;
  mode: "active" | "standby";
  webhookEventId: string;
  deliveryContext: {
    isRedelivery: boolean;
  };
};

export type LineWebhookEventMemberJoined = {
  type: "memberJoined";
  replyToken: string;
  source: { groupId?: string; roomId?: string };
  timestamp: number;
  joined: {
    members: Array<{
      type: "user";
      userId: string;
    }>;
  };
  mode: "active" | "standby";
  webhookEventId: string;
  deliveryContext: {
    isRedelivery: boolean;
  };
};

export type LineWebhookEventMemberLeft = {
  type: "memberLeft";
  source: { groupId?: string; roomId?: string };
  timestamp: number;
  left: {
    members: Array<{
      type: "user";
      userId: string;
    }>;
  };
  mode: "active" | "standby";
  webhookEventId: string;
  deliveryContext: {
    isRedelivery: boolean;
  };
};

// Beacon events for proximity-based features
export type LineWebhookEventBeacon = {
  type: "beacon";
  replyToken: string;
  source: { userId?: string };
  timestamp: number;
  beacon: {
    hwid: string;
    type: "enter" | "leave" | "banner";
    dm?: string;
  };
  mode: "active" | "standby";
  webhookEventId: string;
  deliveryContext: {
    isRedelivery: boolean;
  };
};

// Account link events for external authentication
export type LineWebhookEventAccountLink = {
  type: "accountLink";
  replyToken: string;
  source: { userId?: string };
  timestamp: number;
  link: {
    result: "ok" | "failed";
    nonce: string;
  };
  mode: "active" | "standby";
  webhookEventId: string;
  deliveryContext: {
    isRedelivery: boolean;
  };
};

export type LineWebhookEvent =
  | LineWebhookEventMessageText
  | LineWebhookEventMessageLocation
  | LineWebhookEventMessageImage
  | LineWebhookEventMessageSticker
  | LineWebhookEventPostback
  | LineWebhookEventFollow
  | LineWebhookEventUnfollow
  | LineWebhookEventJoin
  | LineWebhookEventLeave
  | LineWebhookEventMemberJoined
  | LineWebhookEventMemberLeft
  | LineWebhookEventBeacon
  | LineWebhookEventAccountLink;

export type LineReplyBody = {
  replyToken: string;
  messages: Array<LineMessage>;
  notificationDisabled?: boolean;
};

export type LinePushBody = {
  to: string; // userId, groupId, or roomId
  messages: Array<LineMessage>;
  notificationDisabled?: boolean;
  customAggregationUnits?: string;
};

export type LineMulticastBody = {
  to: string[]; // array of userIds
  messages: Array<LineMessage>;
  notificationDisabled?: boolean;
  customAggregationUnits?: string;
};

export type LineBroadcastBody = {
  messages: Array<LineMessage>;
  notificationDisabled?: boolean;
};

// Rich Menu types for healthcare navigation
export type LineRichMenuSize = {
  width: number;
  height: number;
};

export type LineRichMenuArea = {
  bounds: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
  action: LineActionPostback | LineActionMessage | LineActionURI;
};

export type LineRichMenu = {
  size: LineRichMenuSize;
  selected: boolean;
  name: string;
  chatBarText: string;
  areas: LineRichMenuArea[];
};

// User profile types
export type LineUserProfile = {
  displayName: string;
  userId: string;
  language?: string;
  pictureUrl?: string;
  statusMessage?: string;
};

// Healthcare-specific postback data structures
export interface BookingPostbackData {
  action:
    | "book_appointment"
    | "confirm_booking"
    | "cancel_booking"
    | "reschedule_booking";
  booking_id?: string;
  date?: string;
  time?: string;
  service_type?: string;
  patient_id?: string;
}

export interface NavigationPostbackData {
  action:
    | "view_bookings"
    | "book_new"
    | "contact_support"
    | "view_profile"
    | "select_patient";
  patient_id?: string;
  page?: number;
}

export interface ServicePostbackData {
  action: "select_service" | "add_service" | "remove_service";
  service_type: "blood_test" | "vaccine" | "checkup" | "follow_up";
  booking_id?: string;
}

export interface LocationPostbackData {
  action: "confirm_location" | "edit_location" | "use_saved_location";
  address?: string;
  lat?: number;
  lng?: number;
  patient_id?: string;
}

export type HealthcarePostbackData =
  | BookingPostbackData
  | NavigationPostbackData
  | ServicePostbackData
  | LocationPostbackData;

// Message sending utilities
export interface MessageSendResult {
  status: "ok" | "error";
  error?: string;
  quota?: {
    type: "none" | "limited";
    value?: number;
  };
}

// Webhook validation
export interface LineWebhookBody {
  destination: string;
  events: LineWebhookEvent[];
}
