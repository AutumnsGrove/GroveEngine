/**
 * Trace Email Notification Service
 *
 * Sends email notifications when feedback is submitted via Trace.
 * Uses Zephyr email gateway for reliable delivery.
 */

import { Zephyr } from "../../zephyr";

export interface TraceNotification {
  sourcePath: string;
  vote: "up" | "down";
  comment?: string;
  id: string;
}

/**
 * Send email notification for new trace feedback.
 *
 * @param _apiKey - @deprecated Zephyr handles API key internally
 * @param adminEmail - Email address to notify
 * @param trace - Trace feedback data
 * @returns Success status and optional error
 */
export async function sendTraceNotification(
  _apiKey: string,
  adminEmail: string,
  trace: TraceNotification,
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await Zephyr.send({
      type: "notification",
      template: "trace-notification",
      to: adminEmail,
      data: {
        sourcePath: trace.sourcePath,
        vote: trace.vote,
        comment: trace.comment,
        traceId: trace.id,
      },
      metadata: {
        source: "trace-service",
        correlationId: trace.id,
      },
    });

    if (!result.success) {
      console.error("[Trace Email] Zephyr error:", result.error);
      return { success: false, error: result.error?.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[Trace Email] Exception:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to send email",
    };
  }
}
