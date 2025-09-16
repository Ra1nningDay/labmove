/**
 * API Request/Response Types for LabMove Digital Assistant Platform
 *
 * Defines TypeScript interfaces for all API endpoints including LIFF,
 * webhook handlers, admin operations, and public API responses.
 */

import type {
  Patient,
  Booking,
  Officer,
  Task,
  Location,
  UserSession,
  HealthCheckResult,
  SystemHealth,
} from "../../types/core";

// =============================================================================
// COMMON API TYPES
// =============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
    field?: string; // for validation errors
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    has_more?: boolean;
    request_id?: string;
    timestamp?: string;
  };
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
  field?: string;
  status: number;
}

export interface PaginationQuery {
  page?: string;
  limit?: string;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

// =============================================================================
// LIFF API TYPES (/api/liff/*)
// =============================================================================

// LIFF Signup Flow
export interface LiffSignupRequest {
  /** LIFF access token for authentication */
  accessToken: string;

  /** Patient information */
  patient: {
    name: string;
    phone: string;
    address: string;
    hn?: string;
    hospital?: string;
    age?: number;
    gender?: "male" | "female" | "other";
    emergency_contact?: {
      name: string;
      phone: string;
      relationship: string;
    };
  };

  /** Consent and preferences */
  consent: {
    terms_accepted: boolean;
    privacy_accepted: boolean;
    marketing_accepted?: boolean;
  };

  /** Notification preferences */
  preferences?: {
    notifications_enabled: boolean;
    preferred_contact_method: "line" | "phone" | "both";
  };
}

export interface LiffSignupResponse {
  patient_id: string;
  line_user_id: string;
  registration_complete: boolean;
  next_step?: "verify_phone" | "complete_profile" | "book_appointment";
}

// LIFF Booking Flow
export interface LiffBookingRequest {
  /** LIFF access token for authentication */
  accessToken: string;

  /** Patient selection (for multi-patient accounts) */
  patient_id?: string;

  /** Booking details */
  booking: {
    scheduled_at: string; // ISO string
    type: "blood_test" | "vaccine" | "checkup" | "follow_up" | "emergency";
    services: string[];
    instructions?: string;
    priority?: "low" | "normal" | "high" | "urgent";
  };

  /** Location override (if different from patient address) */
  location?: {
    address: string;
    lat?: number;
    lng?: number;
  };

  /** Auto-confirmation preference */
  auto_confirm?: boolean;
}

export interface LiffBookingResponse {
  booking_id: string;
  confirmation_id: string;
  status: "pending" | "confirmed";
  estimated_arrival: string; // ISO string
  officer_assigned: boolean;
  officer?: {
    name: string;
    phone: string;
    eta?: string; // ISO string
  };
  next_steps: string[];
}

// LIFF Authentication
export interface LiffAuthRequest {
  accessToken: string;
}

export interface LiffAuthResponse {
  valid: boolean;
  line_user_id?: string;
  display_name?: string;
  picture_url?: string;
  patients?: Array<{
    id: string;
    name: string;
    phone: string;
  }>;
  session?: UserSession;
}

// =============================================================================
// LINE WEBHOOK API TYPES (/api/line/webhook)
// =============================================================================

export interface LineWebhookRequest {
  destination: string;
  events: Array<{
    type: string;
    source: {
      userId?: string;
      groupId?: string;
      roomId?: string;
    };
    timestamp: number;
    mode: "active" | "standby";
    webhookEventId: string;
    deliveryContext: {
      isRedelivery: boolean;
    };
    [key: string]: unknown; // for specific event data
  }>;
}

export interface LineWebhookResponse {
  processed_events: number;
  skipped_events: number;
  errors: Array<{
    event_id: string;
    error: string;
  }>;
}

// =============================================================================
// BOOKING API TYPES (/api/bookings/*)
// =============================================================================

export interface BookingsListQuery extends PaginationQuery {
  patient_id?: string;
  officer_id?: string;
  status?: string | string[];
  type?: string;
  priority?: string;
  scheduled_after?: string; // ISO string
  scheduled_before?: string; // ISO string
  location_radius?: string; // JSON: {lat,lng,radius_km}
}

export interface BookingsListResponse {
  bookings: Array<
    Booking & {
      patient?: Pick<Patient, "id" | "name" | "phone" | "address">;
      officer?: Pick<Officer, "id" | "name" | "phone">;
      tasks?: Array<Pick<Task, "id" | "type" | "status" | "scheduled_start">>;
    }
  >;
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface BookingCreateRequest {
  patient: Partial<Patient> & Pick<Patient, "name" | "phone" | "address">;
  booking: Partial<Booking> &
    Pick<Booking, "scheduled_at" | "type" | "services">;
  line_user_id?: string;
  auto_assign_officer?: boolean;
}

export interface BookingCreateResponse {
  booking: Booking;
  patient: Patient;
  tasks: Task[];
  confirmation_id: string;
}

export interface BookingUpdateRequest {
  scheduled_at?: string; // ISO string
  services?: string[];
  instructions?: string;
  priority?: "low" | "normal" | "high" | "urgent";
  status?: "pending" | "confirmed" | "cancelled";
}

export interface BookingUpdateResponse {
  booking: Booking;
  updated_fields: string[];
  notification_sent: boolean;
}

// =============================================================================
// ADMIN API TYPES (/api/admin/*)
// =============================================================================

// Officer management
export interface AdminOfficersListQuery extends PaginationQuery {
  status?: string;
  qualifications?: string[];
  available_after?: string; // ISO string
  available_before?: string; // ISO string
  location_radius?: string; // JSON: {lat,lng,radius_km}
}

export interface AdminOfficersListResponse {
  officers: Array<
    Officer & {
      current_tasks?: number;
      availability_today?: Array<{
        start: string;
        end: string;
        available: boolean;
      }>;
    }
  >;
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface AdminOfficerCreateRequest {
  name: string;
  phone: string;
  employee_id?: string;
  qualifications: string[];
  schedule: Officer["schedule"];
  base_location?: Location;
}

export interface AdminOfficerCreateResponse {
  officer: Officer;
}

export interface AdminOfficerUpdateRequest {
  name?: string;
  phone?: string;
  qualifications?: string[];
  schedule?: Partial<Officer["schedule"]>;
  status?: Officer["status"];
  current_location?: Location;
  base_location?: Location;
}

export interface AdminOfficerUpdateResponse {
  officer: Officer;
  updated_fields: string[];
}

// Booking confirmation
export interface AdminBookingConfirmRequest {
  officer_id?: string;
  auto_assign?: boolean;
  estimated_duration?: number;
  notes?: string;
  send_notification?: boolean;
}

export interface AdminBookingConfirmResponse {
  booking: Booking;
  officer?: Officer;
  tasks: Task[];
  notifications_sent: Array<{
    type: "line" | "sms" | "call";
    recipient: string;
    status: "sent" | "failed";
  }>;
}

// Task management
export interface AdminTasksListQuery extends PaginationQuery {
  booking_id?: string;
  officer_id?: string;
  type?: string;
  status?: string | string[];
  scheduled_after?: string; // ISO string
  scheduled_before?: string; // ISO string
  location_radius?: string; // JSON: {lat,lng,radius_km}
}

export interface AdminTasksListResponse {
  tasks: Array<
    Task & {
      booking?: Pick<Booking, "id" | "type" | "status" | "patient_id">;
      officer?: Pick<Officer, "id" | "name" | "phone">;
    }
  >;
  total: number;
  page: number;
  limit: number;
  has_more: boolean;
}

export interface AdminTaskUpdateRequest {
  status?: Task["status"];
  scheduled_start?: string; // ISO string
  scheduled_end?: string; // ISO string
  officer_id?: string;
  notes?: string;
  equipment?: string[];
}

export interface AdminTaskUpdateResponse {
  task: Task;
  updated_fields: string[];
  cascade_updates: Array<{
    type: "booking" | "officer_schedule";
    id: string;
    changes: string[];
  }>;
}

// =============================================================================
// GEOCODING API TYPES (/api/geocode)
// =============================================================================

export interface GeocodeRequest {
  address: string;
  bounds?: {
    northeast: { lat: number; lng: number };
    southwest: { lat: number; lng: number };
  };
  language?: "th" | "en";
}

export interface GeocodeResponse {
  results: Array<{
    formatted_address: string;
    geometry: {
      location: { lat: number; lng: number };
      location_type:
        | "ROOFTOP"
        | "RANGE_INTERPOLATED"
        | "GEOMETRIC_CENTER"
        | "APPROXIMATE";
    };
    place_id: string;
    address_components: Array<{
      long_name: string;
      short_name: string;
      types: string[];
    }>;
  }>;
  status: "OK" | "ZERO_RESULTS" | "INVALID_REQUEST" | "REQUEST_DENIED";
  cached: boolean;
}

// =============================================================================
// HEALTH CHECK API TYPES (/api/health)
// =============================================================================

export interface HealthCheckResponse {
  status: "healthy" | "unhealthy" | "degraded";
  timestamp: string; // ISO string
  uptime_seconds: number;
  version: string;
  environment: string;
  services: Array<HealthCheckResult>;
  overall_health: SystemHealth;
}

// =============================================================================
// ERROR RESPONSE TYPES
// =============================================================================

export interface ValidationErrorResponse extends ApiResponse {
  success: false;
  error: {
    code: "VALIDATION_ERROR";
    message: string;
    details: {
      field_errors: Array<{
        field: string;
        message: string;
        value?: unknown;
      }>;
    };
  };
}

export interface AuthenticationErrorResponse extends ApiResponse {
  success: false;
  error: {
    code: "AUTHENTICATION_ERROR" | "AUTHORIZATION_ERROR" | "TOKEN_EXPIRED";
    message: string;
    details?: {
      token_valid?: boolean;
      user_exists?: boolean;
      permissions?: string[];
    };
  };
}

export interface RateLimitErrorResponse extends ApiResponse {
  success: false;
  error: {
    code: "RATE_LIMIT_EXCEEDED";
    message: string;
    details: {
      limit: number;
      remaining: number;
      reset_time: string; // ISO string
      retry_after_seconds: number;
    };
  };
}

export interface NotFoundErrorResponse extends ApiResponse {
  success: false;
  error: {
    code: "NOT_FOUND";
    message: string;
    details?: {
      resource_type: string;
      resource_id: string;
    };
  };
}

export interface ConflictErrorResponse extends ApiResponse {
  success: false;
  error: {
    code: "CONFLICT" | "DUPLICATE_BOOKING" | "OFFICER_UNAVAILABLE";
    message: string;
    details?: {
      conflicting_resource?: string;
      conflicting_id?: string;
      suggestions?: string[];
    };
  };
}

export interface ServerErrorResponse extends ApiResponse {
  success: false;
  error: {
    code: "INTERNAL_SERVER_ERROR" | "SERVICE_UNAVAILABLE" | "DATABASE_ERROR";
    message: string;
    details?: {
      service: string;
      operation: string;
      retry_possible: boolean;
    };
  };
}

// =============================================================================
// REQUEST CONTEXT TYPES
// =============================================================================

export interface RequestContext {
  user_id?: string;
  line_user_id?: string;
  session?: UserSession;
  request_id: string;
  ip_address: string;
  user_agent: string;
  timestamp: Date;
  rate_limit?: {
    remaining: number;
    reset_time: Date;
  };
}

export interface AuthenticatedRequestContext extends RequestContext {
  user_id: string;
  line_user_id: string;
  session: UserSession;
}

// =============================================================================
// WEBHOOK SIGNATURE VALIDATION
// =============================================================================

export interface WebhookValidationContext {
  signature: string;
  body: string;
  timestamp: number;
  is_valid: boolean;
  error?: string;
}

// =============================================================================
// BULK OPERATION TYPES
// =============================================================================

export interface BulkOperationRequest<T> {
  operations: Array<{
    operation: "create" | "update" | "delete";
    id?: string;
    data: T;
  }>;
  options?: {
    continue_on_error: boolean;
    transaction: boolean;
    notification_batch: boolean;
  };
}

export interface BulkOperationResponse<T> {
  total_operations: number;
  successful_operations: number;
  failed_operations: number;
  results: Array<{
    operation: string;
    id?: string;
    status: "success" | "error";
    data?: T;
    error?: ApiError;
  }>;
  transaction_id?: string;
}

// =============================================================================
// NOTIFICATION TYPES
// =============================================================================

export interface NotificationRequest {
  recipients: Array<{
    type: "line" | "sms" | "email" | "push";
    address: string; // line_user_id, phone, email, etc.
  }>;
  template: string;
  variables: Record<string, unknown>;
  priority: "low" | "normal" | "high" | "urgent";
  schedule_at?: string; // ISO string for delayed sending
}

export interface NotificationResponse {
  notification_id: string;
  total_recipients: number;
  sent_count: number;
  failed_count: number;
  results: Array<{
    recipient: string;
    type: string;
    status: "sent" | "failed" | "pending";
    error?: string;
  }>;
}

// =============================================================================
// ANALYTICS TYPES
// =============================================================================

export interface AnalyticsQuery {
  start_date: string; // ISO string
  end_date: string; // ISO string
  granularity: "hour" | "day" | "week" | "month";
  metrics: string[];
  filters?: Record<string, unknown>;
}

export interface AnalyticsResponse {
  query: AnalyticsQuery;
  data: Array<{
    timestamp: string; // ISO string
    metrics: Record<string, number>;
  }>;
  summary: Record<string, number>;
  generated_at: string; // ISO string
}
