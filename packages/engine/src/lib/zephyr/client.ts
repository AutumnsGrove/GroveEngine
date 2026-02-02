/**
 * Zephyr Client
 *
 * Client for communicating with the Zephyr email gateway.
 * Use this from any Grove service to send emails.
 *
 * @example
 * ```typescript
 * import { Zephyr } from '@autumnsgrove/groveengine/zephyr';
 *
 * const result = await Zephyr.send({
 *   type: "notification",
 *   template: "porch-reply",
 *   to: "visitor@example.com",
 *   data: { content: "Thanks for reaching out!" },
 * });
 *
 * if (!result.success) {
 *   console.error("Email failed:", result.error);
 * }
 * ```
 */

import type {
  ZephyrRequest,
  ZephyrResponse,
  ZephyrError,
  EmailType,
  TemplateName,
} from "./types";

// =============================================================================
// Configuration
// =============================================================================

/**
 * Zephyr worker URL.
 * In production, this is the deployed worker URL.
 * In development, it can be overridden via environment variable.
 */
const ZEPHYR_URL =
  typeof process !== "undefined" && process.env?.ZEPHYR_URL
    ? process.env.ZEPHYR_URL
    : "https://grove-zephyr.autumnsgrove.workers.dev";

/**
 * Request timeout in milliseconds.
 */
const REQUEST_TIMEOUT = 30000;

// =============================================================================
// Zephyr Client
// =============================================================================

/**
 * Zephyr email gateway client.
 */
export const Zephyr = {
  /**
   * Send an email via Zephyr.
   *
   * @example
   * ```typescript
   * // Send a Porch reply notification
   * const result = await Zephyr.send({
   *   type: "notification",
   *   template: "porch-reply",
   *   to: recipientEmail,
   *   data: {
   *     content: replyContent,
   *     visitId: visit.id,
   *     visitNumber: visit.visit_number,
   *   },
   *   metadata: {
   *     source: "porch-admin",
   *     correlationId: visit.id,
   *   },
   * });
   *
   * if (!result.success) {
   *   // Error is RETURNED, not swallowed
   *   return { replySuccess: true, emailFailed: true };
   * }
   * ```
   */
  async send(request: ZephyrRequest): Promise<ZephyrResponse> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT);

      const response = await fetch(`${ZEPHYR_URL}/send`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(request),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = (await response.json()) as ZephyrResponse;
      return data;
    } catch (error) {
      // Network or timeout error
      const message = error instanceof Error ? error.message : "Network error";

      return {
        success: false,
        error: {
          code: "NETWORK_ERROR",
          message: `Failed to reach Zephyr: ${message}`,
          retryable: true,
        },
        metadata: {
          provider: "none",
          attempts: 0,
          latencyMs: 0,
          requestId: "client-error",
        },
      };
    }
  },

  /**
   * Check Zephyr health status.
   */
  async health(): Promise<{
    status: string;
    circuits?: Record<string, string>;
  }> {
    try {
      const response = await fetch(`${ZEPHYR_URL}/health`);
      return response.json();
    } catch {
      return { status: "unreachable" };
    }
  },

  /**
   * Get email statistics.
   */
  async stats(): Promise<unknown> {
    try {
      const response = await fetch(`${ZEPHYR_URL}/stats`);
      return response.json();
    } catch {
      return { error: "Failed to fetch stats" };
    }
  },
};

// =============================================================================
// Convenience Functions
// =============================================================================

/**
 * Send a Porch reply notification.
 */
export async function sendPorchReply(
  to: string,
  data: {
    content: string;
    visitId: string;
    visitNumber?: string;
    subject?: string;
    visitorName?: string;
  },
  metadata?: { correlationId?: string },
): Promise<ZephyrResponse> {
  return Zephyr.send({
    type: "notification",
    template: "porch-reply",
    to,
    data,
    metadata: {
      source: "porch",
      ...metadata,
    },
  });
}

/**
 * Send a verification code email.
 */
export async function sendVerificationCode(
  to: string,
  code: string,
  options?: { name?: string; expiresIn?: string },
): Promise<ZephyrResponse> {
  return Zephyr.send({
    type: "verification",
    template: "verification-code",
    to,
    data: {
      code,
      name: options?.name,
      expiresIn: options?.expiresIn || "15 minutes",
    },
    metadata: {
      source: "plant-verification",
    },
  });
}

/**
 * Send a payment notification.
 */
export async function sendPaymentEmail(
  type: "received" | "failed" | "trial-ending",
  to: string,
  data: {
    name?: string;
    planName?: string;
    amount?: string;
    date?: string;
    nextBillingDate?: string;
    daysRemaining?: number;
    updatePaymentUrl?: string;
    manageUrl?: string;
  },
): Promise<ZephyrResponse> {
  const templateMap = {
    received: "payment-received",
    failed: "payment-failed",
    "trial-ending": "trial-ending",
  } as const;

  return Zephyr.send({
    type: "lifecycle",
    template: templateMap[type],
    to,
    data,
    metadata: {
      source: "plant-payments",
    },
  });
}

/**
 * Send a welcome sequence email.
 */
export async function sendSequenceEmail(
  template: "welcome" | "day-1" | "day-7" | "day-14" | "day-30",
  to: string,
  data: {
    name?: string;
    audienceType?: "wanderer" | "promo" | "rooted";
  },
  options?: { scheduledAt?: string; idempotencyKey?: string },
): Promise<ZephyrResponse> {
  return Zephyr.send({
    type: "sequence",
    template,
    to,
    data,
    scheduledAt: options?.scheduledAt,
    idempotencyKey: options?.idempotencyKey,
    metadata: {
      source: "engine-sequences",
      audienceType: data.audienceType,
    },
  });
}

/**
 * Send a raw HTML email (pre-rendered).
 */
export async function sendRawEmail(
  type: EmailType,
  to: string,
  options: {
    subject: string;
    html: string;
    text?: string;
    from?: string;
    scheduledAt?: string;
    metadata?: { source?: string; correlationId?: string };
  },
): Promise<ZephyrResponse> {
  return Zephyr.send({
    type,
    template: "raw",
    to,
    subject: options.subject,
    html: options.html,
    text: options.text,
    from: options.from,
    scheduledAt: options.scheduledAt,
    metadata: options.metadata,
  });
}

// Re-export types
export type {
  ZephyrRequest,
  ZephyrResponse,
  ZephyrError,
  EmailType,
  TemplateName,
};
