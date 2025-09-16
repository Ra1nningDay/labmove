/**
 * Sentry Configuration for LabMove Digital Assistant Platform
 *
 * Provides centralized error monitoring and performance tracking
 * with PII scrubbing for healthcare data compliance.
 */

import * as Sentry from "@sentry/nextjs";

// PII fields that should be scrubbed from error reports
const PII_FIELDS = [
  "name",
  "phone",
  "hn",
  "hospital",
  "referral",
  "address",
  "line_user_id",
  "email",
  "patient_name",
  "officer_name",
];

/**
 * Initialize Sentry with platform-specific configuration
 */
export function initSentry() {
  if (!process.env.SENTRY_DSN) {
    console.warn("Sentry DSN not configured - error monitoring disabled");
    return;
  }

  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.SENTRY_ENVIRONMENT || "development",

    // Performance monitoring configuration
    tracesSampleRate: process.env.NODE_ENV === "production" ? 0.1 : 1.0,

    // Scrub PII from error reports
    beforeSend(event: Sentry.ErrorEvent, _hint: Sentry.EventHint) {
      return scrubPII(event);
    },

    // Scrub PII from breadcrumbs
    beforeBreadcrumb(
      breadcrumb: Sentry.Breadcrumb,
      _hint?: Sentry.BreadcrumbHint
    ) {
      return scrubPIIFromBreadcrumb(breadcrumb);
    },

    // Configure which errors to ignore
    ignoreErrors: [
      // Browser extension errors
      "Non-Error exception captured",
      "ChunkLoadError",
      // Network errors that are expected
      "NetworkError",
      "fetch",
      // LINE platform specific errors that are expected
      "LIFF_ID_NOT_FOUND",
      "LIFF_INIT_FAILED",
    ],

    // Additional tags for filtering
    initialScope: {
      tags: {
        component: "labmove-platform",
        feature: "digital-assistant",
      },
    },
  });
}

/**
 * Scrub PII fields from Sentry event data
 */
function scrubPII(event: Sentry.ErrorEvent): Sentry.ErrorEvent | null {
  if (!event) return event;

  // Scrub from exception values
  if (event.exception?.values) {
    event.exception.values = event.exception.values.map((exception) => ({
      ...exception,
      value: scrubString(exception.value || ""),
      stacktrace: exception.stacktrace
        ? {
            ...exception.stacktrace,
            frames: exception.stacktrace.frames?.map((frame) => ({
              ...frame,
              vars: scrubObject(frame.vars),
            })),
          }
        : undefined,
    }));
  }

  // Scrub from request data
  if (event.request) {
    event.request = {
      ...event.request,
      data: scrubObject(event.request.data),
      query_string:
        typeof event.request.query_string === "string"
          ? scrubString(event.request.query_string)
          : scrubString(JSON.stringify(event.request.query_string || {})),
      headers: scrubObject(event.request.headers),
    };
  }

  // Scrub from extra context
  if (event.extra) {
    event.extra = scrubObject(event.extra);
  }

  // Scrub from user context (keep only safe fields)
  if (event.user) {
    event.user = {
      id: hashUserId(
        typeof event.user.id === "string"
          ? event.user.id
          : String(event.user.id)
      ), // Hash user IDs for privacy
      ip_address: undefined, // Remove IP addresses
    };
  }

  return event;
}

/**
 * Scrub PII from breadcrumb data
 */
function scrubPIIFromBreadcrumb(
  breadcrumb: Sentry.Breadcrumb
): Sentry.Breadcrumb | null {
  if (!breadcrumb) return breadcrumb;

  return {
    ...breadcrumb,
    message: scrubString(breadcrumb.message || ""),
    data: scrubObject(breadcrumb.data),
  };
}

/**
 * Recursively scrub PII fields from object
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
function scrubObject(obj: any): any {
  if (!obj || typeof obj !== "object") return obj;

  if (Array.isArray(obj)) {
    return obj.map((item) => scrubObject(item));
  }

  const scrubbed: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    if (
      PII_FIELDS.some((field) =>
        key.toLowerCase().includes(field.toLowerCase())
      )
    ) {
      scrubbed[key] = "[PII_SCRUBBED]";
    } else if (typeof value === "object") {
      scrubbed[key] = scrubObject(value);
    } else {
      scrubbed[key] = value;
    }
  }

  return scrubbed;
}

/**
 * Scrub PII patterns from string content
 */
function scrubString(str: string): string {
  if (!str) return str;

  // Thai phone number pattern
  str = str.replace(/0[0-9]{8,9}/g, "[PHONE_SCRUBBED]");

  // Email pattern
  str = str.replace(
    /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
    "[EMAIL_SCRUBBED]"
  );

  // LINE User ID pattern
  str = str.replace(/U[a-fA-F0-9]{32}/g, "[LINE_USER_ID_SCRUBBED]");

  // Hospital number pattern
  str = str.replace(/HN\d+/gi, "[HN_SCRUBBED]");

  return str;
}

/**
 * Hash user ID for privacy while maintaining trackability
 */
function hashUserId(userId: string | undefined): string | undefined {
  if (!userId) return undefined;

  // Simple hash for user ID (not cryptographically secure, but sufficient for privacy)
  let hash = 0;
  for (let i = 0; i < userId.length; i++) {
    const char = userId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash; // Convert to 32-bit integer
  }
  return `user_${Math.abs(hash)}`;
}

/**
 * Custom error reporting for healthcare-specific contexts
 */
export function reportHealthcareError(
  error: Error,
  context: {
    operation: string;
    userId?: string;
    bookingId?: string;
    eventId?: string;
    requestId?: string;
    severity?: "low" | "medium" | "high" | "critical";
  }
) {
  Sentry.withScope((scope) => {
    // Set healthcare-specific tags
    scope.setTag("healthcare_operation", context.operation);
    scope.setLevel(getSentryLevel(context.severity));

    // Add safe context (no PII)
    scope.setContext("operation_context", {
      operation: context.operation,
      user_hash: context.userId ? hashUserId(context.userId) : undefined,
      booking_hash: context.bookingId
        ? hashBookingId(context.bookingId)
        : undefined,
      event_id: context.eventId ? hashEventId(context.eventId) : undefined,
      request_id: context.requestId,
      timestamp: new Date().toISOString(),
    });

    Sentry.captureException(error);
  });
}

/**
 * Performance monitoring for critical healthcare operations
 */
export function startPerformanceMonitoring(operationName: string) {
  return Sentry.startSpan(
    {
      name: operationName,
      op: "healthcare_operation",
    },
    (span) => span
  );
}

/**
 * Convert severity to Sentry level
 */
function getSentryLevel(severity?: string): Sentry.SeverityLevel {
  switch (severity) {
    case "critical":
      return "fatal";
    case "high":
      return "error";
    case "medium":
      return "warning";
    case "low":
      return "info";
    default:
      return "error";
  }
}

/**
 * Hash booking ID for privacy
 */
function hashBookingId(bookingId: string): string {
  let hash = 0;
  for (let i = 0; i < bookingId.length; i++) {
    const char = bookingId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `booking_${Math.abs(hash)}`;
}

/**
 * Hash event ID for privacy
 */
function hashEventId(eventId: string): string {
  let hash = 0;
  for (let i = 0; i < eventId.length; i++) {
    const char = eventId.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return `event_${Math.abs(hash)}`;
}

// Initialize Sentry when this module is imported
if (typeof window !== "undefined" || process.env.NODE_ENV !== "test") {
  initSentry();
}
