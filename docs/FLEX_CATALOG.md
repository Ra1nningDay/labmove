Flex Templates Catalog (Draft)

Conventions
- All Flex messages must include `altText` (Thai), concise and user‑friendly.
- Primary actions open LIFF via `uri: https://liff.line.me/<LIFF_ID>?mode=<...>`.

1) Main Menu
- Purpose: quick entry points
- Contents: title, subtitle, buttons
- Actions:
  - `สมัครสมาชิก` → `?mode=signup`
  - `จองนัด` → `?mode=booking`
  - `ดูโปรไฟล์` → `?mode=profile`

2) Signup Summary (in chat)
- Purpose: summarize data collected via LIFF; confirm or edit
- Actions: `ยืนยัน` (postback: signup_confirm), `แก้ไข` (postback: signup_edit)

3) Booking Summary
- Purpose: show address, lat/lng, date preference
- Actions: `ยืนยัน` (postback: booking_confirm), `แก้ไขวัน` (postback: booking_edit_date), `แก้ไขที่อยู่` (postback: booking_edit_address)

4) Booking Details (from rich menu)
- Purpose: show latest booking or in‑progress session
- Source: repository `Bookings` or `BookingSessions`
- Trigger: postback `{ action: "booking_details" }`
- Contents: date preference/booking date, address, lat/lng, note, status

5) Profile List (multi‑member)
- Purpose: list members registered under the same LINE ID
- Trigger: postback `{ action: "profile_show" }`
- Contents: up to 5 recent members with name/phone/HN/hospital
- Future: tap to select a default member (not in MVP)

6) Open LIFF Prompt (simple)
- Purpose: guide users to LIFF when needed
- Action: single `uri` button to the appropriate LIFF mode

Notes
- Keep bubble width friendly for mobile; avoid deep nesting.
- Postbacks should use clear `data` values consumed by `router.ts`.
