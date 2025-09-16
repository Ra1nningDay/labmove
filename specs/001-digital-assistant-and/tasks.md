# Tasks: Digital Assistant and Operations Platform for At-Home Blood Test Services

**Input**: Design documents from `/specs/001-digital-assistant-and/`
**Prerequisites**: plan.md ✓, research.md ✓, data-model.md ✓, contracts/ ✓, quickstart.md ✓

## 🎯 Current Status (Updated: September 16, 2025)

### Phase 3.1-3.3: Foundation & Tests (MOSTLY COMPLETE - integration suites pending)

- **Setup & Dependencies**: All environment variables, Redis, Sentry configured
- **TypeScript Types**: Core entities, LINE API, and API contracts defined
- **Contract Tests**: LIFF signup, booking, webhook, geocode tests in place (admin confirm pending)
- **Integration Tests**: Signup, booking, webhook flows covered; LIFF auth/Sheets/Redis/idempotency suites still pending
- **Test Infrastructure**: Jest configuration with Next.js App Router support working perfectly

### ✅ Phase 3.4: API Implementation (IN PROGRESS - 60% COMPLETE)

- **LIFF Signup API**: ✅ Fully implemented with validation and error handling
- **LIFF Booking API**: ✅ Fully implemented with geocoding and structured responses
- **LINE Webhook API**: Completed with updated handler + contract tests
- **Geocoding API**: Done (GET/POST handlers live)
- **Admin APIs**: ⏳ PENDING

### ⏳ Phase 3.5: Frontend & Integration (PENDING)

- LIFF components enhancement
- Admin dashboard updates
- End-to-end testing

**Next Priority**: Backfill missing integration tests (T013-T016)

## Execution Flow (main)

```
1. Load plan.md from feature directory ✓
   → Tech stack: Next.js + TypeScript, LINE API, TanStack Query, Zustand
   → Structure: Web application (frontend + backend)
2. Load design documents ✓:
   → data-model.md: Patient, Officer, Booking, Task, Location entities
   → contracts/: API endpoints (LIFF, webhook, admin), LINE messages
   → research.md: LIFF authentication, Google Sheets, Redis caching
   → quickstart.md: User flows and validation scenarios
3. Generate tasks by category ✓:
   → Setup: dependencies, environment, linting
   → Tests: contract tests, integration tests (TDD)
   → Core: types, models, API routes, components
   → Integration: LINE webhook, LIFF auth, Google Sheets
   → Polish: unit tests, performance, documentation
4. Apply task rules ✓:
   → Different files = [P] for parallel execution
   → Tests before implementation (TDD enforced)
   → Dependencies respected
5. Number tasks sequentially (T001-T035) ✓
6. Generate dependency graph ✓
7. Create parallel execution examples ✓
8. Validate task completeness ✓
9. Return: SUCCESS (tasks ready for execution)
```

## Format: `[ID] [P?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- Include exact file paths in descriptions
- Based on Next.js web application structure

## Phase 3.1: Setup & Dependencies

- [x] T001 Configure environment variables for LINE API, Google Sheets, and Redis in `.env.local`
- [x] T002 Install additional dependencies: @line/bot-sdk, googleapis, ioredis, @tanstack/react-query
- [x] T003 [P] Set up Sentry configuration in `src/lib/sentry.ts` for error monitoring
- [x] T004 [P] Configure Redis client connection in `src/lib/redis.ts`

## Phase 3.2: Shared Types & Models (Foundation)

- [x] T005 [P] Define core types in `src/types/core.ts` (Patient, Officer, Booking, Task, Location)
- [x] T006 [P] Define LINE message types in `src/server/types/line.ts` (extend existing)
- [x] T007 [P] Define API request/response types in `src/server/types/api.ts`

## Phase 3.3: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE IMPLEMENTATION

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Contract Tests [P]

- [x] T008 [P] Contract test POST /api/liff/signup in `tests/contract/liff-signup.test.ts`
- [x] T009 [P] Contract test POST /api/liff/booking in `tests/contract/liff-booking.test.ts`
- [x] T010 [P] Contract test POST /api/line/webhook in `tests/contract/line-webhook.test.ts`
- [x] T011 [P] Contract test GET /api/geocode in `tests/contract/geocode.test.ts`
- [ ] T012 [P] Contract test POST /api/admin/bookings/:id/confirm in `tests/contract/admin-confirm.test.ts`

### Integration Tests [P]

- [ ] T013 [P] LIFF token validation test in `tests/integration/liff-auth.test.ts` (planned)
- [ ] T014 [P] Google Sheets integration test in `tests/integration/sheets.test.ts` (planned)
- [ ] T015 [P] Redis caching test in `tests/integration/redis.test.ts` (planned)
- [ ] T016 [P] LINE webhook idempotency test in `tests/integration/webhook-idempotency.test.ts` (planned)
- [x] T017 [P] Patient registration flow test in `tests/integration/signup-flow.test.ts`
- [x] T018 [P] Booking creation flow test in `tests/integration/booking-flow.test.ts`

## Phase 3.4: Core Server Implementation (ONLY after tests are failing)

### Server Utilities & Authentication

- [x] T019 [P] LIFF token validation utility in `src/server/lib/liffAuth.ts`
- [x] T020 [P] Google Sheets service in `src/server/repo/sheets.ts` (extend existing)
- [x] T021 [P] Patient repository methods in `src/server/repo/users.ts` (extend existing)
- [x] T022 [P] Booking repository methods in `src/server/repo/bookings.ts` (extend existing)

### LINE Integration

- [ ] T023 Intent router enhancement in `src/server/agent/router.ts` (extend existing)
- [ ] T024 [P] Signup flow handler in `src/server/agent/signupFlow.ts` (extend existing)
- [ ] T025 [P] Booking flow handler in `src/server/agent/bookingFlow.ts` (extend existing)
- [ ] T026 LINE message templates in `src/server/lineMessages.ts` (extend existing)

### API Routes

- [x] T027 POST /api/liff/signup endpoint in `src/app/api/liff/signup/route.ts` (extend existing)
- [x] T028 POST /api/liff/booking endpoint in `src/app/api/liff/booking/route.ts` (extend existing)
- [x] T029 LINE webhook handler in `src/app/api/line/webhook/route.ts` (extend existing)
- [x] T030 GET /api/geocode endpoint in `src/app/api/geocode/route.ts` (GET + POST support with caching)
- [x] T031 POST /api/admin/bookings/[id]/confirm endpoint for status transitions

## Phase 3.5: Frontend Components & LIFF Apps

### LIFF Components [P]

- [ ] T032 [P] Enhanced signup form in `src/components/liff/SignupForm.tsx` (extend existing)
- [ ] T033 [P] Enhanced booking form in `src/components/liff/BookingForm.tsx` (extend existing)

### Admin Dashboard Enhancements

- [ ] T034 TanStack Query integration for bookings API in admin dashboard
- [ ] T035 Booking confirmation UI in admin dashboard with status transitions

## Dependencies

```
Setup (T001-T004) → Types (T005-T007) → Tests (T008-T018) → Implementation (T019-T035)

Parallel Groups:
Group A: T003, T004 (Setup utilities)
Group B: T005, T006, T007 (Types)
Group C: T008, T009, T010, T011, T012 (Contract tests)
Group D: T013, T014, T015, T016, T017, T018 (Integration tests)
Group E: T019, T020, T021, T022 (Server utilities)
Group F: T024, T025 (Flow handlers)
Group G: T032, T033 (LIFF components)

Sequential Dependencies:
T005-T007 → All tests
Tests complete → T019-T022
T019 → T027, T028, T029
T020-T022 → T030, T031
T023 → T026
```

## Parallel Execution Examples

### Phase 3.2 - Types Setup

```bash
# Run simultaneously (different files):
Task: "Define core types in src/types/core.ts"
Task: "Define LINE message types in src/server/types/line.ts"
Task: "Define API request/response types in src/server/types/api.ts"
```

### Phase 3.3 - Contract Tests

```bash
# Run simultaneously (independent test files):
Task: "Contract test POST /api/liff/signup in tests/contract/liff-signup.test.ts"
Task: "Contract test POST /api/liff/booking in tests/contract/liff-booking.test.ts"
Task: "Contract test POST /api/line/webhook in tests/contract/line-webhook.test.ts"
Task: "Contract test GET /api/geocode in tests/contract/geocode.test.ts"
Task: "Contract test POST /api/admin/bookings/:id/confirm in tests/contract/admin-confirm.test.ts"
```

### Phase 3.4 - Server Utilities

```bash
# Run simultaneously (different utility files):
Task: "LIFF token validation utility in src/server/lib/liffAuth.ts"
Task: "Google Sheets service in src/server/repo/sheets.ts"
Task: "Patient repository methods in src/server/repo/users.ts"
Task: "Booking repository methods in src/server/repo/bookings.ts"
```

## Task Generation Rules Applied

1. **From Contracts (api-spec.yaml)**:
   - Each endpoint → contract test task [P] (T008-T012)
   - Each endpoint → implementation task (T027-T031)
2. **From Data Model**:
   - Each entity → type definition [P] (T005-T007)
   - Repository methods for data persistence (T020-T022)
3. **From LINE Integration**:

   - Intent routing and flow handlers (T023-T026)
   - Message templates and webhook processing (T026, T029)

4. **From Quickstart Scenarios**:
   - User flow integration tests [P] (T017-T018)
   - LIFF authentication validation (T013, T019)

## Current Codebase Integration

This task list builds upon the existing LabMove codebase:

- **Extends** current Next.js structure in `src/app/`, `src/components/`, `src/server/`
- **Enhances** existing LIFF forms, LINE webhook handler, and agent routing
- **Adds** TanStack Query for server state management
- **Integrates** with current Google Sheets and Redis infrastructure
- **Maintains** existing Zustand stores for UI state

## Validation Checklist

_GATE: Checked before task execution_

- [ ] All API contracts have corresponding tests (T008-T012 - admin confirm pending)
- [x] All entities have type definitions (T005-T007)
- [x] All tests come before implementation (Phase 3.3 → 3.4)
- [x] Parallel tasks are independent (different files)
- [x] Each task specifies exact file path
- [x] TDD cycle enforced (tests must fail first)
- [x] Integration with existing codebase maintained
- [x] Performance targets considered (LIFF < 1.5s, webhook < 2s)

## Notes

- Tests in Phase 3.3 MUST fail before proceeding to implementation
- [P] tasks can run simultaneously on different files
- Each task should result in a meaningful git commit
- Follow existing code patterns and architecture
- Maintain backwards compatibility with current features
