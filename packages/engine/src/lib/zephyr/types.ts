/**
 * Zephyr Client Types
 *
 * Shared type definitions for the Zephyr email gateway client.
 * These types are used by services to communicate with Zephyr.
 */

// =============================================================================
// Email Types & Templates
// =============================================================================

/**
 * Email categories for routing and handling.
 */
export type EmailType =
  | "transactional"
  | "notification"
  | "verification"
  | "sequence"
  | "lifecycle"
  | "broadcast";

/**
 * Template names for Zephyr rendering.
 */
export type TemplateName =
  | "welcome"
  | "day-1"
  | "day-7"
  | "day-14"
  | "day-30"
  | "porch-reply"
  | "verification-code"
  | "payment-received"
  | "payment-failed"
  | "trial-ending"
  | "feedback-forward"
  | "trace-notification"
  | "raw";

// =============================================================================
// Request / Response
// =============================================================================

/**
 * Email send request to Zephyr.
 */
export interface ZephyrRequest {
  /** Email category for routing */
  type: EmailType;

  /** Template to render (or "raw" for pre-rendered) */
  template: TemplateName | string;

  /** Recipient email address */
  to: string;

  /** Template data for personalization */
  data?: Record<string, unknown>;

  /** Override the default from address */
  from?: string;

  /** Override the subject line */
  subject?: string;

  /** Pre-rendered HTML (required when template is "raw") */
  html?: string;

  /** Pre-rendered plain text (optional for "raw" template) */
  text?: string;

  /** Schedule for later delivery (ISO timestamp) */
  scheduledAt?: string;

  /** Idempotency key to prevent duplicate sends */
  idempotencyKey?: string;

  /** Metadata for logging */
  metadata?: ZephyrMetadata;
}

/**
 * Metadata for tracing and debugging.
 */
export interface ZephyrMetadata {
  tenant?: string;
  source?: string;
  correlationId?: string;
  audienceType?: string;
}

/**
 * Response from Zephyr.
 */
export interface ZephyrResponse {
  success: boolean;
  messageId?: string;
  error?: ZephyrError;
  metadata: ZephyrResponseMetadata;
}

/**
 * Structured error response.
 */
export interface ZephyrError {
  code: ZephyrErrorCode;
  message: string;
  retryable: boolean;
  details?: Record<string, unknown>;
}

/**
 * Error codes.
 */
export type ZephyrErrorCode =
  | "INVALID_REQUEST"
  | "INVALID_TEMPLATE"
  | "INVALID_RECIPIENT"
  | "RATE_LIMITED"
  | "UNSUBSCRIBED"
  | "PROVIDER_ERROR"
  | "TEMPLATE_ERROR"
  | "CIRCUIT_OPEN"
  | "IDEMPOTENCY_CONFLICT"
  | "NETWORK_ERROR";

/**
 * Processing metadata.
 */
export interface ZephyrResponseMetadata {
  provider: string;
  attempts: number;
  latencyMs: number;
  requestId: string;
}

// =============================================================================
// Template-Specific Data Types
// =============================================================================

/**
 * Data for porch-reply template.
 */
export interface PorchReplyData {
  content: string;
  visitId: string;
  visitNumber?: string;
  subject?: string;
  visitorName?: string;
}

/**
 * Data for verification-code template.
 */
export interface VerificationCodeData {
  code: string;
  expiresIn?: string;
  name?: string;
}

/**
 * Data for payment templates.
 */
export interface PaymentData {
  name?: string;
  planName?: string;
  amount?: string;
  date?: string;
  nextBillingDate?: string;
  daysRemaining?: number;
  updatePaymentUrl?: string;
  manageUrl?: string;
}

/**
 * Data for sequence templates.
 */
export interface SequenceData {
  name?: string;
  audienceType?: "wanderer" | "promo" | "rooted";
}
