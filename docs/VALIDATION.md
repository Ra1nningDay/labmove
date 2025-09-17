Validation & Schemas (Zod)

Scope
- Runtime validation for untrusted inputs: LIFF endpoints, LINE webhook, Geocode queries.
- Deterministic, strict schemas for LIFF and webhook; geocode is passthrough-friendly.

Locations
- src/server/validation/common.ts — shared validators and error formatter.
- src/server/validation/liff.ts — SignupPayloadSchema, BookingPayloadSchema (strict).
- src/server/validation/line.ts — LineWebhookSchema (strict for supported events).
- src/server/validation/geocode.ts — GeocodeQuerySchema (passthrough).
- src/server/validation/index.ts — re-exports.

Policies
- LIFF and Webhook: `.strict()` to reject unknown fields and shape drift.
- Geocode: `.passthrough()` to tolerate vendor extras.
- Error responses: 400 with `{ error: 'VALIDATION_FAILED' | 'VALIDATION_ERROR', details: { field_errors: [{ field, message }] } }`.
- No PII in messages or logs. Keep details concise and internal-facing.

Testing
- Contract tests in `tests/contract/` should cover happy and failure paths.
- Add tests when schemas change or new inputs are introduced.

Notes
- LIFF ID tokens are validated in `src/server/lib/liffAuth.ts` after schema parse; never trust client `userId`.
- Unknown intents in webhook still route to General Chat; schema only ensures payload safety.

