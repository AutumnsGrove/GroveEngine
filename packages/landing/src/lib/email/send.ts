/**
 * Landing Page Email Sending
 *
 * Sends welcome emails to new signups on the landing page.
 * Uses Zephyr email gateway for reliable delivery.
 */

import { sendSequenceEmail } from "@autumnsgrove/groveengine/zephyr";

/**
 * Send a welcome email to a new landing page signup.
 *
 * @param toEmail - Recipient email address
 * @param _apiKey - @deprecated Zephyr handles API key internally
 * @returns Success status and optional error
 */
export async function sendWelcomeEmail(
  toEmail: string,
  _apiKey?: string,
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await sendSequenceEmail(
      "welcome",
      toEmail,
      {
        audienceType: "wanderer", // Landing page signups are wanderers
      },
      {
        idempotencyKey: `landing-welcome-${toEmail}-${new Date().toISOString().split("T")[0]}`,
      },
    );

    if (!result.success) {
      console.error("[Landing Email] Zephyr error:", result.error);
      return { success: false, error: result.error?.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[Landing Email] Exception:", err);
    return { success: false, error: "Failed to send email" };
  }
}
