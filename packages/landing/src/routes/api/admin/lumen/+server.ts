/**
 * GET /api/admin/lumen — Lumen usage analytics for admin dashboard
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

interface LumenUsageRow {
  task: string;
  count: number;
  input_tokens: number;
  output_tokens: number;
  total_cost: number;
  avg_latency: number;
}

interface LumenRecentRow {
  id: number;
  task: string;
  model: string;
  provider: string;
  input_tokens: number;
  output_tokens: number;
  cost: number;
  latency_ms: number;
  cached: number;
  created_at: string;
}

export const GET: RequestHandler = async ({ platform }) => {
  if (!platform?.env?.DB) {
    return json({ error: "Database not configured" }, { status: 500 });
  }

  const db = platform.env.DB;

  try {
    // Get today's stats
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);

    const [todayStats, weekStats, recentUsage, providers] = await Promise.all([
      // Today's usage by task
      db
        .prepare(
          `SELECT 
            task,
            COUNT(*) as count,
            SUM(input_tokens) as input_tokens,
            SUM(output_tokens) as output_tokens,
            SUM(cost) as total_cost,
            AVG(latency_ms) as avg_latency
          FROM lumen_usage
          WHERE created_at >= ?
          GROUP BY task`,
        )
        .bind(todayStart.toISOString())
        .all<LumenUsageRow>(),

      // Last 7 days usage
      db
        .prepare(
          `SELECT 
            task,
            COUNT(*) as count,
            SUM(input_tokens) as input_tokens,
            SUM(output_tokens) as output_tokens,
            SUM(cost) as total_cost,
            AVG(latency_ms) as avg_latency
          FROM lumen_usage
          WHERE created_at >= datetime('now', '-7 days')
          GROUP BY task`,
        )
        .all<LumenUsageRow>(),

      // Recent requests (last 50)
      db
        .prepare(
          `SELECT 
            id,
            task,
            model,
            provider,
            input_tokens,
            output_tokens,
            cost,
            latency_ms,
            cached,
            created_at
          FROM lumen_usage
          ORDER BY created_at DESC
          LIMIT 50`,
        )
        .all<LumenRecentRow>(),

      // Usage by provider
      db
        .prepare(
          `SELECT 
            provider,
            COUNT(*) as count,
            SUM(cost) as total_cost
          FROM lumen_usage
          WHERE created_at >= datetime('now', '-7 days')
          GROUP BY provider`,
        )
        .all<{ provider: string; count: number; total_cost: number }>(),
    ]);

    return json({
      today: todayStats.results ?? [],
      week: weekStats.results ?? [],
      recent: recentUsage.results ?? [],
      providers: providers.results ?? [],
    });
  } catch (err) {
    console.error("[Lumen Analytics] Error:", err);
    return json({ error: "Failed to fetch analytics" }, { status: 500 });
  }
};
