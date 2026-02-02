/**
 * D1 Email Logging
 *
 * Logs all email send attempts to D1 for audit and debugging.
 * Does NOT log email body content (privacy).
 */

import type {
  ZephyrRequest,
  ZephyrResponse,
  ZephyrLogRecord,
  Env,
} from "../types";

/**
 * Generate a unique ID for log records.
 */
function generateId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `zeph_${timestamp}_${random}`;
}

/**
 * Log an email send attempt to D1.
 *
 * @param env - Worker environment with D1 binding
 * @param request - Original Zephyr request
 * @param response - Response from send attempt
 * @param subject - Rendered subject line (optional)
 */
export async function logEmailSend(
  env: Env,
  request: ZephyrRequest,
  response: ZephyrResponse,
  subject?: string,
): Promise<void> {
  try {
    const now = Math.floor(Date.now() / 1000);

    const record: ZephyrLogRecord = {
      id: generateId(),
      message_id: response.messageId || null,
      type: request.type,
      template: request.template,
      recipient: request.to,
      subject: subject || request.subject || null,
      success: response.success ? 1 : 0,
      error_code: response.error?.code || null,
      error_message: response.error?.message || null,
      provider: response.metadata.provider || null,
      attempts: response.metadata.attempts,
      latency_ms: response.metadata.latencyMs,
      tenant: request.metadata?.tenant || null,
      source: request.metadata?.source || null,
      correlation_id: request.metadata?.correlationId || null,
      idempotency_key: request.idempotencyKey || null,
      created_at: now,
      scheduled_at: request.scheduledAt
        ? Math.floor(new Date(request.scheduledAt).getTime() / 1000)
        : null,
      sent_at: response.success ? now : null,
    };

    await env.DB.prepare(
      `INSERT INTO zephyr_logs (
        id, message_id, type, template, recipient, subject,
        success, error_code, error_message, provider, attempts, latency_ms,
        tenant, source, correlation_id, idempotency_key,
        created_at, scheduled_at, sent_at
      ) VALUES (
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?, ?, ?,
        ?, ?, ?, ?,
        ?, ?, ?
      )`,
    )
      .bind(
        record.id,
        record.message_id,
        record.type,
        record.template,
        record.recipient,
        record.subject,
        record.success,
        record.error_code,
        record.error_message,
        record.provider,
        record.attempts,
        record.latency_ms,
        record.tenant,
        record.source,
        record.correlation_id,
        record.idempotency_key,
        record.created_at,
        record.scheduled_at,
        record.sent_at,
      )
      .run();
  } catch (error) {
    // Don't fail the email send if logging fails
    console.error("Failed to log email send:", error);
  }
}

/**
 * Check if an idempotency key has already been used.
 *
 * @returns The existing log record if found, null otherwise
 */
export async function checkIdempotency(
  env: Env,
  key: string,
): Promise<ZephyrLogRecord | null> {
  try {
    const result = await env.DB.prepare(
      `SELECT * FROM zephyr_logs WHERE idempotency_key = ? LIMIT 1`,
    )
      .bind(key)
      .first<ZephyrLogRecord>();

    return result || null;
  } catch (error) {
    console.error("Failed to check idempotency:", error);
    return null;
  }
}

/**
 * Get recent email logs for a recipient.
 */
export async function getLogsByRecipient(
  env: Env,
  email: string,
  limit: number = 50,
): Promise<ZephyrLogRecord[]> {
  const result = await env.DB.prepare(
    `SELECT * FROM zephyr_logs
     WHERE recipient = ?
     ORDER BY created_at DESC
     LIMIT ?`,
  )
    .bind(email, limit)
    .all<ZephyrLogRecord>();

  return result.results || [];
}

/**
 * Get email statistics for a time period.
 */
export async function getEmailStats(
  env: Env,
  sinceTimestamp: number,
): Promise<{
  total: number;
  successful: number;
  failed: number;
  byType: Record<string, number>;
  byTemplate: Record<string, number>;
}> {
  const [totalResult, byTypeResult, byTemplateResult] = await Promise.all([
    env.DB.prepare(
      `SELECT
        COUNT(*) as total,
        SUM(CASE WHEN success = 1 THEN 1 ELSE 0 END) as successful,
        SUM(CASE WHEN success = 0 THEN 1 ELSE 0 END) as failed
      FROM zephyr_logs
      WHERE created_at >= ?`,
    )
      .bind(sinceTimestamp)
      .first<{ total: number; successful: number; failed: number }>(),

    env.DB.prepare(
      `SELECT type, COUNT(*) as count
      FROM zephyr_logs
      WHERE created_at >= ?
      GROUP BY type`,
    )
      .bind(sinceTimestamp)
      .all<{ type: string; count: number }>(),

    env.DB.prepare(
      `SELECT template, COUNT(*) as count
      FROM zephyr_logs
      WHERE created_at >= ?
      GROUP BY template`,
    )
      .bind(sinceTimestamp)
      .all<{ template: string; count: number }>(),
  ]);

  const byType: Record<string, number> = {};
  for (const row of byTypeResult.results || []) {
    byType[row.type] = row.count;
  }

  const byTemplate: Record<string, number> = {};
  for (const row of byTemplateResult.results || []) {
    byTemplate[row.template] = row.count;
  }

  return {
    total: totalResult?.total || 0,
    successful: totalResult?.successful || 0,
    failed: totalResult?.failed || 0,
    byType,
    byTemplate,
  };
}
