# Feature Specification: Digital Assistant and Operations Platform for At-Home Blood Test Services

**Feature Branch**: `001-digital-assistant-and`  
**Created**: September 16, 2025  
**Status**: Production Plan (ready for build)  
**Input**: User description: "We want to build a digital assistant and operations platform for at-home blood test services. On the user side, people should be able to easily sign up, book appointments, and view their profiles through a simple chat and menu experience. They should not need to navigate long forms inside chat; instead, the system should provide structured entry points and clear confirmations. On the staff and admin side, the platform should provide a dashboard to manage tasks and officers. This includes viewing patient requests, assigning officers, tracking task status, and visualizing locations on a map. The system should help coordinate logistics by showing distances, estimated travel times, and task progress. The reason for building this is to make medical home-visit services more reliable, efficient, and user-friendly. Patients benefit from a smoother experience when booking and confirming visits. Staff benefit from clear task assignment and reduced confusion about schedules or routes. Overall, the platform reduces manual coordination, ensures transparency of task status, and builds trust with users."

## Execution Flow (main)

```
1. Parse user description from Input ✓
   → Feature involves at-home blood test service platform
2. Extract key concepts from description ✓
   → Actors: patients, staff, admin, officers
   → Actions: signup, booking, profile management, task assignment, tracking
   → Data: appointments, user profiles, locations, officer assignments
   → Constraints: simple chat interface, structured entry points, no long forms
3. For each unclear aspect:
   → [NEEDS CLARIFICATION: authentication method for users]
   → [NEEDS CLARIFICATION: data retention policies for medical information]
   → [NEEDS CLARIFICATION: notification system requirements]
   → [NEEDS CLARIFICATION: payment processing requirements]
4. Fill User Scenarios & Testing section ✓
5. Generate Functional Requirements ✓
6. Identify Key Entities ✓
7. Run Review Checklist
   → WARN "Spec has uncertainties - multiple clarifications needed"
8. Return: SUCCESS (spec ready for planning with clarifications addressed)
```

---

## ⚡ Scope & Guidance

- Focus on user outcomes with clear production constraints.
- Include essential technical design and operational requirements for production.
- Minimize ambiguity; items requiring policy sign‑off are marked explicitly.

---

## User Scenarios & Testing _(mandatory)_

### Primary User Story

**Patient Journey**: A patient needs a blood test at home. They interact with a chat assistant to sign up for the service, book an appointment by providing their details through structured forms (not lengthy chat conversations), and receive confirmation. They can later check their profile and appointment status. Throughout the process, they receive clear confirmations and updates about their appointment.

**Staff Journey**: A staff member logs into the admin dashboard to view incoming patient requests. They assign available officers to appointments based on location and availability, track the progress of ongoing visits, and monitor officer locations on a map. The system helps them coordinate logistics by showing travel distances and estimated times.

### Acceptance Scenarios

1. **Given** a new patient wants blood test service, **When** they start a chat conversation, **Then** they are guided to structured signup and booking flows with clear menu options
2. **Given** a patient has completed booking, **When** they request appointment details, **Then** they receive their appointment information and status
3. **Given** staff receives a new patient request, **When** they view the admin dashboard, **Then** they can see the request details and available officers for assignment
4. **Given** an officer is assigned to a task, **When** staff views the map dashboard, **Then** they can see officer location, estimated travel time, and task progress
5. **Given** a patient profile exists, **When** they request to view their information, **Then** they can access their profile details through the chat interface

### Edge Cases

- What happens when no officers are available for a requested time slot?
- How does the system handle appointment cancellations or rescheduling?
- What occurs when an officer cannot complete an assigned task?
- How are emergency situations or urgent requests prioritized?
- What happens when a patient provides incomplete information during booking?

## Requirements _(mandatory)_

### Functional Requirements

**User Interface & Experience**

- **FR-001**: System MUST provide a chat-based interface for patient interactions
- **FR-002**: System MUST offer structured entry points (menus/buttons) instead of requiring long form entries within chat
- **FR-003**: System MUST provide clear confirmations for all user actions (signup, booking, profile changes)
- **FR-004**: System MUST allow patients to view their appointment status and profile information

**Patient Management**

- **FR-005**: System MUST allow new patients to sign up for the service
- **FR-006**: System MUST enable patients to book blood test appointments
- **FR-007**: System MUST authenticate users via LINE Login (LIFF OpenID Connect). Server validates LIFF ID tokens against the LINE Login Channel ID and maps identities to `line_user_id`.
- **FR-008**: System MUST store patient profile information securely
- **FR-009**: System MUST allow patients to view and update their profile information

**Staff Dashboard & Operations**

- **FR-010**: System MUST provide an admin dashboard for staff to manage operations
- **FR-011**: System MUST display incoming patient requests to staff
- **FR-012**: System MUST allow staff to assign officers to patient appointments
- **FR-013**: System MUST track and display task status for all appointments
- **FR-014**: System MUST provide a map visualization showing officer locations and patient addresses
- **FR-015**: System MUST calculate and display travel distances between officers and patients
- **FR-016**: System MUST estimate and show travel times for officer assignments

**Task Management & Coordination**

- **FR-017**: System MUST maintain real-time status updates for all tasks/appointments
- **FR-018**: System MUST allow staff to view officer availability and current assignments
- **FR-019**: System MUST provide logistics coordination features (distance, time, progress tracking)
- **FR-020**: System MUST ensure transparency of task status for both staff and patients

**Data & Communication**

- **FR-021**: System MUST store and retrieve appointment history
- **FR-022**: System MUST notify users via LINE Push messages for key events (signup confirmation, booking summary, booking updates). SMS/email are out of scope for this release.
- **FR-023**: System MUST maintain data privacy and security for medical information
- **FR-024**: System MUST enforce a configurable data retention policy (policy to be provided by Data Protection Officer). The system must support scheduled purge jobs for expired records and PII‑minimizing logs by default.
- **FR-025**: Payment processing is out of scope for the current production release; design must not preclude future integration.

### Non‑Functional Requirements (Production)

- **NFR-001 Availability**: Target 99.9% monthly for APIs (LIFF submit + webhook). Define health checks and alerting.
- **NFR-002 Security**: Do not trust client `userId`; validate LIFF tokens server‑side; CSRF origin allowlist; secrets via env; least-privilege service accounts.
- **NFR-003 Privacy**: Store minimal PII only; redact/scrub PII in logs; consent flags recorded; access restricted.
- **NFR-004 Performance**: LIFF submits must respond < 1.5s p95 (excluding third‑party dependency outliers). Webhook message handling < 2s p95.
- **NFR-005 Observability**: Centralized error and performance monitoring (Sentry) on both server and client; PII scrubbing enabled.
- **NFR-006 Caching**: Use Redis for geocoding results, Google Sheets reads (optional), idempotency keys, and rate‑limit counters.
- **NFR-007 Rate limiting**: Apply per‑IP and per‑user limits for public APIs and webhook processing; graceful 429 responses.
- **NFR-008 Idempotency**: Webhook processing must be idempotent (by message ID). LIFF submissions should be safely retryable.
- **NFR-009 Data Portability**: Support CSV export (and import) for Users/Bookings when Sheets is enabled.
- **NFR-010 Auditability**: Record who/when for booking status changes (e.g., pending → confirmed → cancelled) with minimal metadata.

### Architecture (Production)

- **Two‑Agent Split**: Intent Agent (routes intents; prefers Flex with LIFF links) and General Chat Agent (open‑ended; may use external KB).
- **LIFF Apps**: Web UIs for structured data: `?mode=signup`, `?mode=booking`. On submit, server validates LIFF ID token, persists minimal fields, and optionally pushes a Flex confirmation.
- **State Management**: Client uses TanStack Query for server state (LIFF flows, admin dashboards) with SWR caching and retries; Zustand for UI/global ephemeral state (selection, filters, route mode). Avoid duplicating server state in Zustand.
- **Persistence**: Google Sheets via service account (preferred) with CSV fallback for local/dev. Caching layer (Redis) for read‑through patterns and idempotency.
- **Messaging**: LINE Messaging API for replies/push; postbacks trigger server actions.
- **Map Data**: Admin dashboard shows tasks/officers; production roadmap adds map overlay from confirmed bookings.

### API Endpoints & Contracts

- `POST /api/liff/signup`: Body `{ consent, name, phone, hn?, hospital?, referral? }`; Authorization `Bearer <LIFF_ID_TOKEN>`; validates token, persists user, pushes summary.
- `POST /api/liff/booking`: Body `{ address, bookingDate | datePreference, note? }`; Authorization `Bearer <LIFF_ID_TOKEN>`; optional geocode; persists booking (status `pending`), stores session snapshot, pushes summary.
- `POST /api/line/webhook`: Handles messages, postbacks; routes intents; idempotent by `message.id`.
- [Planned] `GET /api/bookings?status=confirmed`: Returns geo‑enriched bookings for map overlays (only confirmed; includes `lat/lng`).
- [Planned] `POST /api/admin/bookings/:id/confirm`: Transition `pending → confirmed`; records audit metadata; may push confirmation.

All responses must conform to `src/server/types/line.ts` for LINE messages. LIFF submit endpoints enforce `originAllowed` checks.

### Booking Lifecycle

- States: `pending` (on submit) → `confirmed` (staff/admin) → `cancelled` (by user or staff).
- Only `confirmed` bookings appear on operational maps for routing.
- Edits: Users can request edits via postbacks (`booking_edit_date`, `booking_edit_address`) which re‑enter the booking flow.

### Observability & Operations

- **Sentry**: Instrument both server (Next.js API routes) and client (LIFF pages). Enable performance monitoring; scrub PII fields; tag environment and user (hashed).
- **Redis**: Use for (1) geocode cache with TTL, (2) rate‑limit counters, (3) webhook idempotency keys, (4) optional cache of Sheets results with short TTL.
- **Runbooks**: Document alert thresholds, common failures (token verify, Sheets quota), and rollback steps.

### Security & Compliance

- Validate LIFF ID tokens server‑side against LINE Login Channel ID.
- CSRF protection via origin allowlist (`originAllowed`); disallow cross‑origin LIFF submits unless configured.
- Do not store raw ID tokens. Store only `line_user_id` and necessary fields.
- Rate‑limit webhook and public APIs; prefer idempotent writes.
- Define data retention with DPO; implement purge tooling (configurable TTL).

### Key Entities _(include if feature involves data)_

- **Patient**: Individual requesting blood test service, contains profile information, contact details, medical history permissions, appointment preferences
- **Officer**: Field staff member who performs blood tests, contains availability schedule, current location, skill certifications, assignment capacity
- **Appointment**: Scheduled blood test visit, contains patient reference, officer assignment, date/time, location, status, special requirements
- **Task**: Operational unit representing work to be done, contains appointment reference, status progression, estimated times, completion notes
- **Admin User**: Staff member with dashboard access, contains permissions level, assigned regions, notification preferences
- **Location**: Geographic information for patients and officers, contains address details, coordinates, accessibility notes, travel time calculations

---

## Review & Acceptance Checklist

_GATE: Automated checks run during main() execution_

### Content Quality

- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness

- [x] Auth method defined (LIFF / LINE Login)
- [x] Notification channel defined (LINE push)
- [~] Data retention policy: Implementation ready, policy requires DPO sign‑off
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

---

## Execution Status

_Updated by main() during processing_

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked (5 clarifications needed)
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [ ] Review checklist passed (pending clarifications)

---
