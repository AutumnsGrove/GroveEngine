/**
 * Hit Counter Curio API — Public Endpoint
 *
 * GET — Fetch counter value and optionally increment it.
 *       Uses atomic SQL increment to prevent race conditions.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { API_ERRORS, throwGroveError, logGroveError } from "$lib/errors";
import {
  generateHitCounterId,
  formatCount,
  toDigits,
} from "$lib/curios/hitcounter";

interface CounterRow {
  id: string;
  count: number;
  style: string;
  label: string;
  show_since_date: number;
  started_at: string;
}

export const GET: RequestHandler = async ({ url, platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  if (!db) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  if (!tenantId) {
    throwGroveError(400, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
  }

  const pagePath = url.searchParams.get("page") || "/";
  const increment = url.searchParams.get("increment") !== "false";

  // Atomic increment + fetch in one query
  // If no row exists, create one with count=1 (first visitor)
  if (increment) {
    try {
      await db
        .prepare(
          `INSERT INTO hit_counters (id, tenant_id, page_path, count, updated_at)
           VALUES (?, ?, ?, 1, datetime('now'))
           ON CONFLICT(tenant_id, page_path) DO UPDATE SET
             count = count + 1,
             updated_at = datetime('now')`,
        )
        .bind(generateHitCounterId(), tenantId, pagePath)
        .run();
    } catch (err) {
      // Non-fatal — we can still return the current count
      logGroveError("API", API_ERRORS.OPERATION_FAILED, {
        detail: "Hit counter increment failed",
        cause: err,
      });
    }
  }

  // Fetch current state
  const counter = await db
    .prepare(
      `SELECT id, count, style, label, show_since_date, started_at
       FROM hit_counters
       WHERE tenant_id = ? AND page_path = ?`,
    )
    .bind(tenantId, pagePath)
    .first<CounterRow>();

  if (!counter) {
    // No counter exists yet — return zeros
    return json(
      {
        count: 0,
        formattedCount: "0",
        digits: ["0", "0", "0", "0", "0", "0"],
        style: "classic",
        label: "You are visitor",
        showSinceDate: true,
        startedAt: new Date().toISOString(),
      },
      {
        headers: {
          "Cache-Control": "no-store",
        },
      },
    );
  }

  return json(
    {
      count: counter.count,
      formattedCount: formatCount(counter.count),
      digits: toDigits(counter.count),
      style: counter.style,
      label: counter.label || "You are visitor",
      showSinceDate: Boolean(counter.show_since_date),
      startedAt: counter.started_at,
    },
    {
      headers: {
        // No caching — each request should reflect the latest count
        "Cache-Control": "no-store",
      },
    },
  );
};
