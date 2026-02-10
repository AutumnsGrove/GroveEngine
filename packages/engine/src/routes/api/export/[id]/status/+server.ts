/**
 * Check Export Status
 *
 * GET /api/export/[id]/status
 *
 * Returns the current status, progress, and metadata for a zip export job.
 * Includes error messages if the export failed, and file size once complete.
 *
 * Response includes:
 * - id: string
 * - status: 'pending' | 'querying' | 'assembling' | 'uploading' | 'notifying' | 'complete' | 'failed' | 'expired'
 * - progress: 0-100 (percentage)
 * - error: string | null
 * - fileSize: number | null
 * - itemCounts: { posts, pages, media } | null
 * - createdAt: number (unix timestamp)
 * - completedAt: number | null (unix timestamp)
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getVerifiedTenantId } from "$lib/auth/session.js";
import { API_ERRORS, throwGroveError, buildErrorJson } from "$lib/errors";
import { validateUUID } from "$lib/utils/validation.js";

interface StorageExport {
  id: string;
  status: string;
  progress: number;
  error_message: string | null;
  file_size_bytes: number | null;
  item_counts: string | null;
  created_at: number;
  completed_at: number | null;
  expires_at: number | null;
}

export const GET: RequestHandler = async ({ params, platform, locals }) => {
  if (!locals.user) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  if (!platform?.env?.DB) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  try {
    // Validate export ID format (UUID) to prevent injection
    if (!validateUUID(params.id)) {
      throwGroveError(400, API_ERRORS.VALIDATION_FAILED, "API", {
        detail: "Invalid export ID format",
      });
    }

    // Get verified tenant
    const tenantId = await getVerifiedTenantId(
      platform.env.DB,
      locals.tenantId,
      locals.user,
    );

    // Query export record
    const record = await platform.env.DB.prepare(
      `SELECT id, status, progress, error_message, file_size_bytes, item_counts, created_at, completed_at, expires_at
       FROM storage_exports
       WHERE id = ? AND tenant_id = ?`,
    )
      .bind(params.id, tenantId)
      .first<StorageExport>();

    if (!record) {
      return json(buildErrorJson(API_ERRORS.EXPORT_NOT_FOUND), {
        status: 404,
      });
    }

    // Check if export has expired
    const now = Math.floor(Date.now() / 1000);
    const isExpired =
      record.expires_at &&
      record.expires_at < now &&
      record.status === "complete";

    // Safely parse item_counts JSON
    let itemCounts = null;
    if (record.item_counts) {
      try {
        itemCounts = JSON.parse(record.item_counts as string);
      } catch {
        // If JSON parsing fails, leave as null rather than exposing error
        itemCounts = null;
      }
    }

    return json({
      id: record.id,
      status: isExpired ? "expired" : record.status,
      progress: record.progress,
      error: record.error_message || null,
      fileSize: record.file_size_bytes || null,
      itemCounts,
      createdAt: record.created_at,
      completedAt: record.completed_at || null,
      expiresAt: record.expires_at || null,
    });
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
  }
};
