LIFF Specs (MVP)

Overview
- Use a single LIFF app (`NEXT_PUBLIC_LIFF_ID`) to open `/liff` with `?mode=<intent>`.
- After login, LIFF obtains an ID token and submits to backend endpoints.
- Server validates the ID token against LINE Login channel ID and resolves `line_user_id`.

Env
- `NEXT_PUBLIC_LIFF_ID`
- `LINE_LOGIN_CHANNEL_ID` (required for token verification)

Endpoints
- POST `/api/liff/signup`
  - Auth: ID token in `Authorization: Bearer <id_token>`
  - Body: `{ name, phone, hn?, hospital?, referral?, consent }`
  - Behavior: validate token → get `sub` → save to `Users` and return `{ ok: true }`

- POST `/api/liff/booking`
  - Auth: ID token in `Authorization: Bearer <id_token>`
  - Body: `{ address, lat?, lng?, datePreference | bookingDate, note? }`
  - Behavior: validate token → get `sub` → append to `Bookings`; optionally reply Flex via Messaging API

Security
- Server must not trust `userId` sent from the client. Always derive from the ID token.
- Enforce origin checks for POST (Next.js `headers().get('origin')`).
- Rate limit by `sub` to avoid abuse; prefer idempotent writes.

Out of Scope (MVP)
- Member selection UI for multiple profiles under one LINE ID (server lists all when showing profile).
  Future: add a `member_id` and let users pick a default.

