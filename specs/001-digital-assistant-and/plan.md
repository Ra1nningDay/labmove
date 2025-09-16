# Implementation Plan: Digital Assistant and Operations Platform for At-Home Blood Test Services

**Branch**: `master` | **Date**: September 16, 2025 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-digital-assistant-and/spec.md`

## Execution Flow (/plan command scope)

```
1. Load feature spec from Input path ✓
   → Feature spec loaded and analyzed
2. Fill Technical Context ✓
   → Project Type: web (frontend+backend)
   → Structure Decision: Option 2 (Web application)
3. Evaluate Constitution Check section below ✓
   → Initial evaluation completed
   → Update Progress Tracking: Initial Constitution Check
4. Execute Phase 0 → research.md ✓
   → All NEEDS CLARIFICATION resolved with technical context
5. Execute Phase 1 → contracts, data-model.md, quickstart.md ✓
6. Re-evaluate Constitution Check section ✓
   → Update Progress Tracking: Post-Design Constitution Check
7. Plan Phase 2 → Describe task generation approach (DO NOT create tasks.md) ✓
8. STOP - Ready for /tasks command ✓
```

**IMPORTANT**: The /plan command STOPS at step 7. Phases 2-4 are executed by other commands:

- Phase 2: /tasks command creates tasks.md
- Phase 3-4: Implementation execution (manual or via tools)

## Summary

Primary requirement: Digital assistant and operations platform for at-home blood test services with chat interface for patients and admin dashboard for staff coordination. Technical approach uses Next.js + Tailwind frontend with LINE Messaging API integration, LIFF apps for structured data entry, and Google Sheets/CSV for persistence with Redis caching layer.

## Technical Context

**Language/Version**: TypeScript with Next.js 14+, Node.js 18+  
**Primary Dependencies**: Next.js, Tailwind CSS, LINE Messaging API SDK, TanStack Query, Zustand, Google Sheets API, Redis  
**Storage**: Google Sheets (primary) with CSV fallback, Redis for caching and idempotency  
**Testing**: Jest, React Testing Library, Playwright for E2E  
**Target Platform**: Web application (responsive), LINE LIFF integration  
**Project Type**: web - determines source structure (frontend + backend)  
**Performance Goals**: LIFF submissions < 1.5s p95, webhook processing < 2s p95, 99.9% monthly availability  
**Constraints**: LIFF token validation required, no long forms in chat, structured entry points only, PII minimization  
**Scale/Scope**: Small to medium healthcare service operation, ~1000 patients, real-time task coordination

**Architecture Specifics** (from user input):

- Next.js + Tailwind with LINE Message API for chat flows
- Structured tasks (signup, booking) go through LIFF; profile via Flex postback
- Tasks and officers live in mock/Zustand state only
- ETA calculations client-side inside MapCanvas
- Idempotency is in-memory for now
- Sentry for monitoring
- Redis for webhook idempotency keys + rate limiting + geocode cache
- TanStack Query only for confirmed bookings API

## Constitution Check

_GATE: Must pass before Phase 0 research. Re-check after Phase 1 design._

**Simplicity**: ✓ PASS

- Projects: 2 (Next.js app with API routes, minimal additional services)
- Using framework directly: Yes (Next.js API routes, no custom wrapper)
- Single data model: Yes (unified entities across client/server)
- Avoiding patterns: Yes (direct state management, no unnecessary abstractions)

**Architecture**: ✓ PASS (with adaptation for web app)

- Feature libraries: Client components, server utilities, shared types
- CLI equivalence: API endpoints serve as programmatic interface
- Library modularity: Components, services, and utilities properly separated
- Documentation: Planned in llms.txt format

**Testing (NON-NEGOTIABLE)**: ✓ PASS

- RED-GREEN-Refactor cycle: Enforced through contract tests first
- Git commits: Tests before implementation required
- Order: Contract→Integration→E2E→Unit strictly followed
- Real dependencies: Actual Google Sheets, Redis, LINE API for integration tests
- Integration tests for: New API contracts, LIFF token validation, LINE webhook processing

**Observability**: ✓ PASS

- Structured logging: Sentry integration with PII scrubbing
- Frontend logs → backend: Unified error reporting through Sentry
- Error context: Full stack traces with request IDs

**Versioning**: ✓ PASS

- Version number: Following semantic versioning
- BUILD increments: On every deployment
- Breaking changes: API versioning strategy for contracts

## Project Structure

### Documentation (this feature)

```
specs/001-digital-assistant-and/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (/plan command)
├── data-model.md        # Phase 1 output (/plan command)
├── quickstart.md        # Phase 1 output (/plan command)
├── contracts/           # Phase 1 output (/plan command)
└── tasks.md             # Phase 2 output (/tasks command - NOT created by /plan)
```

### Source Code (repository root)

```
# Option 2: Web application (frontend + backend detected)
src/
├── app/                 # Next.js App Router
│   ├── api/            # API routes (webhook, LIFF endpoints)
│   ├── liff/           # LIFF pages
│   └── page.tsx        # Admin dashboard
├── components/         # Reusable UI components
│   ├── ui/            # Base UI components
│   ├── liff/          # LIFF-specific components
│   └── map/           # Map-related components
├── server/            # Server-side utilities
│   ├── agent/         # Intent routing and chat agents
│   ├── lib/           # Server utilities
│   ├── repo/          # Data access layer
│   └── types/         # Shared types
├── lib/               # Client-side utilities
└── store/             # Zustand stores

tests/
├── contract/          # API contract tests
├── integration/       # Integration tests
└── e2e/              # End-to-end tests
```

**Structure Decision**: Option 2 (Web application) - matches current Next.js + API architecture

## Phase 0: Outline & Research

_Prerequisites: Technical Context filled_

### Research Findings

**LINE Integration Patterns**:

- Decision: LIFF apps for structured data entry, Flex messages for quick actions
- Rationale: Avoids long form conversations while maintaining chat UX
- Implementation: LIFF ID token validation on server, postback routing

**State Management Strategy**:

- Decision: TanStack Query for server state, Zustand for UI state
- Rationale: Clear separation of concerns, proper cache invalidation
- Implementation: Server state only in Query, ephemeral UI state in Zustand

**Data Persistence Approach**:

- Decision: Google Sheets primary with CSV fallback
- Rationale: Easy admin access, simple backup/export, no complex DB setup
- Implementation: Service account integration with read-through Redis cache

**Authentication & Security**:

- Decision: LIFF ID token validation for user auth, no separate login
- Rationale: Seamless LINE integration, reduced friction
- Implementation: Server-side token validation against LINE Login channel

**Real-time Coordination**:

- Decision: Client-side calculations with server persistence
- Rationale: Responsive UI, reduced server load
- Implementation: MapCanvas handles ETA, server tracks assignments

All technical unknowns resolved through existing codebase analysis and LINE platform documentation.

**Output**: ✓ All NEEDS CLARIFICATION resolved

## Phase 1: Design & Contracts

_Prerequisites: research.md complete_

### Data Model Entities

From feature specification analysis:

**Core Entities**:

- Patient: LINE user with profile and consent data
- Officer: Field staff with location and availability
- Booking: Appointment request with status lifecycle
- Task: Operational unit for admin coordination
- Location: Geographic data with geocoding

**Relationships**:

- Patient 1:N Bookings
- Officer 1:N Tasks
- Booking 1:1 Task (when confirmed)
- Location embedded in Patient, Officer, Booking

### API Contracts

**LIFF Endpoints**:

- `POST /api/liff/signup` - Patient registration
- `POST /api/liff/booking` - Appointment booking
- Authorization: Bearer LIFF_ID_TOKEN

**LINE Integration**:

- `POST /api/line/webhook` - Message and postback handling
- Idempotent by message ID

**Admin Operations**:

- `GET /api/bookings?status=confirmed` - Map data
- `POST /api/admin/bookings/:id/confirm` - Status transitions

### Test Scenarios

From user stories:

1. Patient signup flow validation
2. Booking creation and confirmation
3. Officer assignment workflow
4. Map visualization with real data
5. Error handling and edge cases

All contracts generate failing tests before implementation.

**Output**: ✓ data-model.md, contracts/, quickstart.md, failing tests generated

## Phase 2: Task Planning Approach

_This section describes what the /tasks command will do - DO NOT execute during /plan_

**Task Generation Strategy**:

- Load existing codebase context from current implementation
- Generate incremental tasks building on current Next.js structure
- Each API contract → contract test task [P]
- Each LIFF page → component and integration test task [P]
- Each server utility → unit test task [P]
- LINE webhook integration → integration test task
- Admin dashboard enhancements → E2E test task

**Ordering Strategy**:

- TDD order: Contract tests → Component tests → Implementation
- Dependency order: Shared types → Server utilities → API routes → Client components
- Integration points: LINE webhook → LIFF validation → Admin dashboard
- Mark [P] for parallel execution (independent modules)

**Current Code Integration**:

- Extend existing component structure in `src/components/`
- Enhance current API routes in `src/app/api/`
- Build on established patterns in `src/server/`
- Leverage existing Zustand stores and UI components

**Estimated Output**: 20-25 numbered, ordered tasks aligned with existing codebase

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation

_These phases are beyond the scope of the /plan command_

**Phase 3**: Task execution (/tasks command creates tasks.md)  
**Phase 4**: Implementation (execute tasks.md following constitutional principles)  
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation)

## Complexity Tracking

_No constitutional violations identified_

| Violation | Why Needed | Simpler Alternative Rejected Because |
| --------- | ---------- | ------------------------------------ |
| None      | -          | -                                    |

## Progress Tracking

_This checklist is updated during execution flow_

**Phase Status**:

- [x] Phase 0: Research complete (/plan command)
- [x] Phase 1: Design complete (/plan command)
- [x] Phase 2: Task planning complete (/plan command - describe approach only)
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:

- [x] Initial Constitution Check: PASS
- [x] Post-Design Constitution Check: PASS
- [x] All NEEDS CLARIFICATION resolved
- [x] Complexity deviations documented (none)

---

_Based on Constitution v2.1.1 - See `/memory/constitution.md`_
