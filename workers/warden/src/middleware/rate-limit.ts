/**
 * Rate Limiting Middleware
 *
 * Two layers of rate limiting:
 * 1. Per-agent limits — each agent has RPM + daily caps
 * 2. Per-service limits — global caps aligned with upstream API limits
 */

import type { Env, WardenAgent, WardenService } from "../types";

interface RateLimitResult {
	allowed: boolean;
	remaining: number;
	limit: number;
	resetAt: number;
}

/**
 * Upstream API rate limits — prevents all agents collectively from
 * exceeding the third-party provider's limits.
 */
const SERVICE_LIMITS: Record<string, { rpm: number; daily: number | null }> = {
	github: { rpm: 5000, daily: null },
	cloudflare: { rpm: 1200, daily: null },
	tavily: { rpm: 100, daily: 1000 },
	exa: { rpm: 60, daily: 500 },
	resend: { rpm: 100, daily: null },
	stripe: { rpm: 100, daily: null },
};

/** Check per-agent rate limits, returning whether the request is allowed */
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

/**
 * Check global per-service rate limits.
 *
 * Tracks total requests across all agents to a given upstream service,
 * preventing collective overuse that would trigger upstream throttling.
 * Uses KV counters with key pattern: rl:svc:{service}:min:{minute}
 */
export async function checkServiceRateLimit(
	kv: KVNamespace,
	service: WardenService,
): Promise<RateLimitResult> {
	const limits = SERVICE_LIMITS[service];
	if (!limits) {
		return { allowed: true, remaining: Infinity, limit: 0, resetAt: 0 };
	}

	const now = Math.floor(Date.now() / 1000);
	const minuteKey = `rl:svc:${service}:min:${Math.floor(now / 60)}`;

	const keys: Promise<number>[] = [kv.get(minuteKey).then((v) => Number(v || 0))];

	let dailyKey: string | undefined;
	if (limits.daily !== null) {
		dailyKey = `rl:svc:${service}:daily:${Math.floor(now / 86400)}`;
		keys.push(kv.get(dailyKey).then((v) => Number(v || 0)));
	}

	const counts = await Promise.all(keys);
	const minuteCount = counts[0];
	const dayCount = counts.length > 1 ? counts[1] : 0;

	// Check daily service limit
	if (limits.daily !== null && dayCount >= limits.daily) {
		return {
			allowed: false,
			remaining: 0,
			limit: limits.daily,
			resetAt: (Math.floor(now / 86400) + 1) * 86400,
		};
	}

	// Check per-minute service limit
	if (minuteCount >= limits.rpm) {
		return {
			allowed: false,
			remaining: 0,
			limit: limits.rpm,
			resetAt: (Math.floor(now / 60) + 1) * 60,
		};
	}

	// Increment counters
	const puts: Promise<void>[] = [
		kv.put(minuteKey, String(minuteCount + 1), { expirationTtl: 120 }),
	];
	if (dailyKey && limits.daily !== null) {
		puts.push(kv.put(dailyKey, String(dayCount + 1), { expirationTtl: 172800 }));
	}
	await Promise.all(puts);

	const remaining =
		limits.daily !== null
			? Math.min(limits.rpm - minuteCount - 1, limits.daily - dayCount - 1)
			: limits.rpm - minuteCount - 1;

	return {
		allowed: true,
		remaining,
		limit: limits.rpm,
		resetAt: (Math.floor(now / 60) + 1) * 60,
	};
}
