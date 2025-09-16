# Research Documentation: Digital Assistant Platform

**Date**: September 16, 2025  
**Feature**: Digital Assistant and Operations Platform for At-Home Blood Test Services

## Research Overview

This document consolidates research findings for implementing the digital assistant platform, resolving technical unknowns identified in the specification.

## Research Questions Resolved

### 1. Authentication Method for Users

**Question**: How should users authenticate with the system?

**Decision**: LIFF ID Token validation via LINE Login  
**Rationale**:

- Seamless integration with LINE ecosystem
- No additional login UI required
- Users already authenticated with LINE
- Server-side token validation ensures security

**Implementation Details**:

- Client receives LIFF ID token from LINE
- Server validates token against LINE Login Channel ID
- Extract `line_user_id` for user identification
- No password management required

**Alternatives Considered**:

- Email/password: Rejected due to additional friction
- SMS verification: Rejected as redundant with LINE auth
- OAuth providers: Rejected as unnecessary complexity

### 2. Data Retention Policies for Medical Information

**Question**: How long should medical data be retained?

**Decision**: Configurable retention policy with DPO oversight  
**Rationale**:

- Healthcare regulations vary by jurisdiction
- Business requirements may change
- Need flexibility for compliance

**Implementation Approach**:

- Store retention period in environment configuration
- Implement scheduled purge jobs for expired records
- Maintain audit logs of deletions
- Separate retention periods for different data types
- PII minimization in logs by default

**Policy Framework** (requires DPO sign-off):

```
- Patient profiles: TBD (likely 7 years for medical records)
- Booking history: TBD (likely 3 years for operational data)
- Chat logs: TBD (likely 1 year for support)
- Location data: TBD (minimal retention, possibly 30 days)
```

### 3. Notification System Requirements

**Question**: What notification channels should be supported?

**Decision**: LINE Push messages as primary channel  
**Rationale**:

- Users already in LINE ecosystem
- Rich message formatting available (Flex messages)
- Real-time delivery
- No additional app installation required

**Notification Types**:

- Signup confirmation (Flex summary)
- Booking confirmation (Flex with details)
- Status updates (text + quick reply buttons)
- Appointment reminders (scheduled push)

**Implementation Details**:

- Use LINE Messaging API for push messages
- Template-based message generation
- Delivery status tracking
- Fallback to simple text for unsupported clients

**Alternatives Considered**:

- SMS: Rejected due to additional cost and complexity
- Email: Rejected as out of scope for MVP
- Push notifications: Covered by LINE push messages

### 4. Payment Processing Requirements

**Question**: How should payments be handled?

**Decision**: Out of scope for current release  
**Rationale**:

- Adds significant complexity (PCI compliance, gateway integration)
- Not essential for MVP operations validation
- Can be added in future iterations

**Future Integration Approach**:

- Design booking flow to not preclude payment integration
- Placeholder for payment status in data model
- Consider LINE Pay integration for ecosystem consistency

**Current Workaround**:

- Manual payment processing
- Payment confirmation via admin dashboard
- Status tracking without automated payment flow

### 5. Notification Channel Selection

**Question**: Which notification methods to implement?

**Decision**: LINE Push messages only for MVP  
**Rationale**: Consistent with platform choice, sufficient for core workflows

## Technology Stack Validation

### Next.js + LINE Integration

**Research Findings**:

- LIFF SDK supports Next.js environment
- SSR compatibility requires client-side initialization
- Environment variable management for LINE credentials
- CORS configuration needed for LIFF domain

**Best Practices Identified**:

- Use dynamic imports for LIFF SDK
- Implement proper error boundaries for LINE integration
- Cache LIFF initialization state
- Handle LINE-specific errors gracefully

### State Management Strategy

**Research Findings**:

- TanStack Query excellent for server state with LINE webhook integration
- Zustand sufficient for UI state (filters, selections)
- Clear separation prevents state duplication
- React 18 concurrent features compatible

**Recommended Patterns**:

- Server state: bookings, user profiles, officer data
- Client state: UI preferences, temporary selections, map view state
- Optimistic updates for booking submissions
- Background refetch for real-time coordination

### Google Sheets Integration

**Research Findings**:

- Service account authentication most reliable
- Batch operations reduce API quota usage
- Read-through caching essential for performance
- CSV export enables backup and data portability

**Implementation Strategy**:

- Use Google Sheets API v4
- Implement retry logic for rate limits
- Cache frequently accessed data (officer list, user profiles)
- Background sync for non-critical updates

### Redis Caching Strategy

**Research Findings**:

- Essential for webhook idempotency
- Effective for geocoding cache (stable data)
- Rate limiting implementation
- Session storage for LIFF flows

**Cache Patterns**:

- Idempotency keys: 24 hour TTL
- Geocoding results: 30 day TTL
- Rate limit counters: 1 hour sliding window
- Session data: 1 hour TTL

## Performance Considerations

### LIFF Performance Requirements

**Target**: < 1.5s p95 for form submissions

**Optimization Strategies**:

- Minimize bundle size for LIFF pages
- Implement request deduplication
- Use optimistic UI updates
- Cache validation results

### Webhook Processing

**Target**: < 2s p95 for message handling

**Optimization Strategies**:

- Async processing for non-critical operations
- Idempotency checks first (fast Redis lookup)
- Batch database operations
- Circuit breaker for external dependencies

## Security Research

### LIFF Token Validation

**Security Requirements**:

- Server-side validation only
- Never trust client-provided user IDs
- Validate token expiration
- Check token scope and permissions

### PII Handling

**Privacy Requirements**:

- Minimize data collection
- Implement data anonymization for logs
- Secure data transmission (HTTPS only)
- Regular security audits

## Integration Patterns

### LINE Webhook Processing

**Pattern**: Idempotent message handler with routing

**Implementation**:

```typescript
// Pseudocode pattern
async function processWebhook(event) {
  const messageId = event.message?.id;
  if (await isProcessed(messageId)) return;

  const intent = await routeIntent(event);
  const response = await handleIntent(intent);

  await markProcessed(messageId);
  return response;
}
```

### LIFF Form Processing

**Pattern**: Token validation + data persistence + confirmation

**Implementation**:

```typescript
// Pseudocode pattern
async function handleLIFFSubmission(token, formData) {
  const userId = await validateLIFFToken(token);
  const result = await persistData(userId, formData);
  await sendConfirmation(userId, result);
  return { success: true };
}
```

## Conclusion

All major technical unknowns have been resolved through research. The chosen technology stack (Next.js + LINE + Google Sheets + Redis) provides a solid foundation for the MVP while allowing for future scalability. Security and privacy requirements are well-defined, and performance targets are achievable with proper optimization.

The architecture aligns with constitutional principles:

- Simple, direct patterns
- Real dependencies for testing
- Clear separation of concerns
- Observable and maintainable code

Ready to proceed to Phase 1 design artifacts.
