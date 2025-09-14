Intents Specification (Draft)

Purpose
- Define user intents handled in LINE chat and how they map to actions (Flex/LIFF/API). Examples are in Thai (primary) with optional English.

Canonical Intents
- menu
  - Triggers: `เมนู`, `menu`
  - Action: send main menu Flex with buttons for signup, booking, chat help

- signup_start
  - Triggers: `สมัคร`, `สมัครสมาชิก`, `sign up`
  - Action: send Flex with `uri: https://liff.line.me/<LIFF_ID>?mode=signup`

- profile_view
  - Triggers: `โปรไฟล์`, `ดูโปรไฟล์`, `profile`
  - Action: send Flex with `uri: https://liff.line.me/<LIFF_ID>?mode=profile`

- booking_start
  - Triggers: `จองนัด`, `นัดตรวจเลือด`, `booking`
  - Action: send Flex with `uri: https://liff.line.me/<LIFF_ID>?mode=booking`

- booking_edit_address
  - Triggers: postback from Flex `booking_edit_address`
  - Action: set booking flow to `address` (router) and prompt for new location (or open LIFF address editor)

- booking_edit_date
  - Triggers: postback from Flex `booking_edit_date`
  - Action: set booking flow to `date_pref` and prompt for date (or open LIFF date editor)

- help
  - Triggers: `ช่วยเหลือ`, `help`
  - Action: send short guidance + main menu Flex; route general questions to the General Chat Agent

Fallback
- Unmatched text → General Chat Agent. Keep response brief and suggest `เมนู` for actions.

Parameters & Context
- When sending LIFF URIs, pass context via query if needed (e.g., `mode=booking&taskId=...`). Avoid sensitive data in query; server should re‑fetch using authenticated user context.

Testing
- Use the LINE MCP server to push a sample Flex with LIFF links, or send `เมนู` to render the main menu Flex.

