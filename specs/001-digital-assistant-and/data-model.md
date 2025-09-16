# Data Model: Digital Assistant Platform

**Date**: September 16, 2025  
**Feature**: Digital Assistant and Operations Platform for At-Home Blood Test Services

## Entity Overview

This document defines the core data entities for the digital assistant platform, extracted from functional requirements and user scenarios.

## Core Entities

### Patient

**Purpose**: Represents individuals requesting blood test services through LINE chat

**Attributes**:

- `line_user_id` (string, required): Unique LINE user identifier from LIFF token
- `name` (string, required): Full name for service delivery
- `phone` (string, required): Contact number for coordination
- `consent` (boolean, required): Consent for data processing and service
- `hn` (string, optional): Hospital number if existing patient
- `hospital` (string, optional): Associated hospital or clinic
- `referral` (string, optional): Referral source or doctor
- `created_at` (timestamp, required): Registration timestamp
- `updated_at` (timestamp, required): Last profile update

**Validation Rules**:

- `line_user_id` must be valid LINE user ID format
- `phone` must be valid Thai mobile number format
- `consent` must be true to create profile
- `name` minimum 2 characters, maximum 100 characters

**Relationships**:

- One Patient has many Bookings
- Patient profile can be viewed/updated via LINE chat

**State Transitions**: None (profile data only)

### Officer

**Purpose**: Field staff who perform blood test visits

**Attributes**:

- `id` (string, required): Unique officer identifier
- `name` (string, required): Officer full name
- `phone` (string, required): Contact number
- `email` (string, optional): Email for notifications
- `current_location` (Location, optional): Real-time location
- `availability` (string[], required): Available time slots
- `skills` (string[], optional): Certifications or specializations
- `max_assignments` (number, required): Maximum concurrent tasks
- `created_at` (timestamp, required): Profile creation
- `updated_at` (timestamp, required): Last profile update

**Validation Rules**:

- `max_assignments` must be positive integer
- `availability` must contain valid time slot formats
- `phone` must be unique across officers

**Relationships**:

- One Officer has many Tasks
- Officer assigned to multiple Bookings via Tasks

**State Management**: Location updated in real-time for map display

### Booking

**Purpose**: Patient's appointment request for blood test service

**Attributes**:

- `id` (string, required): Unique booking identifier
- `patient_line_user_id` (string, required): Reference to Patient
- `address` (string, required): Service delivery address
- `location` (Location, optional): Geocoded address coordinates
- `booking_date` (date, optional): Specific requested date
- `date_preference` (string, optional): Flexible date preference
- `note` (string, optional): Special instructions or notes
- `status` (enum, required): Current booking status
- `created_at` (timestamp, required): Booking submission time
- `updated_at` (timestamp, required): Last status change
- `confirmed_at` (timestamp, optional): When booking was confirmed
- `cancelled_at` (timestamp, optional): When booking was cancelled

**Status Enum**:

- `pending`: Initial state after submission
- `confirmed`: Approved by staff and scheduled
- `cancelled`: Cancelled by patient or staff

**Validation Rules**:

- Either `booking_date` or `date_preference` must be provided
- `address` minimum 10 characters
- Status transitions: `pending` → `confirmed` OR `pending` → `cancelled`
- `confirmed_at` required when status is `confirmed`

**Relationships**:

- Many Bookings belong to one Patient
- One confirmed Booking creates one Task (Phase 2)

**Lifecycle**:

1. Created as `pending` via LIFF submission
2. Staff review and confirm → `confirmed` status (Phase 2)
3. Confirmed booking generates Task for officer assignment (Phase 2)
4. Can be cancelled at any time → `cancelled` status

### Task

**Purpose**: Operational unit for staff coordination and officer assignment

**Attributes**:

- `id` (string, required): Unique task identifier
- `booking_id` (string, required): Reference to confirmed Booking
- `officer_id` (string, optional): Assigned officer reference
- `status` (enum, required): Current task status
- `estimated_duration` (number, optional): Expected time in minutes
- `travel_time` (number, optional): Calculated travel time to location
- `priority` (enum, required): Task priority level
- `assigned_at` (timestamp, optional): When officer was assigned
- `started_at` (timestamp, optional): When officer started travel
- `completed_at` (timestamp, optional): When service was completed
- `notes` (string, optional): Officer or admin notes

**Status Enum**:

- `unassigned`: Waiting for officer assignment
- `assigned`: Officer assigned but not started
- `in_progress`: Officer en route or performing service
- `completed`: Service successfully completed
- `failed`: Could not complete service

**Priority Enum**:

- `normal`: Standard priority
- `urgent`: Requires expedited handling
- `emergency`: Immediate attention needed

**Validation Rules**:

- `officer_id` required when status is `assigned` or later
- Status progression: `unassigned` → `assigned` → `in_progress` → `completed`/`failed`
- Timestamps must follow logical sequence

**Relationships**:

- One Task belongs to one Booking
- One Task assigned to one Officer
- Task inherits location from associated Booking

**Business Logic**:

- Only confirmed bookings generate tasks
- Travel time calculated from officer location to booking address
- Task completion triggers booking status update

### Location

**Purpose**: Geographic information with geocoding support

**Attributes**:

- `address` (string, required): Human-readable address
- `latitude` (number, optional): Geographic latitude
- `longitude` (number, optional): Geographic longitude
- `formatted_address` (string, optional): Geocoded formatted address
- `geocoded_at` (timestamp, optional): When geocoding was performed
- `geocode_confidence` (string, optional): Geocoding accuracy level

**Validation Rules**:

- `latitude` must be valid latitude (-90 to 90)
- `longitude` must be valid longitude (-180 to 180)
- Both lat/lng required together or both null

**Usage**:

- Embedded in Patient profiles (optional)
- Embedded in Officer profiles (current location)
- Embedded in Booking records (service address)
- Used for distance and travel time calculations

### Session (LIFF Flows)

**Purpose**: Temporary data for multi-step LIFF interactions

**Attributes**:

- `session_id` (string, required): Unique session identifier
- `line_user_id` (string, required): Associated user
- `flow_type` (enum, required): Type of flow (signup, booking)
- `step` (string, required): Current step in flow
- `data` (object, required): Collected form data
- `expires_at` (timestamp, required): Session expiration
- `created_at` (timestamp, required): Session start time

**Flow Types**:

- `signup`: Patient registration flow
- `booking`: Appointment booking flow

**Validation Rules**:

- Session expires after 1 hour of inactivity
- `data` structure varies by flow type and step
- One active session per user per flow type

**Usage**:

- Temporary storage during LIFF form completion
- Enables multi-step forms without losing data
- Cleaned up after successful submission or expiration

## Data Relationships

```
Patient (1) ----< Bookings (N)
    |
    └── line_user_id

Booking (1) ----< Tasks (1) [when confirmed]
    |
    ├── location (embedded)
    └── patient_line_user_id → Patient

Officer (1) ----< Tasks (N)
    |
    ├── current_location (embedded)
    └── officer_id

Task
    |
    ├── booking_id → Booking
    ├── officer_id → Officer
    └── inherits location from Booking

Session
    |
    └── line_user_id → Patient
```

## Data Storage Strategy

### Google Sheets Structure

**Patients Sheet**:

- Columns: line_user_id, name, phone, consent, hn, hospital, referral, created_at, updated_at
- Primary key: line_user_id
- Sheet protection: Yes (admin access only)

**Officers Sheet**:

- Columns: id, name, phone, email, location_address, location_lat, location_lng, availability, skills, max_assignments, created_at, updated_at
- Primary key: id
- Sheet protection: Yes (admin access only)

**Bookings Sheet**:

- Columns: id, patient_line_user_id, address, location_lat, location_lng, location_formatted, booking_date, date_preference, note, status, created_at, updated_at, confirmed_at, cancelled_at
- Primary key: id
- Auto-increment ID generation

**Tasks Sheet**:

- Columns: id, booking_id, officer_id, status, estimated_duration, travel_time, priority, assigned_at, started_at, completed_at, notes
- Primary key: id
- Relationships via ID references

### Redis Caching

**Cached Data**:

- Officer availability (5 minute TTL)
- Geocoding results (30 day TTL)
- Session data (1 hour TTL)
- Rate limit counters (1 hour sliding window)

**Cache Keys**:

- `officer:{id}:availability`
- `geocode:{address_hash}`
- `session:{session_id}`
- `rate_limit:{ip}:{endpoint}`

## Data Privacy & Security

### PII Minimization

- Store only necessary fields for service delivery
- Avoid storing sensitive medical information
- Log scrubbing for all PII fields
- Consent tracking for data processing

### Access Control

- LIFF token validation for user data access
- Admin authentication for officer and task data
- Row-level security via user_id matching
- Audit logging for all data modifications

### Data Retention

- Configurable retention periods per entity type
- Automated purge jobs for expired records
- Audit trail for deletions
- Backup before purge operations

## Migration & Evolution

### Schema Changes

- Backwards-compatible column additions
- Data migration scripts for breaking changes
- Version tracking in metadata sheets
- Rollback procedures documented

### Performance Optimization

- Index planning for common queries
- Batch operations for bulk updates
- Read-through caching strategy
- Query optimization guidelines

This data model provides a solid foundation for the MVP while supporting future enhancements like payment integration, advanced scheduling, and expanded geographic coverage.
