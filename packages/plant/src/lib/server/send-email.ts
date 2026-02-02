/**
 * Email Sending Utility
 *
 * @deprecated Use Zephyr directly for email sending.
 * This file is kept for backward compatibility during migration.
 *
 * import { sendRawEmail } from '@autumnsgrove/groveengine/zephyr';
 */

import { sendRawEmail } from "@autumnsgrove/groveengine/zephyr";

export async function sendEmail(params: {
  to: string;
  subject: string;
  html: string;
  text: string;
  resendApiKey?: string; // Deprecated: Zephyr handles API key
}): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await sendRawEmail("transactional", params.to, {
      subject: params.subject,
      html: params.html,
      text: params.text,
      metadata: { source: "plant-legacy" },
    });

    if (!result.success) {
      console.error("[Zephyr] Error:", result.error);
      return { success: false, error: result.error?.message };
    }

    return { success: true };
  } catch (err) {
    console.error("[Zephyr] Exception:", err);
    return {
      success: false,
      error: err instanceof Error ? err.message : "Failed to send email",
    };
  }
}
