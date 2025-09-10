Server scaffolding overview

- API route: src/app/api/line/webhook/route.ts
  - Verifies LINE signature (X-Line-Signature) using HMAC-SHA256
  - Iterates message events, updates signup state, replies via Reply API
  - Saves completed users via repository

- Agent flow: src/server/agent/signupFlow.ts
  - Finite-state flow: start -> consent -> name -> phone -> hn -> hospital -> referral -> confirm -> done
  - Thai prompts; supports "ยืนยัน" / "แก้ไข" และ "ยกเลิก"

- LINE client: src/server/line.ts
  - verifyLineSignature(raw, header)
  - replyMessage(replyToken, messages)

- Session store: src/server/store/session.ts
  - In-memory Map with 30-min TTL (replace with Redis in production)

- Repository: src/server/repo/users.ts
  - saveUser(): append to data/users.csv
  - Can append to Google Sheets when configured (SHEET_ID + service account)

- Sessions repo: src/server/repo/sessions.ts
  - upsertSignupSession(): stores per-step progress to Sheets or CSV fallback
  - Sheet name: SignupSessions (key=user_id)

Environment variables (required for webhook)
- LINE_CHANNEL_SECRET
- LINE_CHANNEL_ACCESS_TOKEN

Optional for repository (future)
- SHEET_ID + Google service account credentials if using Sheets
  - GOOGLE_SERVICE_ACCOUNT_EMAIL
  - GOOGLE_PRIVATE_KEY (use \n for newlines), or
  - GOOGLE_CREDENTIALS_JSON (JSON string or file path), or
  - GOOGLE_APPLICATION_CREDENTIALS (file path)

Notes
- LINE requires replying within a short time window → keep processing lightweight
- For heavier steps, reply ACK then push later

Signup data model (Sheets)
- Users sheet headers: created_at, line_user_id, name, phone, hn, hospital, referral, consent, source
- SignupSessions headers: user_id, step, consent, name, phone, hn, hospital, referral, last_updated, status

Flow (agent)
- start → consent → name → phone → hn → hospital → referral → confirm → done
