Agent Operating Guide

Scope
- This file applies to the entire repository. Follow these rules whenever adding or modifying agent logic, MCP usage, or server flows.

Architecture (Planned)
- Two-agent split:
  - Intent Agent: routes user requests in LINE to concrete actions. Prefer sending Flex with LIFF links for structured tasks (signup, booking, profile) instead of long chat forms.
  - General Chat Agent: handles open‑ended questions (company info, help). May use external knowledge via ADK/KB.
- LIFF apps: web UIs hosted in this project (e.g., /liff) to collect structured data. After submit, call backend APIs and optionally push a summary message to the user.

Rich Menu Entrypoints (MVP)
- พูดคุยกับผู้ช่วย → send text `คุยกับผู้ช่วย` → General Chat Agent
- สมัครสมาชิก → open LIFF `?mode=signup`
- จองนัดเจาะเลือด → open LIFF `?mode=booking`
- รายละเอียดนัด → postback `{ action: "booking_details" }` → server replies Flex summary
- โปรไฟล์ → postback `{ action: "profile_show" }` → server replies Flex profile list (multi‑member)

Decision Policy (Intent Agent)
- Recognize intents from Thai/English patterns: menu, signup, booking, profile, help, edit (address/date), and location posts.
- For recognized intents → respond with Flex templates that include a button `uri: https://liff.line.me/<LIFF_ID>?mode=<intent>&params=...`.
- For unrecognized or general queries → hand off to General Chat Agent.
- Keep chat replies short, always suggest the main menu when relevant.

LIFF Submission Contracts (Server)
- Validate LIFF ID token using LINE Login channel ID; map to `line_user_id`.
- Persist minimal fields. Support multiple users per LINE ID (family accounts).
- Return a concise result and optionally send Flex confirmation to chat.

Outputs & Contracts
- LINE replies must be arrays of messages compliant with `src/server/types/line.ts`.
- When invoking LIFF, include `altText` and a stable label. Keep URIs canonical with the LIFF ID.
- Backend endpoints that receive LIFF submissions must validate the LIFF ID token and map the user to `line_user_id`.

Security & Privacy
- Never trust a `userId` coming from the client. Validate LIFF ID token server‑side and extract the subject.
- Avoid storing raw ID tokens; keep only user identifiers and necessary fields.
- Guard API routes against CSRF (origin checks), rate limit webhook processing, and prefer idempotent writes.
- PII: store consent flags, minimize collection, and restrict logs.

MCP & Tools
- LINE MCP: used for operational messaging and admin tasks (push/broadcast/profile/rich menu). Does not handle LINE Login/LIFF auth.
- Recommended add‑ons (optional): Filesystem, Git, Google Sheets, Google Calendar, Maps, Brave Search, Sentry. Configure per‑machine (not committed).

Code Pointers
- Webhook: `src/app/api/line/webhook/route.ts`
- Router: `src/server/agent/router.ts`
- Messages (Flex/templates): `src/server/lineMessages.ts`
- Repos (Sheets/CSV): `src/server/repo/*`
- LIFF UI sample: `src/app/liff/page.tsx`

Style & Practices
- Keep flows deterministic; avoid hidden state outside repositories/session store.
- Small, focused changes; reuse existing helpers. Prefer TypeScript types and narrow tool surfaces.
- Update docs in `docs/*.md` when changing intents, Flex layouts, or LIFF endpoints.
