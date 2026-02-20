/**
 * Rate Limiting Middleware
 *
 * Per-agent rate limiting using KV sliding window counters.
 * Checks both per-minute (RPM) and daily limits.
 */

import type { Env, WardenAgent, WardenService } from "../types";

interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	limit: number;
	resetAt: number;
}

/** Check rate limits for an agent, returning whether the request is allowed */
export async function checkRateLimit(
	kv: KVNamespace,
	agent: WardenAgent,
	service: WardenService,
): Promise<RateLimitResult> {
	const now = Math.floor(Date.now() / 1000);
	const minuteKey = `rl:${agent.id}:${service}:min:${Math.floor(now / 60)}`;
	const dayKey = `rl:${agent.id}:daily:${Math.floor(now / 86400)}`;

	// Check both windows in parallel
	const [minuteCount, dayCount] = await Promise.all([
		kv.get(minuteKey).then((v) => Number(v || 0)),
		kv.get(dayKey).then((v) => Number(v || 0)),
	]);

	// Check daily limit first (broader window)
	if (dayCount >= agent.rate_limit_daily) {
		return {
			allowed: false,
			remaining: 0,
			limit: agent.rate_limit_daily,
			resetAt: (Math.floor(now / 86400) + 1) * 86400,
		};
	}

	// Check per-minute limit
	if (minuteCount >= agent.rate_limit_rpm) {
		return {
			allowed: false,
			remaining: 0,
			limit: agent.rate_limit_rpm,
			resetAt: (Math.floor(now / 60) + 1) * 60,
		};
	}

	// Increment both counters (fire and forget — don't block the request)
	await Promise.all([
		kv.put(minuteKey, String(minuteCount + 1), { expirationTtl: 120 }),
		kv.put(dayKey, String(dayCount + 1), { expirationTtl: 172800 }),
	]);

	return {
		allowed: true,
		remaining: Math.min(
			agent.rate_limit_rpm - minuteCount - 1,
			agent.rate_limit_daily - dayCount - 1,
		),
		limit: agent.rate_limit_rpm,
		resetAt: (Math.floor(now / 60) + 1) * 60,
	};
}
