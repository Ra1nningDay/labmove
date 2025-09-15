LabMove

A Next.js dashboard to manage home blood-draw bookings and field sample
collection. Includes an operator/admin UI with a lightweight map and an optional
LINE backend (webhook + LIFF) for onboarding and structured submissions.

Table of Contents
- Overview
- Features
- Tech Stack
- Project Structure
- Getting Started
- Environment Variables
- Development with a Tunnel (LINE Webhook)
- LIFF
- Map Behavior
- Server (LINE Onboarding)
- Agent Operating Guide
- Frontend Agent Spec
- Scripts
- License

Overview
- Frontend: Next.js + Tailwind with mock data and Google Maps integration (via vis.gl). Falls back to a canvas map when no API key is provided.
- Admin route view: visualize a selected officer’s route across assigned tasks for the filtered day.
- Backend scaffold: a minimal Next.js API route for LINE webhook with basic signup/booking flows and CSV/Google Sheets persistence.

Features
- Tasks and officers list with filters (text, date, status)
- Map with markers and optional Directions/ETA when Google Maps API is available
- Assignment drawer and officer list; assign task → status transitions
- Add Task and Add Officer dialogs
- Admin Route Mode
  - Select an officer and draw a single route through that officer’s tasks for the chosen date
  - Hide unrelated markers during route mode
  - Bottom-center route banner with cancel and ESC shortcut
  - ETA list hidden in route mode; shows in task-focused mode
- Safe Directions handling: clears DirectionsRenderer without passing null (prevents InvalidValueError)
- Fallback canvas map when no Google key is set

Tech Stack
- Next.js (App Router, TypeScript)
- Tailwind CSS
- @vis.gl/react-google-maps (optional)
- lucide-react

Project Structure
```text
src/
  app/
    layout.tsx
    page.tsx
    api/line/webhook/route.ts      # LINE webhook (optional server)
  components/
    GoogleMapsProvider.tsx
    add/
      AddTaskDialog.tsx
      AddOfficerDialog.tsx
    map/
      ControlsOverlay.tsx
      LegendOverlay.tsx
      EtaPanel.tsx
      SelectedTaskOverlay.tsx
      RouteBanner.tsx
      FallbackCanvas.tsx
    MapCanvas.tsx
    AssignmentDrawer.tsx
    Filters.tsx
    TaskList.tsx
    OfficerList.tsx
    ui/*
  lib/
    types.ts
    utils.ts
    mock.ts
    mapStyles.ts
    homeVisit.ts (optional mock reader)
  store/
    tasks.tsx
    officers.tsx
    providers.tsx
  server/                           # Server scaffold for LINE
    line.ts
    agent/signupFlow.ts
    store/session.ts
    repo/users.ts
    types/line.ts
    README-agents.md
  app/liff/page.tsx                 # LIFF sample UI (login/profile/send/share)
```

Getting Started
- Node.js 18+
- Install and run
```bash
pnpm install
pnpm dev
# pnpm build && pnpm start for production
```

Environment Variables
Put these in `.env` as needed.
```dotenv
# Frontend – Google Maps (optional)
NEXT_PUBLIC_GOOGLE_MAPS_API_KEY=
NEXT_PUBLIC_GOOGLE_MAP_ID=
NEXT_PUBLIC_GOOGLE_MAP_ID_MINIMAL=
NEXT_PUBLIC_GOOGLE_MAP_ID_CLEAN=
NEXT_PUBLIC_GOOGLE_MAP_ID_DARK=

# LINE Webhook (Messaging API)
LINE_CHANNEL_SECRET=
LINE_CHANNEL_ACCESS_TOKEN=

# LINE Login / LIFF token verification
LINE_LOGIN_CHANNEL_ID=

# LIFF (client)
NEXT_PUBLIC_LIFF_ID=

# Google Sheets (optional persistence)
SHEET_ID=
GOOGLE_SERVICE_ACCOUNT_EMAIL=
GOOGLE_PRIVATE_KEY=
# or GOOGLE_CREDENTIALS_JSON / GOOGLE_APPLICATION_CREDENTIALS

# Dev origin allowlist for LIFF/API (optional)
ALLOW_ORIGINS=
ALLOW_ALL_ORIGINS=false
```
Notes
- Without `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, the app renders a fallback canvas map (no ETA/Directions).
- Without Map ID, the app uses default markers and local JSON map styles.
- If Google Sheets is not configured, CSV files are used under `data/`.

Development with a Tunnel (LINE Webhook)
- Expose your dev server to the internet using Cloudflare Tunnel or Ngrok.
- Example (Cloudflare):
  - Run Next.js: `npm run dev`
  - Tunnel: `cloudflared tunnel --url http://localhost:3000`
- Set Webhook URL in LINE Console to: `https://<your-domain>/api/line/webhook`
- Optional: if you open the web UI via the tunnel and load /_next/* assets, you may add `allowedDevOrigins` in `next.config` for your tunnel domain.

LIFF
- Endpoint URL (LINE console): `https://<your-domain>/liff`
- LIFF URL to share in chat: `https://liff.line.me/<LIFF_ID>`
- Dev tip: you can also open `https://<your-domain>/liff?liffId=<LIFF_ID>`
- When opened inside the LINE app, the sample page supports `getProfile`, `sendMessages`, `shareTargetPicker`, and `closeWindow`.

Map Behavior
- Task-focused mode: clicking markers selects tasks; ETA panel suggests officers (Distance Matrix when available).
- Admin route mode: choose an officer and draw a multi-stop route across that officer’s tasks for the filtered day; unrelated markers are hidden.
- Directions safety: the map clears directions with an empty result instead of null.

Server (LINE Onboarding)
- Endpoint: `src/app/api/line/webhook/route.ts`
- Flow: simple finite-state onboarding (signup/booking). Thai prompts in examples.
- Storage: appends rows to CSV under `data/` or Google Sheets when configured.
- See `src/server/README-agents.md` for details and environment variables.

Agent Operating Guide
- Architecture (Two-Agent Split)
  - Intent Agent: routes user intents (menu, signup, booking, profile, help, edit, location). Prefer Flex responses with LIFF links for structured tasks.
  - General Chat Agent: handles open-ended questions and company info (may use external ADK/KB).
  - LIFF apps: host structured forms (signup, booking, profile). On submit, call backend APIs and optionally push a confirmation summary.
- Rich Menu (MVP)
  - Chat with assistant → send text `คุยกับผู้ช่วย` → General Chat Agent
  - Signup → open LIFF `?mode=signup`
  - Book blood draw → open LIFF `?mode=booking`
  - Appointment details → postback `{ action: "booking_details" }` → server replies Flex summary
  - Profile → postback `{ action: "profile_show" }` → server replies Flex list
- Decision Policy
  - Recognize Thai/English intents (menu, signup, booking, profile, help, edit, location).
  - For recognized intents, respond with Flex templates that include a LIFF link `https://liff.line.me/<LIFF_ID>?mode=<intent>&params=...`.
  - For unrecognized/general queries, hand off to the General Chat Agent.
  - Keep replies short; suggest the main menu when relevant.
- LIFF Submission Contracts
  - Validate LIFF ID token using LINE Login channel ID; map to `line_user_id`.
  - Persist minimal fields; support multiple users per LINE ID (family accounts).
  - Return a concise result and optionally send a Flex confirmation.
- Outputs & Contracts
  - LINE replies must be arrays of messages compliant with `src/server/types/line.ts`.
  - When invoking LIFF, include `altText` and a stable label; keep URIs canonical with the LIFF ID.
- Security & Privacy
  - Never trust `userId` from the client; validate LIFF ID token server‑side.
  - Avoid storing raw ID tokens; store only identifiers and necessary fields.
  - Guard API routes against CSRF (origin checks), rate-limit webhook processing, and prefer idempotent writes.
  - PII: store consent flags, minimize collection, and restrict logs.
- MCP & Tools
  - LINE MCP for operational/admin tasks (push, broadcast, profile, rich menu). Not for LIFF auth.
  - Optional add‑ons: Filesystem, Git, Google Sheets, Google Calendar, Maps, Brave Search, Sentry.
- Code Pointers
  - Webhook: `src/app/api/line/webhook/route.ts`
  - Router: `src/server/agent/router.ts`
  - Messages (Flex/templates): `src/server/lineMessages.ts`
  - Repos: `src/server/repo/*`
  - LIFF UI sample: `src/app/liff/page.tsx`

Frontend Agent Spec (Next.js + Tailwind)
- MVP Goals
  - Show tasks and officers
  - Map: Google Maps (if API key) with fallback canvas
  - Distance via Haversine, and optional Google Distance Matrix
  - Status badges and assignment/status updates
  - Search/filter by name, address, date, status
  - Mock data: Add Task, Add Officer dialogs
  - Admin Route Mode
- Data Types
```ts
export type TaskStatus = "pending" | "assigned" | "in_progress" | "done" | "issue";
export type Task = {
  id: string;
  patientName: string;
  address: string;
  coords: { lat: number; lng: number };
  date: string; // YYYY-MM-DD
  tests: string[];
  status: TaskStatus;
  assignedTo?: string;
};
export type Officer = {
  id: string;
  name: string;
  phone: string;
  zoneLabel: string;
  base?: { lat: number; lng: number };
};
```
- Status Badge Mapping
  - pending → amber (Pending)
  - assigned → blue (Assigned)
  - in_progress → indigo (In Progress)
  - done → emerald (Done)
  - issue → rose (Issue)
- Components
  - Dashboard: filters + task list + officer list + map
  - MapCanvas: lightweight markers and route overlays
  - Assignment UI: assign, unassign, update status
  - Optional: framer‑motion animations
- App Router File Layout
```text
src/
  app/page.tsx
  components/
    MapCanvas.tsx
    StatusBadge.tsx
    TaskList.tsx
    OfficerList.tsx
    AssignmentDrawer.tsx
    Filters.tsx
    add/
      AddTaskDialog.tsx
      AddOfficerDialog.tsx
  lib/
    types.ts
    utils.ts
    mock.ts
  store/
    tasks.tsx
    officers.tsx
```
- Acceptance Criteria
  - Dashboard has task list, officer list, and map
  - Filter/search works
  - Can assign/update task status
  - Admin Route Mode renders officer route
  - No real API dependency (mock only)
- Roadmap (Post‑MVP)
  - Backend/API integration (REST/GraphQL)
  - Auth & permissions
  - Real‑time updates (WebSocket)
  - Server‑side routing optimization
  - Data persistence (DB)
  - i18n


Scripts
- `pnpm dev` – run the app in development
- `pnpm build` – build for production
- `pnpm start` – start production server
- `pnpm lint` – run ESLint

License
Private
