/**
 * Core TypeScript Types for LabMove Digital Assistant Platform
 *
 * Defines the primary entities and their relationships for healthcare
 * operations, booking management, and user interactions.
 */

// =============================================================================
// LOCATION & GEOGRAPHY
// =============================================================================

export interface Location {
  /** Geographic coordinates */
  lat: number;
  lng: number;

  /** Human-readable address */
  formatted_address: string;

  /** Optional address components */
  address_components?: {
    district?: string;
    subdistrict?: string;
    province?: string;
    postal_code?: string;
    country?: string;
  };

  /** Location metadata */
  place_id?: string;
  location_type?:
    | "ROOFTOP"
    | "RANGE_INTERPOLATED"
    | "GEOMETRIC_CENTER"
    | "APPROXIMATE";
}

export interface RouteInfo {
  /** Distance in meters */
  distance: number;

  /** Duration in seconds */
  duration: number;

  /** Estimated arrival time */
  eta: Date;

  /** Route geometry for mapping */
  polyline?: string;

  /** Traffic conditions */
  traffic_status?: "light" | "moderate" | "heavy";
}

// =============================================================================
// USER & AUTHENTICATION
// =============================================================================

export interface LineUser {
  /** LINE User ID (starts with U) */
  line_user_id: string;

  /** Display name from LINE profile */
  display_name?: string;

  /** Profile picture URL */
  picture_url?: string;

  /** Language preference */
  language?: "th" | "en";

  /** Registration timestamp */
  created_at: Date;

  /** Last interaction timestamp */
  last_seen_at: Date;

  /** User preferences */
  preferences?: {
    notifications_enabled: boolean;
    auto_confirm_bookings: boolean;
    preferred_contact_method: "line" | "phone" | "both";
  };
}

// =============================================================================
// PATIENT MANAGEMENT
// =============================================================================

export interface Patient {
  /** Unique patient identifier */
  id: string;

  /** Full name */
  name: string;

  /** Contact phone number */
  phone: string;

  /** Hospital number (if applicable) */
  hn?: string;

  /** Referring hospital */
  hospital?: string;

  /** Home address for visits */
  address: string;

  /** Geocoded location */
  location: Location;

  /** Associated LINE user */
  line_user_id?: string;

  /** Patient metadata */
  age?: number;
  gender?: "male" | "female" | "other";

  /** Medical notes (encrypted) */
  medical_notes?: string;

  /** Referral source */
  referral_source?: string;

  /** Emergency contact */
  emergency_contact?: {
    name: string;
    phone: string;
    relationship: string;
  };

  /** Record timestamps */
  created_at: Date;
  updated_at: Date;

  /** Patient status */
  status: "active" | "inactive" | "archived";
}

export interface PatientSearchCriteria {
  name?: string;
  phone?: string;
  hn?: string;
  hospital?: string;
  line_user_id?: string;
  status?: Patient["status"];
  created_after?: Date;
  created_before?: Date;
}

// =============================================================================
// OFFICER MANAGEMENT
// =============================================================================

export interface Officer {
  /** Unique officer identifier */
  id: string;

  /** Full name */
  name: string;

  /** Contact phone number */
  phone: string;

  /** Employee ID */
  employee_id?: string;

  /** Current location (for dispatch) */
  current_location?: Location;

  /** Home base location */
  base_location?: Location;

  /** Officer qualifications */
  qualifications: string[];

  /** Work schedule */
  schedule: {
    monday: TimeSlot[];
    tuesday: TimeSlot[];
    wednesday: TimeSlot[];
    thursday: TimeSlot[];
    friday: TimeSlot[];
    saturday: TimeSlot[];
    sunday: TimeSlot[];
  };

  /** Officer status */
  status: "available" | "busy" | "offline" | "on_leave";

  /** Performance metrics */
  metrics?: {
    total_visits: number;
    success_rate: number;
    average_rating: number;
    total_distance_km: number;
  };

  /** Record timestamps */
  created_at: Date;
  updated_at: Date;
}

export interface TimeSlot {
  start: string; // HH:MM format
  end: string; // HH:MM format
}

export interface OfficerAvailability {
  officer_id: string;
  date: Date;
  time_slots: TimeSlot[];
  is_available: boolean;
  reason?: string; // if not available
}

// =============================================================================
// BOOKING MANAGEMENT
// =============================================================================

export interface Booking {
  /** Unique booking identifier */
  id: string;

  /** Associated patient */
  patient_id: string;
  patient?: Patient; // populated in queries

  /** Assigned officer */
  officer_id?: string;
  officer?: Officer; // populated in queries

  /** Scheduled date and time */
  scheduled_at: Date;

  /** Booking type */
  type: "blood_test" | "vaccine" | "checkup" | "follow_up" | "emergency";

  /** Service details */
  services: string[];

  /** Special instructions */
  instructions?: string;

  /** Booking status */
  status:
    | "pending"
    | "confirmed"
    | "assigned"
    | "in_progress"
    | "completed"
    | "cancelled"
    | "no_show";

  /** Priority level */
  priority: "low" | "normal" | "high" | "urgent";

  /** Estimated duration in minutes */
  estimated_duration: number;

  /** Confirmation details */
  confirmation?: {
    confirmed_at: Date;
    confirmed_by: "patient" | "system" | "admin";
    method: "line" | "phone" | "web";
  };

  /** Visit details (when officer arrives) */
  visit?: {
    arrived_at?: Date;
    started_at?: Date;
    completed_at?: Date;
    notes?: string;
    samples_collected?: string[];
    next_appointment?: Date;
  };

  /** Cancellation details */
  cancellation?: {
    cancelled_at: Date;
    cancelled_by: "patient" | "officer" | "system" | "admin";
    reason: string;
    refund_status?: "pending" | "processed" | "not_applicable";
  };

  /** Payment information */
  payment?: {
    amount: number;
    currency: "THB";
    method: "cash" | "card" | "transfer" | "insurance";
    status: "pending" | "paid" | "refunded";
    transaction_id?: string;
  };

  /** Record timestamps */
  created_at: Date;
  updated_at: Date;
}

export interface BookingSearchCriteria {
  patient_id?: string;
  officer_id?: string;
  status?: Booking["status"] | Booking["status"][];
  type?: Booking["type"];
  priority?: Booking["priority"];
  scheduled_after?: Date;
  scheduled_before?: Date;
  created_after?: Date;
  created_before?: Date;
  location_radius?: {
    center: Location;
    radius_km: number;
  };
}

// =============================================================================
// TASK MANAGEMENT
// =============================================================================

export interface Task {
  /** Unique task identifier */
  id: string;

  /** Related booking */
  booking_id: string;
  booking?: Booking; // populated in queries

  /** Task type */
  type:
    | "travel"
    | "visit"
    | "sample_collection"
    | "documentation"
    | "follow_up";

  /** Task description */
  description: string;

  /** Task status */
  status: "pending" | "in_progress" | "completed" | "skipped" | "failed";

  /** Assigned officer */
  officer_id: string;

  /** Scheduled timing */
  scheduled_start: Date;
  scheduled_end: Date;

  /** Actual timing */
  actual_start?: Date;
  actual_end?: Date;

  /** Task location */
  location?: Location;

  /** Task requirements */
  requirements?: string[];

  /** Equipment needed */
  equipment?: string[];

  /** Task notes */
  notes?: string;

  /** Completion details */
  completion?: {
    completed_by: string;
    completion_notes?: string;
    photos?: string[]; // file URLs
    documents?: string[]; // file URLs
  };

  /** Failure details */
  failure?: {
    failed_at: Date;
    reason: string;
    retry_scheduled?: Date;
  };

  /** Record timestamps */
  created_at: Date;
  updated_at: Date;
}

export interface TaskSearchCriteria {
  booking_id?: string;
  officer_id?: string;
  type?: Task["type"];
  status?: Task["status"] | Task["status"][];
  scheduled_after?: Date;
  scheduled_before?: Date;
  location_radius?: {
    center: Location;
    radius_km: number;
  };
}

// =============================================================================
// SESSION MANAGEMENT
// =============================================================================

export interface UserSession {
  /** LINE User ID */
  line_user_id: string;

  /** Current conversation state */
  state: "idle" | "booking" | "profile_update" | "support" | "feedback";

  /** Current step in flow */
  step?: string;

  /** Temporary form data */
  form_data?: Record<string, unknown>;

  /** Selected patient (for multi-patient accounts) */
  selected_patient_id?: string;

  /** Session metadata */
  metadata?: Record<string, unknown>;

  /** Session timestamps */
  created_at: Date;
  expires_at: Date;
}

// =============================================================================
// API REQUEST/RESPONSE TYPES
// =============================================================================

export interface ApiResponse<T = unknown> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
    details?: Record<string, unknown>;
  };
  meta?: {
    page?: number;
    limit?: number;
    total?: number;
    has_more?: boolean;
  };
}

export interface PaginationParams {
  page?: number;
  limit?: number;
  sort_by?: string;
  sort_order?: "asc" | "desc";
}

export interface CreateBookingRequest {
  patient: Partial<Patient> & Pick<Patient, "name" | "phone" | "address">;
  booking: Partial<Booking> &
    Pick<Booking, "scheduled_at" | "type" | "services">;
  line_user_id?: string;
}

export interface UpdateBookingRequest {
  scheduled_at?: Date;
  services?: string[];
  instructions?: string;
  priority?: Booking["priority"];
}

export interface AssignOfficerRequest {
  officer_id: string;
  notes?: string;
  auto_confirm?: boolean;
}

// =============================================================================
// LINE MESSAGING TYPES
// =============================================================================

export interface LineWebhookEvent {
  type:
    | "message"
    | "postback"
    | "follow"
    | "unfollow"
    | "join"
    | "leave"
    | "memberJoined"
    | "memberLeft";
  source: {
    type: "user" | "group" | "room";
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
}

export interface LineMessageEvent extends LineWebhookEvent {
  type: "message";
  message: {
    id: string;
    type:
      | "text"
      | "image"
      | "video"
      | "audio"
      | "file"
      | "location"
      | "sticker";
    text?: string;
    contentProvider?: {
      type: "line" | "external";
      originalContentUrl?: string;
      previewImageUrl?: string;
    };
  };
  replyToken: string;
}

export interface LinePostbackEvent extends LineWebhookEvent {
  type: "postback";
  postback: {
    data: string;
    params?: Record<string, string>;
  };
  replyToken: string;
}

export interface LineLocationMessage {
  type: "location";
  title: string;
  address: string;
  latitude: number;
  longitude: number;
}

// =============================================================================
// FORM VALIDATION TYPES
// =============================================================================

export interface ValidationError {
  field: string;
  message: string;
  code: string;
}

export interface FormValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

// =============================================================================
// UTILITY TYPES
// =============================================================================

export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends object ? DeepPartial<T[P]> : T[P];
};

export type RequiredFields<T, K extends keyof T> = T & Required<Pick<T, K>>;

export type OptionalFields<T, K extends keyof T> = Omit<T, K> &
  Partial<Pick<T, K>>;

// Entity status unions for type safety
export type EntityStatus =
  | Patient["status"]
  | Officer["status"]
  | Booking["status"]
  | Task["status"];

// Common filter types
export interface DateRangeFilter {
  start?: Date;
  end?: Date;
}

export interface LocationRadiusFilter {
  center: Location;
  radius_km: number;
}

// =============================================================================
// HEALTH CHECK TYPES
// =============================================================================

export interface HealthCheckResult {
  service: string;
  status: "healthy" | "unhealthy" | "degraded";
  latency?: number;
  error?: string;
  timestamp: Date;
}

export interface SystemHealth {
  overall_status: "healthy" | "unhealthy" | "degraded";
  services: HealthCheckResult[];
  uptime_seconds: number;
  version: string;
  environment: string;
}
