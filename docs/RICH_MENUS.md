# Rich Menu — Labmove (MVP)

- One canonical rich menu with alias `menu` only (no auto‑switching).
- Artwork: `public/richmenu/richmenu.png` (provide a 2500×1686 PNG as in the mockup).
- Layout matches the provided 5‑tile design:
  - Top row: [Talk to Assistant] spans 2/3 width, [Signup] 1/3 width.
  - Bottom row: three equal tiles [Booking], [Appointment Details], [Profile].

## Commands (LINE MCP/CLI)

- `pnpm richmenu:create-all` — create the `menu` rich menu, upload the PNG, set default, and bind alias.
- `pnpm richmenu:upload` — reupload `public/richmenu/richmenu.png` to the `menu` alias.
- `pnpm richmenu:list` — list menus and aliases.
- `pnpm richmenu:set-default menu` — set default rich menu.
- `pnpm richmenu:delete-others` — delete all menus except the `menu` alias target.
- `pnpm richmenu:delete-all` — delete everything (use with care).

Requires env:
- `LINE_CHANNEL_ACCESS_TOKEN` (Messaging API token)
- `NEXT_PUBLIC_LIFF_ID` (LIFF ID used for `uri` actions)

## Touch Areas (pixel grid 2500×1686)

Coordinates are integers; small off‑by‑one seams are fine. Heights are 843px per row. Columns are 833 / 834 / 833.

1) พูดคุยกับผู้ช่วย — message action
- Rect: x=0, y=0, w=1666, h=843
- Action: send message text `คุยกับผู้ช่วย` (routes to General Chat Agent)

2) สมัครสมาชิก — LIFF
- Rect: x=1666, y=0, w=834, h=843
- Action: `uri: https://liff.line.me/<LIFF_ID>?mode=signup`

3) จองนัดเจาะเลือด — LIFF
- Rect: x=0, y=843, w=833, h=843
- Action: `uri: https://liff.line.me/<LIFF_ID>?mode=booking`

4) รายละเอียดนัด — postback
- Rect: x=833, y=843, w=834, h=843
- Action: `postback: { action: "booking_details" }`
- Server: replies Flex summary of the latest booking/session for the user

5) โปรไฟล์ — postback
- Rect: x=1667, y=843, w=833, h=843
- Action: `postback: { action: "profile_show" }`
- Server: replies Flex profile list for all members registered under this LINE ID

## Behavior Contracts

- Message replies must conform to `src/server/types/line.ts`.
- Postbacks above are handled in `src/app/api/line/webhook/route.ts`.
- For LIFF flows:
  - The web UIs live under `/liff` and submit to server POST endpoints.
  - Endpoints validate LIFF ID token → resolve `line_user_id`.
  - Server persists to `Users` and `Bookings` repositories (Sheets/CSV).

## Notes

- Keep URIs canonical: `https://liff.line.me/<LIFF_ID>?mode=<intent>`.
- Multi‑member profiles: allow multiple `Users` rows per LINE ID; profile Flex lists them.
- When intents or tiles change, update both this document and the CLI script.
