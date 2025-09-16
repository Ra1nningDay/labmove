# Quickstart Guide: Digital Assistant Platform

**Date**: September 16, 2025  
**Feature**: Digital Assistant and Operations Platform for At-Home Blood Test Services

## Overview

This quickstart guide provides step-by-step instructions to validate the digital assistant platform functionality. It covers both user-facing features (LINE chat, LIFF apps) and admin operations (dashboard, task management).

## Prerequisites

### Environment Setup

1. **Next.js Application**: Running locally on `http://localhost:3000`
2. **LINE Developer Account**: With Messaging API and LIFF app configured
3. **Google Sheets**: Service account with read/write permissions
4. **Redis**: Running locally or remotely accessible
5. **LINE Mobile App**: For testing chat and LIFF interactions

### Required Environment Variables

```bash
# LINE Messaging API
LINE_CHANNEL_SECRET=your_channel_secret
LINE_CHANNEL_ACCESS_TOKEN=your_access_token

# LINE Login / LIFF
LINE_LOGIN_CHANNEL_ID=your_login_channel_id
NEXT_PUBLIC_LIFF_ID=your_liff_id

# Google Sheets (optional persistence)
SHEET_ID=your_spreadsheet_id
# One of the following auth configurations:
GOOGLE_SERVICE_ACCOUNT_EMAIL=service_account_email
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
# or
# GOOGLE_CREDENTIALS_JSON='{"client_email":"...","private_key":"..."}'

# Redis (optional for Phase 1)
REDIS_URL=redis://localhost:6379

# Monitoring (optional)
SENTRY_DSN=your_sentry_dsn
```

## User Journey Validation

### 1. Patient Registration Flow

**Objective**: Validate new patient can sign up through LINE chat

**Steps**:

1. **Open LINE chat** with your bot account
2. **Trigger registration**:
   - Use rich menu button "สมัครสมาชิก" OR
   - Send text message "สมัคร"
3. **Verify intent routing**: Bot responds with a Flex button to open LIFF
4. **Open LIFF app**: Click to open the signup form (LIFF)
5. **Fill registration form**:
   - ✅ Consent checkbox (required)
   - Name: "สมศรี ทดสอบ"
   - Phone: "0812345678"
   - HN: "HN001" (optional)
   - Hospital: "โรงพยาบาลทดสอบ" (optional)
6. **Submit form**: Click "ยืนยันการลงทะเบียน"
7. **Verify confirmation**:
   - LIFF shows a success message
   - LINE chat receives a signup summary Flex
   - User data saved to Google Sheets or CSV (fallback)

**Expected Results**:

- ✅ LIFF token validation successful
- ✅ Data persisted in Google Sheets "Patients" tab
- ✅ Flex confirmation message sent to LINE chat
- ✅ Consent flag recorded as true

### 2. Appointment Booking Flow

**Objective**: Validate registered patient can book appointments

**Steps**:

1. **Trigger booking**:
   - Use rich menu button "จองนัดเจาะเลือด" OR
   - Send text message "จอง"
2. **Open LIFF booking form**
3. **Fill booking details**:
   - Address: "123 ถนนสุขุมวิท แขวงคลองตัน กรุงเทพฯ 10110"
   - Date option: Select specific date (tomorrow)
   - Note: "กรุณาโทรก่อนมา" (optional)
4. **Submit booking**: Click "ยืนยันการจอง"
5. **Verify booking creation**:
   - LIFF shows success (no booking ID in Phase 1)
   - LINE chat receives booking summary Flex (status: รอยืนยัน/pending)
   - Booking saved to Google Sheets/CSV with "pending" status

**Expected Results**:

- ✅ Status set to "pending"
- ✅ Address geocoded when possible
- ✅ Booking data in "Bookings" (Sheets) or `data/bookings.csv`

### 3. Profile View (Phase 1)

**Objective**: Validate profile viewing and editing

**Steps**:

1. **View profile**:
   - Use rich menu "โปรไฟล์" OR
   - Send postback via "ดูโปรไฟล์" quick reply
2. **Verify profile display**: Flex message shows user details
3. Editing via LIFF is out of scope in Phase 1
4. Expect a read‑only Flex list of profiles linked to the LINE user

**Expected Results**:

- ✅ Profile data loaded from Google Sheets/CSV
- ✅ Multi-user display supported (if multiple entries)
- 🚫 Editing not available in Phase 1

## Admin Dashboard Validation

### 4. Staff Operations Dashboard

**Objective**: Validate admin can manage bookings and officers

**Steps**:

1. **Access dashboard**: Navigate to `http://localhost:3000`
2. **Map overlays**: Confirmed bookings (Phase 1 API) may be shown as a separate overlay
3. **Review booking details**: Use chat postback "รายละเอียดนัด" to fetch latest
4. **Assign officer**:
   - Select available officer from list
   - Confirm assignment
5. **Update booking status**: Change from "pending" to "confirmed"
6. **Verify task creation**: Task appears in admin interface

**Expected Results**:

- ✅ Dashboard loads with current data
- ✅ Filters work (date, status, search)
- ✅ Officer assignment updates database
- ✅ Status transitions recorded with timestamps

### 5. Map Visualization

**Objective**: Validate geographic features work correctly

**Steps**:

1. **Open map view**: Click "เปิดแผนที่" on dashboard
2. **Verify locations**:
   - Patient addresses shown as markers
   - Officer locations displayed
   - Confirmed bookings visible
3. **Test route calculation**:
   - Select officer and booking
   - Verify ETA calculation
   - Check travel time display
4. **Real-time updates**:
   - Change officer location
   - Verify map updates

**Expected Results**:

- ✅ Google Maps integration working
- ✅ Geocoded addresses display correctly
- ✅ ETA calculations reasonable
- ✅ Real-time position updates

## Integration Testing

### 6. LINE Webhook Processing

**Objective**: Validate webhook handles all message types

**Test Cases**:

**Text Messages**:

```bash
# Simulate webhook call
curl -X POST http://localhost:3000/api/line/webhook \
  -H "Content-Type: application/json" \
  -H "X-Line-Signature: $(generate_line_signature)" \
  -d '{
    "destination": "U...",
    "events": [{
      "type": "message",
      "message": {
        "id": "msg001",
        "type": "text",
        "text": "คุยกับผู้ช่วย"
      },
      "timestamp": 1694764800000,
      "source": {"type": "user", "userId": "U123"},
      "replyToken": "reply123"
    }]
  }'
```

**Postback Events**:

```bash
curl -X POST http://localhost:3000/api/line/webhook \
  -H "Content-Type: application/json" \
  -H "X-Line-Signature: $(generate_line_signature)" \
  -d '{
    "destination": "U...",
    "events": [{
      "type": "postback",
      "postback": {
        "data": "{\"action\":\"booking_details\"}"
      },
      "timestamp": 1694764800000,
      "source": {"type": "user", "userId": "U123"},
      "replyToken": "reply123"
    }]
  }'
```

**Expected Results**:

- ✅ Intent routing works correctly
- ✅ Appropriate responses generated
- ✅ Idempotency prevents duplicate processing
- ✅ Error handling for malformed requests

### 7. LIFF Token Validation

**Objective**: Ensure secure authentication

**Steps**:

1. **Valid token test**: Submit LIFF form with valid token
2. **Invalid token test**: Submit with expired/malformed token
3. **Missing token test**: Submit without Authorization header
4. **Wrong user test**: Submit with token for different user

**Expected Results**:

- ✅ Valid tokens accepted and user identified
- ✅ Invalid tokens rejected with 401 error
- ✅ Missing tokens rejected with 401 error
- ✅ Security context properly isolated per user

## Performance Validation

### 8. Response Time Testing

**LIFF Form Submission** (Target: < 1.5s p95):

```bash
# Load test LIFF signup endpoint
for i in {1..10}; do
  time curl -X POST http://localhost:3000/api/liff/signup \
    -H "Authorization: Bearer valid_liff_token" \
    -H "Content-Type: application/json" \
    -d '{"consent":true,"name":"Test User","phone":"0812345678"}'
done
```

**Webhook Processing** (Target: < 2s p95):

```bash
# Load test webhook endpoint
for i in {1..10}; do
  time curl -X POST http://localhost:3000/api/line/webhook \
    -H "Content-Type: application/json" \
    -d '{"destination":"U...","events":[...]}'
done
```

**Expected Results**:

- ✅ 95% of LIFF requests complete under 1.5 seconds
- ✅ 95% of webhook requests complete under 2 seconds
- ✅ No memory leaks during sustained load
- ✅ Error rates remain under 1%

## Data Validation

### 9. Google Sheets Integration

**Steps**:

1. **Verify data structure**: Check sheets have correct columns
2. **Test read operations**: Dashboard loads data correctly
3. **Test write operations**: New records saved properly
4. **Test batch operations**: Multiple updates processed
5. **Verify data integrity**: No corruption during concurrent access

**Expected Results**:

- ✅ All data types saved correctly (text, dates, numbers)
- ✅ Relationships maintained between sheets
- ✅ Concurrent access handled gracefully
- ✅ Backup/export functionality works

### 10. Redis Caching (optional in Phase 1)

**Validation Points**:

1. **Idempotency keys**: Duplicate webhooks ignored
2. **Geocoding cache**: Address lookups cached appropriately
3. **Rate limiting**: Excessive requests blocked
4. **Session storage**: LIFF sessions persist correctly

**Test Commands**:

```bash
# Check Redis keys
redis-cli KEYS "*"

# Verify TTL settings
redis-cli TTL "idempotency:msg123"
redis-cli TTL "geocode:address_hash"

# Monitor cache hits/misses
redis-cli MONITOR
```

## Error Handling Validation

### 11. Graceful Degradation

**Test Scenarios**:

1. **Google Sheets offline**: Should fall back to CSV under `data/`
2. **Redis unavailable**: Should work without caching
3. **LINE API down**: Should queue messages for retry
4. **LIFF token invalid**: Should show clear error message

**Expected Behavior**:

- ✅ System remains functional with degraded features
- ✅ Clear error messages shown to users
- ✅ Automatic retry for transient failures
- ✅ Graceful fallbacks to alternative methods

## Security Validation

### 12. Security Controls

**Tests**:

1. **CSRF protection**: Cross-origin requests blocked
2. **Input validation**: Malformed data rejected
3. **PII handling**: Sensitive data properly protected
4. **Access control**: Unauthorized access prevented

**Verification**:

- ✅ LIFF origin validation enforced
- ✅ Input sanitization prevents injection
- ✅ PII scrubbed from logs
- ✅ Admin endpoints require authentication

## Completion Checklist

- [ ] Patient registration flow complete
- [ ] Appointment booking flow complete
- [ ] Profile management working
- [ ] Admin dashboard functional
- [ ] Map visualization operational
- [ ] Webhook processing validated
- [ ] LIFF authentication secure
- [ ] Performance targets met
- [ ] Data integrity verified
- [ ] Caching system working
- [ ] Error handling graceful
- [ ] Security controls active

## Troubleshooting

### Common Issues

**LIFF not opening**:

- Check LIFF ID configuration
- Verify SSL certificate (HTTPS required)
- Test in LINE mobile app, not browser

**Webhook not receiving**:

- Verify webhook URL accessible
- Check LINE signature validation
- Confirm channel secret correct

**Google Sheets access denied**:

- Verify service account permissions
- Check spreadsheet sharing settings
- Confirm sheet names match code

**Redis connection failed**:

- Verify Redis server running
- Check connection string format
- Confirm network accessibility

### Support Contacts

- **Technical Issues**: dev@labmove.com
- **LINE Integration**: line-support@labmove.com
- **Data/Privacy**: privacy@labmove.com

---

This quickstart guide ensures comprehensive validation of all platform features. Each section builds upon the previous, creating confidence in the complete user journey from registration through service delivery coordination.
