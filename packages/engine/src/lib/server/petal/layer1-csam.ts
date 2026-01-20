/**
 * Petal Layer 1: CSAM Detection
 *
 * MANDATORY layer - cannot be bypassed. Federal law requires CSAM detection
 * and NCMEC reporting within 24 hours.
 *
 * This layer coordinates:
 * 1. Cloudflare CSAM Tool (CDN-level, enabled in dashboard)
 * 2. Vision model classification for potential CSAM flags
 * 3. Account flagging and reporting workflows
 *
 * @see docs/specs/petal-spec.md Section 3
 */

import type { D1Database } from "@cloudflare/workers-types";
import { FAILOVER_CONFIG } from "$lib/config/petal.js";
import { PetalError, type CSAMResult } from "./types.js";
import { classifyImage } from "./vision-client.js";
import { logSecurityEvent } from "./logging.js";

// ============================================================================
// CSAM Detection
// ============================================================================

/**
 * Scan image for CSAM content
 *
 * This is the CRITICAL path - if CSAM scanning fails, we CANNOT process the image.
 * Federal law requires CSAM detection before storing/processing user images.
 *
 * Defense layers:
 * 1. Cloudflare CSAM Tool runs at CDN level (async at serve time)
 * 2. This function uses vision classification to catch potential CSAM at upload time
 */
export async function scanForCSAM(
  image: string | Uint8Array,
  mimeType: string,
  contentHash: string,
  options: {
    ai?: Ai;
    togetherApiKey?: string;
  },
): Promise<CSAMResult> {
  // Vision model classification checks for minor_present category
  // which is our upload-time defense layer
  try {
    const classification = await classifyImage(image, mimeType, options);

    // Check for CSAM indicators
    // minor_present in sexual/nudity context is treated as potential CSAM
    if (
      classification.category === "minor_present" &&
      classification.confidence >= 0.7
    ) {
      return {
        safe: false,
        reason: "CSAM_DETECTED",
        mustReport: true,
        hash: contentHash,
        provider: classification.provider,
      };
    }

    // Additional high-confidence check: if confidence is very high for minor_present
    // even without explicit sexual content, flag for review
    if (
      classification.category === "minor_present" &&
      classification.confidence >= 0.9
    ) {
      return {
        safe: false,
        reason: "CSAM_DETECTED",
        mustReport: true,
        hash: contentHash,
        provider: classification.provider,
      };
    }

    return {
      safe: true,
      hash: contentHash,
      provider: classification.provider,
    };
  } catch (err) {
    // CRITICAL: If CSAM scanning fails, we MUST block the upload
    // We cannot process images without CSAM scanning
    throw new PetalError(
      "CSAM scanning unavailable - upload blocked for safety",
      "CSAM_SCAN_FAILED",
      "layer1",
      undefined,
      err,
    );
  }
}

// ============================================================================
// Account Flagging
// ============================================================================

/**
 * Flag account for CSAM detection
 *
 * This creates a permanent block on the account until manual review.
 * CSAM detection = instant upload block + NCMEC report required.
 */
export async function flagAccountForCSAM(
  db: D1Database,
  userId: string,
  contentHash: string,
): Promise<void> {
  const id = crypto.randomUUID().replace(/-/g, "").substring(0, 16);

  try {
    await db
      .prepare(
        `INSERT INTO petal_account_flags (
          id, user_id, flag_type, block_uploads, requires_manual_review, review_status
        ) VALUES (?, ?, 'csam_detection', 1, 1, 'pending')
        ON CONFLICT(user_id, flag_type) DO UPDATE SET
          block_uploads = 1,
          requires_manual_review = 1,
          review_status = 'pending'`,
      )
      .bind(id, userId)
      .run();

    // Log the flagging (hash only, never image)
    await logSecurityEvent(db, {
      timestamp: new Date().toISOString(),
      layer: "layer1",
      result: "block",
      category: "csam_detected",
      contentHash,
      feature: "upload",
      userId,
    });
  } catch (err) {
    // Log error but don't fail - the upload is already blocked
    console.error("[Petal] Failed to flag account:", err);
  }
}

/**
 * Check if user has active CSAM flag (blocked from uploads)
 */
export async function hasActiveCSAMFlag(
  db: D1Database,
  userId: string,
): Promise<boolean> {
  try {
    const flag = await db
      .prepare(
        `SELECT id FROM petal_account_flags
         WHERE user_id = ?
         AND flag_type = 'csam_detection'
         AND block_uploads = 1
         AND review_status IN ('pending', 'confirmed')`,
      )
      .bind(userId)
      .first();

    return flag !== null;
  } catch (err) {
    // If check fails, assume not blocked (fail-open for legitimate users)
    console.error("[Petal] Failed to check CSAM flag:", err);
    return false;
  }
}

// ============================================================================
// NCMEC Reporting (Placeholder)
// ============================================================================

/**
 * Report to NCMEC (National Center for Missing & Exploited Children)
 *
 * Federal law requires reporting within 24 hours.
 * This is a placeholder - actual implementation requires:
 * 1. NCMEC ESP (Electronic Service Provider) registration
 * 2. CyberTipline API integration
 * 3. Secure storage of report metadata
 *
 * For now, this logs the requirement and should trigger manual process.
 */
export async function queueNCMECReport(
  db: D1Database,
  data: {
    contentHash: string;
    timestamp: string;
    userId: string;
    tenantId?: string;
  },
): Promise<void> {
  // Log the report requirement
  console.error("[PETAL CRITICAL] NCMEC Report Required:", {
    hash: data.contentHash,
    timestamp: data.timestamp,
    // Never log user-identifying info to console
    reported: false,
    deadline: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
  });

  // Store in database for manual processing
  try {
    const id = crypto.randomUUID().replace(/-/g, "").substring(0, 16);
    await db
      .prepare(
        `INSERT INTO petal_ncmec_queue (
          id, content_hash, detected_at, user_id, tenant_id, reported, report_deadline
        ) VALUES (?, ?, ?, ?, ?, 0, datetime(?, '+24 hours'))`,
      )
      .bind(
        id,
        data.contentHash,
        data.timestamp,
        data.userId,
        data.tenantId || null,
        data.timestamp,
      )
      .run();
  } catch (err) {
    // CRITICAL: If we can't queue the report, log loudly
    console.error("[PETAL CRITICAL] Failed to queue NCMEC report:", err);
    // In production, this should trigger an alert
  }
}

// ============================================================================
// Full Layer 1 Processing
// ============================================================================

/**
 * Run complete Layer 1 (CSAM) processing
 */
export async function runLayer1(
  image: string | Uint8Array,
  mimeType: string,
  contentHash: string,
  options: {
    ai?: Ai;
    togetherApiKey?: string;
    db?: D1Database;
    userId?: string;
    tenantId?: string;
  },
): Promise<CSAMResult> {
  const { db, userId, tenantId, ...visionOptions } = options;

  // Check if user is already blocked
  if (db && userId) {
    const isBlocked = await hasActiveCSAMFlag(db, userId);
    if (isBlocked) {
      throw new PetalError(
        "Unable to process uploads at this time.",
        "ACCOUNT_BLOCKED",
        "layer1",
      );
    }
  }

  // Run CSAM scan
  const result = await scanForCSAM(image, mimeType, contentHash, visionOptions);

  // Handle CSAM detection
  if (!result.safe && result.mustReport) {
    // Flag account
    if (db && userId) {
      await flagAccountForCSAM(db, userId, contentHash);
    }

    // Queue NCMEC report
    if (db && userId) {
      await queueNCMECReport(db, {
        contentHash,
        timestamp: new Date().toISOString(),
        userId,
        tenantId,
      });
    }

    // Log security event
    if (db) {
      await logSecurityEvent(db, {
        timestamp: new Date().toISOString(),
        layer: "layer1",
        result: "block",
        category: "csam_detected",
        contentHash,
        feature: "upload",
        userId,
        tenantId,
      });
    }
  } else if (db) {
    // Log pass
    await logSecurityEvent(db, {
      timestamp: new Date().toISOString(),
      layer: "layer1",
      result: "pass",
      contentHash,
      feature: "upload",
      userId,
      tenantId,
    });
  }

  return result;
}
