/**
 * Daily History Module
 *
 * Aggregates daily status data for the uptime visualization.
 * Runs at midnight UTC to record the previous day's status.
 */

import { COMPONENTS, STATUS_PRIORITY } from "./config";

/**
 * Environment bindings required by daily history
 */
export interface DailyHistoryEnv {
  DB: D1Database;
}

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
  return crypto.randomUUID();
}

/**
 * Get yesterday's date in YYYY-MM-DD format (UTC)
 */
function getYesterdayDate(): string {
  const yesterday = new Date();
  yesterday.setUTCDate(yesterday.getUTCDate() - 1);
  return yesterday.toISOString().split("T")[0];
}

/**
 * Determine the worst status from a list of statuses
 */
function getWorstStatus(statuses: string[]): string {
  if (statuses.length === 0) return "operational";

  return statuses.reduce((worst, current) => {
    const worstPriority = STATUS_PRIORITY[worst] ?? 0;
    const currentPriority = STATUS_PRIORITY[current] ?? 0;
    return currentPriority > worstPriority ? current : worst;
  }, "operational");
}

/**
 * Count incidents for a component on a given date
 */
async function countIncidentsForDate(
  db: D1Database,
  componentId: string,
  date: string,
): Promise<{ incidentCount: number; worstStatus: string }> {
  // Get all incidents that overlapped with this date
  const dateStart = `${date}T00:00:00.000Z`;
  const dateEnd = `${date}T23:59:59.999Z`;

  // Find incidents that were active during this date
  // (started before end of day AND (not resolved OR resolved after start of day))
  const result = await db
    .prepare(
      `SELECT i.id, i.type, i.impact
			 FROM status_incidents i
			 INNER JOIN status_incident_components ic ON i.id = ic.incident_id
			 WHERE ic.component_id = ?
			   AND i.started_at <= ?
			   AND (i.resolved_at IS NULL OR i.resolved_at >= ?)`,
    )
    .bind(componentId, dateEnd, dateStart)
    .all<{ id: string; type: string; impact: string }>();

  const incidents = result.results || [];
  const incidentCount = incidents.length;

  // Map incident impact to component status
  const statusesFromIncidents = incidents.map((i) => {
    switch (i.impact) {
      case "critical":
        return "major_outage";
      case "major":
        return "partial_outage";
      case "minor":
        return "degraded";
      default:
        return "operational";
    }
  });

  // Get current component status as fallback
  const componentResult = await db
    .prepare(`SELECT current_status FROM status_components WHERE id = ?`)
    .bind(componentId)
    .first<{ current_status: string }>();

  const currentStatus = componentResult?.current_status || "operational";

  // If no incidents, use operational; otherwise use worst incident status
  const worstStatus =
    statusesFromIncidents.length > 0
      ? getWorstStatus(statusesFromIncidents)
      : "operational";

  return { incidentCount, worstStatus };
}

/**
 * Record daily status for a single component
 */
async function recordDailyStatusForComponent(
  db: D1Database,
  componentId: string,
  date: string,
): Promise<void> {
  const { incidentCount, worstStatus } = await countIncidentsForDate(
    db,
    componentId,
    date,
  );

  // Upsert into status_daily_history
  // SQLite doesn't have UPSERT syntax, so we use INSERT OR REPLACE
  const id = generateUUID();
  const now = new Date().toISOString();

  await db
    .prepare(
      `INSERT OR REPLACE INTO status_daily_history
			 (id, component_id, date, status, incident_count, created_at)
			 VALUES (
			   COALESCE(
			     (SELECT id FROM status_daily_history WHERE component_id = ? AND date = ?),
			     ?
			   ),
			   ?, ?, ?, ?, ?
			 )`,
    )
    .bind(
      componentId,
      date,
      id,
      componentId,
      date,
      worstStatus,
      incidentCount,
      now,
    )
    .run();
}

/**
 * Record daily status for all components
 * Called at midnight UTC by the cron trigger
 */
export async function recordDailyHistory(env: DailyHistoryEnv): Promise<void> {
  const yesterday = getYesterdayDate();
  console.log(`[Clearing Monitor] Recording daily history for ${yesterday}`);

  for (const component of COMPONENTS) {
    try {
      await recordDailyStatusForComponent(env.DB, component.id, yesterday);
      console.log(
        `[Clearing Monitor] Recorded history for ${component.name} on ${yesterday}`,
      );
    } catch (err) {
      console.error(
        `[Clearing Monitor] Failed to record history for ${component.name}:`,
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}

/**
 * Clean up old history records (keep 90 days)
 * Called periodically to prevent table bloat
 */
export async function cleanupOldHistory(env: DailyHistoryEnv): Promise<void> {
  const cutoffDate = new Date();
  cutoffDate.setUTCDate(cutoffDate.getUTCDate() - 90);
  const cutoffStr = cutoffDate.toISOString().split("T")[0];

  try {
    const result = await env.DB.prepare(
      `DELETE FROM status_daily_history WHERE date < ?`,
    )
      .bind(cutoffStr)
      .run();

    const deleted = result.meta?.changes ?? 0;
    if (deleted > 0) {
      console.log(
        `[Clearing Monitor] Cleaned up ${deleted} old history records`,
      );
    }
  } catch (err) {
    console.error(
      "[Clearing Monitor] Failed to cleanup old history:",
      err instanceof Error ? err.message : String(err),
    );
  }
}
