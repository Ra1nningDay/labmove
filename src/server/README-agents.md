Server scaffolding overview

- API route: src/app/api/line/webhook/route.ts
  - Verifies LINE signature (X-Line-Signature) using HMAC-SHA256
  - Iterates message events, updates signup state, replies via Reply API
  - Saves completed users via repository

- Agent flow: src/server/agent/signupFlow.ts
  - Simple finite-state flow: start -> name -> phone -> address -> confirm -> done
  - Thai prompts; supports "ยืนยัน" / "แก้ไข" and "ยกเลิก"

- LINE client: src/server/line.ts
  - verifyLineSignature(raw, header)
  - replyMessage(replyToken, messages)

- Session store: src/server/store/session.ts
  - In-memory Map with 30-min TTL (replace with Redis in production)

- Repository: src/server/repo/users.ts
  - saveUser(): append to data/users.csv
  - Replace with Google Sheets/DB adapter later

Environment variables (required for webhook)
- LINE_CHANNEL_SECRET
- LINE_CHANNEL_ACCESS_TOKEN

Optional for repository (future)
- SHEET_ID + Google service account credentials if using Sheets

Notes
- LINE requires replying within a short time window → keep processing lightweight
- For heavier steps, reply ACK then push later

