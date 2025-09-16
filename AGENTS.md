Agent Operating Guide

Scope
- This guide applies to the entire repository. Follow these rules whenever adding or modifying agent logic, MCP usage, Flex templates, or server flows.

Current Architecture (Last reviewed: 2025-09-16)
- `src/app/api/line/webhook/route.ts` routes LINE events into `src/server/agent/router.ts`.
- `handleChat` orchestrates both the scripted flows and the general chat hand-off. It keeps progress in `src/server/store/session.ts` and repositories under `src/server/repo/*`.
- `detectIntent` maps Thai/English phrases into intents (`menu`, `signup`, `booking`, `profile`, `booking_details`, `edit_*`, `help`). Keep patterns deterministic and prefer test coverage over heuristics.
- When an intent is recognized and `NEXT_PUBLIC_LIFF_ID` is configured, respond with Flex bubbles from `openLiffPromptFlex` that deeplink into LIFF. Without a LIFF ID, fall back to the scripted chat flows implemented in `signupFlow.ts` and `bookingFlow.ts`.
- The "General Chat" path is currently a text stub that sets `mode: "llm"` in session metadata. Future LLM integration must sit behind this switch and respect privacy constraints below.

Rich Menu & Entry Points (MVP)
- พูดคุยกับผู้ช่วย -> send text `คุยกับผู้ช่วย` -> switches user mode to General Chat (stub today).
- สมัครสมาชิก -> open LIFF `?mode=signup`; fallback keyword `สมัคร` should mirror the same behavior.
- จองนัดเจาะเลือด -> open LIFF `?mode=booking`; fallback keyword `จองนัด` runs scripted booking flow if LIFF unavailable.
- รายละเอียดนัด -> postback `{ action: "booking_details" }` -> respond with `bookingDetailsFlex` (latest booking or session draft).
- โปรไฟล์ -> postback `{ action: "profile_show" }` -> respond with `profileListFlex` for multi-member households.

Routing & Decision Policy
- Always check for ongoing signup/booking progress before starting a new intent so users can resume mid-flow.
- `detectIntent` covers the canonical phrases. Update `tests/contract/line-webhook.test.ts` when adjusting patterns.
- Keep chat replies short, end with a reminder of the menu keywords, and prefer Flex prompts that deep link to LIFF for structured actions.
- Unknown intents default to the General Chat hand-off. Do not trigger LIFF links unless the intent is recognized.

Flex Messaging Patterns
- All replies must match the interfaces in `src/server/types/line.ts`.
- Use helpers from `src/server/lineMessages.ts` (`welcomeFlex`, `openLiffPromptFlex`, `signupSummaryFlex`, `bookingSummaryFlex`, `bookingDetailsFlex`, `profileListFlex`). Ensure every Flex bubble sets `altText` and stable labels.
- When adding new templates, document them in `docs/FLEX_CATALOG.md` and include quick tests under `tests/contract/` if the structure is critical.

LIFF & Server Contracts
- Validate LIFF ID tokens server-side via `src/server/lib/liffAuth.ts`; never trust `userId` from the client payload.
- Map tokens to `line_user_id` and persist minimal data through repositories in `src/server/repo/*`.
- Current LIFF APIs implemented (Phase 3.4 status 60%):
  - `POST /api/liff/signup` ✅
  - `POST /api/liff/booking` ✅
  - `POST /api/line/webhook` ✅ (chat routing + Flex responses)
  - `GET/POST /api/geocode` ✅
  - Admin booking confirm endpoint ⏳ pending (T012/T027)

Project Status & Priorities (see `specs/001-digital-assistant-and/tasks.md`)
- Phases 3.1-3.3 are mostly complete; contract suites exist for LIFF, webhook, geocode. Admin confirm contract test (T012) still outstanding.
- Integration suites for LIFF auth, Google Sheets, Redis, and webhook idempotency (T013-T016) remain TODO. Backfilling them is the next priority before shipping new flows.
- Frontend Phase 3.5 work (enhanced LIFF forms, admin dashboard, TanStack Query wiring) has not started.
- Keep AGENTS.md in sync when intents, entry points, or the router behavior changes.

Security & Privacy
- Validate origin for LIFF submissions and guard against CSRF on web routes.
- Avoid storing raw ID tokens; persist only identifiers and consent flags. Repositories should remain idempotent.
- Rate-limit webhook processing and handle retries using Redis-backed idempotency keys (planned tests T016).
- Strip PII from logs and never echo personal details in admin tools without consent tracking.

MCP & Operational Tools
- LINE MCP handles operational messaging (push/broadcast/profile/rich menu). Do not use it for LIFF auth or user identity.
- Optional local add-ons: Filesystem, Git, Google Sheets, Google Calendar, Maps, Brave Search, Sentry. Configure per machine, never commit credentials.

Style & Practices
- Keep flows deterministic; session state lives only in repositories or the session store.
- Favor small, focused changes and reuse helpers instead of branching ad-hoc logic.
- Extend TypeScript types first, write or update relevant tests, then adjust implementations.
- Update docs in `docs/*.md` whenever you change intents, Flex layouts, LIFF endpoints, or admin flows.
