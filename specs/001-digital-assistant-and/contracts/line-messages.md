# LINE Message Contracts

This document defines the LINE-specific message formats and contracts used in the digital assistant platform.

## Rich Menu Structure

### Menu Layout

```json
{
  "size": {
    "width": 2500,
    "height": 1686
  },
  "selected": false,
  "name": "LabMove Main Menu",
  "chatBarText": "เมนูหลัก",
  "areas": [
    {
      "bounds": {
        "x": 0,
        "y": 0,
        "width": 1250,
        "height": 843
      },
      "action": {
        "type": "message",
        "text": "คุยกับผู้ช่วย"
      }
    },
    {
      "bounds": {
        "x": 1250,
        "y": 0,
        "width": 1250,
        "height": 843
      },
      "action": {
        "type": "uri",
        "uri": "https://liff.line.me/{LIFF_ID}?mode=signup"
      }
    },
    {
      "bounds": {
        "x": 0,
        "y": 843,
        "width": 833,
        "height": 843
      },
      "action": {
        "type": "uri",
        "uri": "https://liff.line.me/{LIFF_ID}?mode=booking"
      }
    },
    {
      "bounds": {
        "x": 833,
        "y": 843,
        "width": 834,
        "height": 843
      },
      "action": {
        "type": "postback",
        "data": "{\"action\": \"booking_details\"}"
      }
    },
    {
      "bounds": {
        "x": 1667,
        "y": 843,
        "width": 833,
        "height": 843
      },
      "action": {
        "type": "postback",
        "data": "{\"action\": \"profile_show\"}"
      }
    }
  ]
}
```

## Intent Recognition Patterns

### Thai Text Patterns

```typescript
const INTENT_PATTERNS = {
  // Greeting and help
  greeting: /^(สวัสดี|หวัดดี|ดีครับ|ดีค่ะ|hello|hi)$/i,
  help: /^(ช่วย|help|menu|เมนู|คุยกับผู้ช่วย)$/i,

  // Signup related
  signup: /^(สมัคร|ลงทะเบียน|register|signup)$/i,

  // Booking related
  booking: /^(จอง|นัด|booking|appointment)$/i,

  // Profile related
  profile: /^(โปรไฟล์|ข้อมูล|profile|info)$/i,

  // Location sharing
  location: /^(ที่อยู่|สถานที่|location)$/i,

  // Status inquiry
  status: /^(สถานะ|ตรวจสอบ|status|check)$/i,
};
```

## Flex Message Templates

### Signup Confirmation

```json
{
  "type": "flex",
  "altText": "ยืนยันการลงทะเบียน",
  "contents": {
    "type": "bubble",
    "header": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {
          "type": "text",
          "text": "✅ ลงทะเบียนสำเร็จ",
          "weight": "bold",
          "color": "#1DB446",
          "size": "lg"
        }
      ]
    },
    "body": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {
          "type": "text",
          "text": "ข้อมูลของคุณ",
          "weight": "bold",
          "margin": "md"
        },
        {
          "type": "separator",
          "margin": "md"
        },
        {
          "type": "box",
          "layout": "vertical",
          "margin": "md",
          "contents": [
            {
              "type": "box",
              "layout": "baseline",
              "contents": [
                {
                  "type": "text",
                  "text": "ชื่อ:",
                  "size": "sm",
                  "color": "#555555",
                  "flex": 1
                },
                {
                  "type": "text",
                  "text": "${name}",
                  "wrap": true,
                  "color": "#111111",
                  "size": "sm",
                  "flex": 3
                }
              ]
            },
            {
              "type": "box",
              "layout": "baseline",
              "contents": [
                {
                  "type": "text",
                  "text": "เบอร์:",
                  "size": "sm",
                  "color": "#555555",
                  "flex": 1
                },
                {
                  "type": "text",
                  "text": "${phone}",
                  "wrap": true,
                  "color": "#111111",
                  "size": "sm",
                  "flex": 3
                }
              ]
            }
          ]
        }
      ]
    },
    "footer": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {
          "type": "button",
          "action": {
            "type": "uri",
            "label": "จองนัดเจาะเลือด",
            "uri": "https://liff.line.me/{LIFF_ID}?mode=booking"
          },
          "style": "primary"
        }
      ]
    }
  }
}
```

### Booking Confirmation

```json
{
  "type": "flex",
  "altText": "ยืนยันการจองนัด",
  "contents": {
    "type": "bubble",
    "header": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {
          "type": "text",
          "text": "📅 จองนัดสำเร็จ",
          "weight": "bold",
          "color": "#1DB446",
          "size": "lg"
        },
        {
          "type": "text",
          "text": "รอการยืนยันจากเจ้าหน้าที่",
          "size": "sm",
          "color": "#666666"
        }
      ]
    },
    "body": {
      "type": "box",
      "layout": "vertical",
      "contents": [
        {
          "type": "text",
          "text": "รายละเอียดการจอง",
          "weight": "bold"
        },
        {
          "type": "separator",
          "margin": "md"
        },
        {
          "type": "box",
          "layout": "vertical",
          "margin": "md",
          "contents": [
            {
              "type": "box",
              "layout": "baseline",
              "contents": [
                {
                  "type": "text",
                  "text": "เลขที่:",
                  "size": "sm",
                  "color": "#555555",
                  "flex": 1
                },
                {
                  "type": "text",
                  "text": "${bookingId}",
                  "wrap": true,
                  "color": "#111111",
                  "size": "sm",
                  "flex": 2
                }
              ]
            },
            {
              "type": "box",
              "layout": "baseline",
              "contents": [
                {
                  "type": "text",
                  "text": "ที่อยู่:",
                  "size": "sm",
                  "color": "#555555",
                  "flex": 1
                },
                {
                  "type": "text",
                  "text": "${address}",
                  "wrap": true,
                  "color": "#111111",
                  "size": "sm",
                  "flex": 2
                }
              ]
            },
            {
              "type": "box",
              "layout": "baseline",
              "contents": [
                {
                  "type": "text",
                  "text": "วันที่:",
                  "size": "sm",
                  "color": "#555555",
                  "flex": 1
                },
                {
                  "type": "text",
                  "text": "${dateInfo}",
                  "wrap": true,
                  "color": "#111111",
                  "size": "sm",
                  "flex": 2
                }
              ]
            },
            {
              "type": "box",
              "layout": "baseline",
              "contents": [
                {
                  "type": "text",
                  "text": "สถานะ:",
                  "size": "sm",
                  "color": "#555555",
                  "flex": 1
                },
                {
                  "type": "text",
                  "text": "รอยืนยัน",
                  "wrap": true,
                  "color": "#FF6B35",
                  "size": "sm",
                  "flex": 2,
                  "weight": "bold"
                }
              ]
            }
          ]
        }
      ]
    },
    "footer": {
      "type": "box",
      "layout": "horizontal",
      "spacing": "sm",
      "contents": [
        {
          "type": "button",
          "action": {
            "type": "postback",
            "label": "แก้ไขวัน",
            "data": "{\"action\": \"booking_edit_date\"}"
          },
          "style": "secondary",
          "flex": 1
        },
        {
          "type": "button",
          "action": {
            "type": "postback",
            "label": "แก้ไขที่อยู่",
            "data": "{\"action\": \"booking_edit_address\"}"
          },
          "style": "secondary",
          "flex": 1
        }
      ]
    }
  }
}
```

### Profile Display (Multi-User)

```json
{
  "type": "flex",
  "altText": "โปรไฟล์ของคุณ",
  "contents": {
    "type": "carousel",
    "contents": [
      {
        "type": "bubble",
        "header": {
          "type": "box",
          "layout": "vertical",
          "contents": [
            {
              "type": "text",
              "text": "👤 โปรไฟล์สมาชิก",
              "weight": "bold",
              "size": "lg"
            }
          ]
        },
        "body": {
          "type": "box",
          "layout": "vertical",
          "contents": [
            {
              "type": "text",
              "text": "${name}",
              "weight": "bold",
              "size": "xl"
            },
            {
              "type": "text",
              "text": "📱 ${phone}",
              "size": "sm",
              "color": "#666666"
            },
            {
              "type": "text",
              "text": "🏥 ${hospital}",
              "size": "sm",
              "color": "#666666",
              "margin": "sm"
            }
          ]
        },
        "footer": {
          "type": "box",
          "layout": "vertical",
          "contents": [
            {
              "type": "button",
              "action": {
                "type": "uri",
                "label": "แก้ไขข้อมูล",
                "uri": "https://liff.line.me/{LIFF_ID}?mode=profile_edit&userId=${userId}"
              },
              "style": "primary"
            }
          ]
        }
      }
    ]
  }
}
```

## Postback Action Contracts

### Booking Actions

```typescript
interface BookingDetailsAction {
  action: "booking_details";
  bookingId?: string; // If specific booking, otherwise show all
}

interface BookingEditAction {
  action: "booking_edit";
  bookingId: string;
  field: "date" | "address" | "note";
}

interface BookingCancelAction {
  action: "booking_cancel";
  bookingId: string;
}
```

### Profile Actions

```typescript
interface ProfileShowAction {
  action: "profile_show";
  userId?: string; // For multi-user accounts
}

interface ProfileEditAction {
  action: "profile_edit";
  userId: string;
  field?: "name" | "phone" | "hospital";
}

// Phase 1 booking edit actions supported by server
interface BookingEditDateAction {
  action: "booking_edit_date";
}
interface BookingEditAddressAction {
  action: "booking_edit_address";
}

// Phase 2 (not implemented yet)
// interface BookingCancelAction {
//   action: "booking_cancel";
//   bookingId: string;
// }
```

## Quick Reply Templates

### Main Menu Quick Replies

```json
{
  "type": "text",
  "text": "เลือกสิ่งที่คุณต้องการ:",
  "quickReply": {
    "items": [
      {
        "type": "action",
        "action": { "type": "message", "label": "เมนู", "text": "เมนู" }
      },
      {
        "type": "action",
        "action": { "type": "message", "label": "จองนัด", "text": "จองนัด" }
      },
      {
        "type": "action",
        "action": { "type": "message", "label": "สมัคร", "text": "สมัคร" }
      }
    ]
  }
}
```

## Response Format Standards

### Success Response

```json
{
  "type": "text",
  "text": "✅ ${action_completed_message}",
  "quickReply": {
    "items": [
      {
        "type": "action",
        "action": {
          "type": "message",
          "label": "เมนูหลัก",
          "text": "เมนู"
        }
      }
    ]
  }
}
```

### Error Response

```json
{
  "type": "text",
  "text": "❌ เกิดข้อผิดพลาด: ${error_message}\n\nกรุณาลองใหม่อีกครั้ง หรือติดต่อเจ้าหน้าที่",
  "quickReply": {
    "items": [
      {
        "type": "action",
        "action": {
          "type": "message",
          "label": "ลองใหม่",
          "text": "เมนู"
        }
      }
    ]
  }
}
```

## Message Length Limits

- Text messages: 5,000 characters max
- Alt text for Flex: 400 characters max
- Quick reply label: 20 characters max
- Button label: 20 characters max
- Postback data: 300 characters max

## Localization Support

All message templates support Thai language with proper character encoding (UTF-8). English fallbacks are provided for system messages and error codes.
