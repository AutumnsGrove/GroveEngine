/**
 * Email Scheduling via Zephyr
 *
 * Handles scheduling welcome sequences and individual emails
 * through Grove's unified email gateway.
 *
 * @example
 * ```typescript
 * import { scheduleWelcomeSequence } from '@autumnsgrove/groveengine/email/schedule';
 *
 * await scheduleWelcomeSequence({
 *   email: 'wanderer@example.com',
 *   name: 'Wanderer',
 *   audienceType: 'wanderer',
 * });
 * ```
 */
import { sendSequenceEmail, sendRawEmail } from "../zephyr/client";
import { SEQUENCES, type AudienceType, type SendResult } from "./types";

// =============================================================================
// Template to Zephyr mapping
// =============================================================================

/**
 * Map Engine template names to Zephyr template names.
 */
const TEMPLATE_TO_ZEPHYR: Record<
  string,
  "welcome" | "day-1" | "day-7" | "day-14" | "day-30"
> = {
  WelcomeEmail: "welcome",
  Day1Email: "day-1",
  Day7Email: "day-7",
  Day14Email: "day-14",
  Day30Email: "day-30",
};

// =============================================================================
// Schedule Welcome Sequence
// =============================================================================

export interface ScheduleSequenceOptions {
  /** Recipient email address */
  email: string;
  /** Recipient name (optional, for personalization) */
  name?: string;
  /** Which audience segment this user belongs to */
  audienceType: AudienceType;
  /** @deprecated Zephyr handles API key internally */
  resendApiKey?: string;
  /** @deprecated Zephyr handles from address based on email type */
  from?: string;
  /** Base URL for links (defaults to grove.place) */
  baseUrl?: string;
}

export interface ScheduleSequenceResult {
  success: boolean;
  scheduled: number;
  errors: string[];
  messageIds: string[];
}

/**
 * Schedule a complete welcome sequence for a new signup
 *
 * Uses Zephyr's scheduling capability to queue all emails at once.
 * Emails are scheduled relative to the current time.
 *
 * @example
 * ```typescript
 * const result = await scheduleWelcomeSequence({
 *   email: 'new-user@example.com',
 *   name: 'Wanderer',
 *   audienceType: 'wanderer',
 * });
 *
 * if (result.success) {
 *   console.log(`Scheduled ${result.scheduled} emails`);
 * }
 * ```
 */
export async function scheduleWelcomeSequence(
  options: ScheduleSequenceOptions,
): Promise<ScheduleSequenceResult> {
  const { email, name, audienceType } = options;

  const sequence = SEQUENCES[audienceType];
  const now = new Date();
  const signupDate = now.toISOString().split("T")[0]; // For idempotency key

  const result: ScheduleSequenceResult = {
    success: true,
    scheduled: 0,
    errors: [],
    messageIds: [],
  };

  for (const { dayOffset, template } of sequence) {
    try {
      // Map Engine template to Zephyr template
      const zephyrTemplate = TEMPLATE_TO_ZEPHYR[template];
      if (!zephyrTemplate) {
        result.errors.push(`Unknown template: ${template}`);
        continue;
      }

      // Calculate scheduled time (undefined for immediate)
      const scheduledAt =
        dayOffset === 0 ? undefined : addDays(now, dayOffset).toISOString();

      // Create idempotency key to prevent duplicates
      const idempotencyKey = `${email}-${zephyrTemplate}-${signupDate}`;

      // Send via Zephyr
      const response = await sendSequenceEmail(
        zephyrTemplate,
        email,
        { name, audienceType },
        { scheduledAt, idempotencyKey },
      );

      if (!response.success) {
        result.errors.push(
          `Day ${dayOffset}: ${response.error?.message || "Unknown error"}`,
        );
        result.success = false;
      } else if (response.messageId) {
        result.messageIds.push(response.messageId);
        result.scheduled++;
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      result.errors.push(`Day ${dayOffset}: ${message}`);
      result.success = false;
    }
  }

  return result;
}

// =============================================================================
// Send Single Email
// =============================================================================

export interface SendEmailOptions {
  /** Recipient email address */
  email: string;
  /** Email subject line */
  subject: string;
  /** Rendered HTML content */
  html: string;
  /** Plain text version (optional) */
  text?: string;
  /** @deprecated Zephyr handles API key internally */
  resendApiKey?: string;
  /** Custom from address */
  from?: string;
  /** Schedule for later (ISO timestamp) */
  scheduledAt?: string;
}

/**
 * Send a single email via Zephyr
 *
 * Lower-level function for sending individual emails.
 * Use scheduleWelcomeSequence for automated sequences.
 */
export async function sendEmail(
  options: SendEmailOptions,
): Promise<SendResult> {
  const { email, subject, html, text, from, scheduledAt } = options;

  try {
    const response = await sendRawEmail("sequence", email, {
      subject,
      html,
      text,
      from,
      scheduledAt,
      metadata: { source: "engine-schedule" },
    });

    if (!response.success) {
      return {
        success: false,
        error: response.error?.message || "Failed to send email",
      };
    }

    return {
      success: true,
      messageId: response.messageId,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

// =============================================================================
// Helpers
// =============================================================================

/**
 * Add days to a date
 */
function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

/**
 * Calculate the next sequence stage based on current stage
 */
export function getNextStage(
  currentStage: number,
  audienceType: AudienceType,
): number {
  const sequence = SEQUENCES[audienceType];
  const stages = sequence.map((s) => s.dayOffset);

  // Find the next stage after current
  const nextStage = stages.find((s) => s > currentStage);

  // Return next stage or -1 if sequence complete
  return nextStage ?? -1;
}

/**
 * Check if a user should receive their next email
 *
 * @param lastEmailAt - ISO timestamp of last email sent
 * @param currentStage - Current sequence stage
 * @param audienceType - User's audience type
 * @returns True if enough time has passed for next email
 */
export function shouldSendNextEmail(
  lastEmailAt: string | null,
  currentStage: number,
  audienceType: AudienceType,
): boolean {
  // Sequence complete
  if (currentStage === -1) return false;

  // Never received an email
  if (!lastEmailAt) return true;

  const sequence = SEQUENCES[audienceType];
  const currentIndex = sequence.findIndex((s) => s.dayOffset === currentStage);
  const nextEmail = sequence[currentIndex + 1];

  // No more emails in sequence
  if (!nextEmail) return false;

  // Calculate days since last email
  const lastSent = new Date(lastEmailAt);
  const now = new Date();
  const daysSince = Math.floor(
    (now.getTime() - lastSent.getTime()) / (1000 * 60 * 60 * 24),
  );

  // Should send if enough days have passed
  const daysNeeded = nextEmail.dayOffset - currentStage;
  return daysSince >= daysNeeded;
}
