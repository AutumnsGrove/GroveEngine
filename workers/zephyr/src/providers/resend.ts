/**
 * Resend Email Provider
 *
 * Primary email provider implementation with retry logic
 * and exponential backoff.
 */

import type {
  EmailProvider,
  ProviderRequest,
  ProviderResponse,
  RetryConfig,
} from "../types";
import { DEFAULT_RETRY_CONFIG } from "../types";

/**
 * Resend API response shape.
 */
interface ResendResponse {
  id?: string;
  error?: {
    message: string;
    name?: string;
  };
}

/**
 * Resend email provider.
 */
export class ResendProvider implements EmailProvider {
  readonly name = "resend";
  private apiKey: string;
  private retryConfig: RetryConfig;

  constructor(apiKey: string, retryConfig?: Partial<RetryConfig>) {
    this.apiKey = apiKey;
    this.retryConfig = { ...DEFAULT_RETRY_CONFIG, ...retryConfig };
  }

  /**
   * Send an email via Resend with retry logic.
   */
  async send(request: ProviderRequest): Promise<ProviderResponse> {
    let lastError: string | undefined;
    let lastStatusCode: number | undefined;

    for (let attempt = 1; attempt <= this.retryConfig.maxAttempts; attempt++) {
      try {
        const response = await this.sendOnce(request);

        if (response.success) {
          return response;
        }

        // Check if error is retryable
        if (response.statusCode && response.statusCode >= 500) {
          lastError = response.error;
          lastStatusCode = response.statusCode;

          // Wait before retry (unless this is the last attempt)
          if (attempt < this.retryConfig.maxAttempts) {
            const delay = this.calculateDelay(attempt);
            await this.sleep(delay);
          }
          continue;
        }

        // Non-retryable error (4xx)
        return response;
      } catch (error) {
        lastError = error instanceof Error ? error.message : String(error);

        // Network/fetch errors are retryable
        if (attempt < this.retryConfig.maxAttempts) {
          const delay = this.calculateDelay(attempt);
          await this.sleep(delay);
        }
      }
    }

    // All retries exhausted
    return {
      success: false,
      error: lastError || "Max retries exceeded",
      statusCode: lastStatusCode,
    };
  }

  /**
   * Single send attempt without retry.
   */
  private async sendOnce(request: ProviderRequest): Promise<ProviderResponse> {
    const body: Record<string, unknown> = {
      from: request.from,
      to: request.to,
      subject: request.subject,
      html: request.html,
    };

    if (request.text) {
      body.text = request.text;
    }

    if (request.replyTo) {
      body.reply_to = request.replyTo;
    }

    if (request.scheduledAt) {
      body.scheduled_at = request.scheduledAt;
    }

    if (request.tags && request.tags.length > 0) {
      body.tags = request.tags.map((name) => ({ name }));
    }

    const response = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${this.apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    const data = (await response.json()) as ResendResponse;

    if (!response.ok || data.error) {
      return {
        success: false,
        error: data.error?.message || `HTTP ${response.status}`,
        statusCode: response.status,
      };
    }

    return {
      success: true,
      messageId: data.id,
    };
  }

  /**
   * Calculate delay for exponential backoff.
   */
  private calculateDelay(attempt: number): number {
    const delay =
      this.retryConfig.baseDelayMs *
      Math.pow(this.retryConfig.backoffMultiplier, attempt - 1);

    // Add jitter (±10%)
    const jitter = delay * 0.1 * (Math.random() * 2 - 1);

    return Math.min(delay + jitter, this.retryConfig.maxDelayMs);
  }

  /**
   * Sleep for a given duration.
   */
  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Check if Resend is healthy (simple connectivity check).
   */
  async isHealthy(): Promise<boolean> {
    try {
      // Use Resend's API root or a lightweight endpoint
      const response = await fetch("https://api.resend.com", {
        method: "GET",
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      // 401 is expected (need endpoint), but connection worked
      return response.status !== 0;
    } catch {
      return false;
    }
  }
}

/**
 * Create a Resend provider instance.
 */
export function createResendProvider(
  apiKey: string,
  config?: Partial<RetryConfig>,
): ResendProvider {
  return new ResendProvider(apiKey, config);
}
