import type { RateLimit, FailedAttempt, D1DatabaseOrSession } from "../../types.js";

export async function checkRateLimit(
	db: D1DatabaseOrSession,
	key: string,
	limit: number,
	windowSeconds: number,
): Promise<{ allowed: boolean; remaining: number; resetAt: Date }> {
	const now = new Date();
	const windowStart = new Date(now.getTime() - windowSeconds * 1000).toISOString();

	const existing = await db
		.prepare("SELECT * FROM rate_limits WHERE key = ?")
		.bind(key)
		.first<RateLimit>();

	if (!existing || existing.window_start < windowStart) {
		await db
			.prepare(`INSERT OR REPLACE INTO rate_limits (key, count, window_start) VALUES (?, 1, ?)`)
			.bind(key, now.toISOString())
			.run();

		return {
			allowed: true,
			remaining: limit - 1,
			resetAt: new Date(now.getTime() + windowSeconds * 1000),
		};
	}

	if (existing.count >= limit) {
		const resetAt = new Date(new Date(existing.window_start).getTime() + windowSeconds * 1000);
		return {
			allowed: false,
			remaining: 0,
			resetAt,
		};
	}

	await db.prepare("UPDATE rate_limits SET count = count + 1 WHERE key = ?").bind(key).run();

	return {
		allowed: true,
		remaining: limit - existing.count - 1,
		resetAt: new Date(new Date(existing.window_start).getTime() + windowSeconds * 1000),
	};
}

export async function recordFailedAttempt(
	db: D1DatabaseOrSession,
	email: string,
	maxAttempts: number,
	lockoutSeconds: number,
): Promise<{ locked: boolean; lockedUntil: Date | null }> {
	const now = new Date();
	const existing = await db
		.prepare("SELECT * FROM failed_attempts WHERE email = ?")
		.bind(email.toLowerCase())
		.first<FailedAttempt>();

	if (existing?.locked_until && new Date(existing.locked_until) > now) {
		return { locked: true, lockedUntil: new Date(existing.locked_until) };
	}

	const newAttempts = (existing?.attempts || 0) + 1;

	if (newAttempts >= maxAttempts) {
		const lockedUntil = new Date(now.getTime() + lockoutSeconds * 1000);
		await db
			.prepare(
				`INSERT OR REPLACE INTO failed_attempts (email, attempts, last_attempt, locked_until)
         VALUES (?, ?, ?, ?)`,
			)
			.bind(email.toLowerCase(), newAttempts, now.toISOString(), lockedUntil.toISOString())
			.run();
		return { locked: true, lockedUntil };
	}

	await db
		.prepare(
			`INSERT OR REPLACE INTO failed_attempts (email, attempts, last_attempt, locked_until)
       VALUES (?, ?, ?, NULL)`,
		)
		.bind(email.toLowerCase(), newAttempts, now.toISOString())
		.run();

	return { locked: false, lockedUntil: null };
}

export async function clearFailedAttempts(db: D1DatabaseOrSession, email: string): Promise<void> {
	await db.prepare("DELETE FROM failed_attempts WHERE email = ?").bind(email.toLowerCase()).run();
}

export async function isAccountLocked(
	db: D1DatabaseOrSession,
	email: string,
): Promise<{ locked: boolean; lockedUntil: Date | null }> {
	const now = new Date();
	const existing = await db
		.prepare("SELECT * FROM failed_attempts WHERE email = ?")
		.bind(email.toLowerCase())
		.first<FailedAttempt>();

	if (existing?.locked_until && new Date(existing.locked_until) > now) {
		return { locked: true, lockedUntil: new Date(existing.locked_until) };
	}

	return { locked: false, lockedUntil: null };
}
