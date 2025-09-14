Server scaffolding overview

- API route: src/app/api/line/webhook/route.ts
  - Verifies LINE signature (X-Line-Signature) using HMAC-SHA256
  - Iterates message events, updates signup state, replies via Reply API
  - Saves completed users via repository

- Agent flow: src/server/agent/signupFlow.ts
  - Finite-state flow: start -> consent -> name -> phone -> hn -> hospital -> referral -> confirm -> done
  - Thai prompts; supports "ยืนยัน" / "แก้ไข" และ "ยกเลิก"

- Booking flow: src/server/agent/bookingFlow.ts
  - Flow: start -> address -> date_pref -> note -> confirm -> done (simplified for home blood draw)
  - รองรับ LINE Location message (latitude/longitude) และที่อยู่แบบข้อความ
  - บันทึกระหว่างทำลงชีต `BookingSessions`, เมื่อยืนยันค่อย append ไป `Bookings`

- Router: src/server/agent/router.ts
  - ตัดสินเส้นทางระหว่าง signup / booking / assistant (LLM stub)
  - ผู้ใช้ที่ไม่พูดถึงการสมัคร/จอง จะได้ข้อความจากผู้ช่วย พร้อม Quick Replies: เมนู/จองนัด/สมัคร

Planned architecture: Intent + LIFF + General Chat
- Intent Agent: จับเจตนา (สมัคร, จอง, โปรไฟล์, เมนู, ช่วยเหลือ) แล้วตอบ Flex ที่มีปุ่มเปิด LIFF ตาม flow
- General Chat Agent: ตอบคำถามทั่วไป/ความรู้ นอกเหนือจากเจตนาที่รองรับ
- LIFF UI: `/liff` (ดู `src/app/liff/page.tsx`) รองรับ login/getProfile, ส่งข้อความกลับห้องแชต, และแชร์ได้
- การ submit ข้อมูลจาก LIFF → API ฝั่งเซิร์ฟเวอร์ → บันทึกใน Sheets/DB → push สรุปกลับผู้ใช้ผ่าน Messaging API

- LINE client: src/server/line.ts
  - verifyLineSignature(raw, header)
  - replyMessage(replyToken, messages)

- LINE messages: src/server/lineMessages.ts
  - quickReplyMenu(): Quick Replies (เมนู/จองนัด/สมัคร)
  - welcomeFlex(): Flex การ์ดยินดีต้อนรับ + CTA
  - consentConfirm(): Template Confirm สำหรับยินยอม

- Session store: src/server/store/session.ts
  - In-memory Map with 30-min TTL (replace with Redis in production)

- Repository: src/server/repo/users.ts
  - saveUser(): append to data/users.csv
  - Can append to Google Sheets when configured (SHEET_ID + service account)

- Sessions repo: src/server/repo/sessions.ts
  - upsertSignupSession(): stores per-step progress to Sheets or CSV fallback
  - Sheet name: SignupSessions (key=user_id)

- Bookings repo: src/server/repo/bookings.ts
  - appendBooking(): บันทึกการจองที่ยืนยันแล้วลงชีต `Bookings` (booking_date, date_preference, address, lat, lng, note)
  - upsertBookingSession(): เก็บ progress ของการจองลงชีต `BookingSessions` (address, lat, lng, booking_date, date_preference)

Environment variables (required for webhook)
- LINE_CHANNEL_SECRET
- LINE_CHANNEL_ACCESS_TOKEN

Optional for repository (future)
- SHEET_ID + Google service account credentials if using Sheets
  - GOOGLE_SERVICE_ACCOUNT_EMAIL
  - GOOGLE_PRIVATE_KEY (use \n for newlines), or
  - GOOGLE_CREDENTIALS_JSON (JSON string or file path), or
  - GOOGLE_APPLICATION_CREDENTIALS (file path)
- GEOCODING_API_KEY (optional; fallback to NEXT_PUBLIC_GOOGLE_MAPS_API_KEY) for server geocoding of text addresses

Frontend (LIFF)
- NEXT_PUBLIC_LIFF_ID: ใช้เปิดผ่าน `https://liff.line.me/<LIFF_ID>` หรือแนบเป็น query `?liffId=...`
- Endpoint URL ของ LIFF ควรชี้ไปยัง `https://<domain>/liff`

Security notes (LIFF)
- ตรวจสอบ LIFF ID token ฝั่งเซิร์ฟเวอร์ก่อนผูกข้อมูลกับผู้ใช้ (อย่ารับ userId จาก client ตรง ๆ)
- จำกัดขอบเขตข้อมูลส่วนบุคคลและบันทึกเฉพาะที่จำเป็น พร้อมเก็บ consent ในขั้นตอนสมัคร

Notes
- LINE requires replying within a short time window → keep processing lightweight
- For heavier steps, reply ACK then push later
 - ใช้ idempotency โดยจำ `lastEventId` ต่อผู้ใช้เพื่อกัน duplicate บน retry
 - รองรับ events: message (text/location), postback, follow (ส่ง Welcome Flex)

Commands
- "สมัคร" เริ่มสมัครสมาชิก, "จองนัด" เริ่มจอง, "เมนู" กลับเมนู

Signup data model (Sheets)
- Users sheet headers: created_at, line_user_id, name, phone, hn, hospital, referral, consent, source
- SignupSessions headers: user_id, step, consent, name, phone, hn, hospital, referral, last_updated, status

Flow (agent)
- start → consent → name → phone → hn → hospital → referral → confirm → done

Booking data model (Sheets)
- Bookings headers: created_at, user_id, booking_date, date_preference, address, lat, lng, images_url, note, status
- BookingSessions headers: user_id, step, address, lat, lng, booking_date, date_preference, images_url, last_updated, status
