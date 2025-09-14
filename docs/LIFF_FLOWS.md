LIFF Flows (Draft)

Entry
- LIFF URL: `https://liff.line.me/<LIFF_ID>` (recommended)
- Endpoint URL: `https://<domain>/liff` (configured in LINE console). Our sample UI lives here and supports query `mode`.
- Env: `NEXT_PUBLIC_LIFF_ID` for the web app; pass `?liffId=` in dev when needed.

Modes
- `mode=signup`: render signup form; read `liff.getProfile()` for context; submit to backend
- `mode=booking`: booking form (address, lat/lng via location picker or text, date preference)
- `mode=profile`: show stored user profile/registrations

Backend Endpoints (proposed)
- `POST /api/liff/signup` → validate LIFF ID token → upsert user → push confirmation Flex
- `POST /api/liff/booking` → validate token → upsert booking session or create booking → push summary Flex

Security
- Validate LIFF ID token server‑side and extract the LINE `sub`/userId. Do not accept userId from client.
- CSRF: check `Origin/Referer` and consider short‑lived anti‑replay tokens for actions.
- PII: store only necessary fields; record consent.

Messaging
- After a successful submit, server may call Messaging API `push` to send a summary Flex and a `เมนู` quick reply.

Testing
- Open via LIFF URL in the LINE app to enable `sendMessages`/`closeWindow`.
- In external browsers, enable auto‑login or show a Login button; features limited (no send/close).

