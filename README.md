LabMove Dashboard

 A Next.js dashboard to manage field sample collection tasks with a lightweight map, mock data, and simple assignment flow. Includes an optional LINE webhook backend to onboard users via chat, plus a LIFF sample page for structured forms.

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
- Scripts
- License

Overview
- Frontend: Next.js + Tailwind with mock data and Google Maps integration (via vis.gl). Falls back to a canvas map when no API key is provided.
- Admin route view: visualize a selected officer’s route across assigned tasks for the filtered day.
- Backend scaffold: a minimal Next.js API route for LINE webhook with a tiny signup flow and CSV persistence (ready to swap for Google Sheets/DB).

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

# LINE webhook (optional server)
LINE_CHANNEL_SECRET=
LINE_CHANNEL_ACCESS_TOKEN=

# LIFF (optional)
NEXT_PUBLIC_LIFF_ID=
```
Notes
- Without `NEXT_PUBLIC_GOOGLE_MAPS_API_KEY`, the app renders a fallback canvas map (no ETA/Directions).
- Without Map ID, the app uses default markers and local JSON map styles.

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
- Flow: simple finite-state signup (name → phone → address → confirm) with Thai prompts.
- Storage: appends rows to `data/users.csv` (created automatically). Replaceable with Google Sheets/DB.
- See `src/server/README-agents.md` for details and environment variables.

Agents & Specs
- See `AGENTS.md` for operating rules and architecture (Intent Agent + General Chat + LIFF).
- Intents and Flex templates are drafted in `docs/INTENTS.md` and `docs/FLEX_CATALOG.md`.
- LIFF flow notes in `docs/LIFF_FLOWS.md`.

Scripts
- `pnpm dev` – run the app in development
- `pnpm build` – build for production
- `pnpm start` – start production server
- `pnpm lint` – run ESLint

License
Private
