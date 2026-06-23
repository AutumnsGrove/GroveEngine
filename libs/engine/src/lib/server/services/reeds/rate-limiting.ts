export async function checkCommentRateLimit(
	db: D1Database,
	userId: string,
	limitType: "public_comment" | "private_reply",
	limit: number,
	windowType: "week" | "day",
): Promise<{ allowed: boolean; remaining: number }> {
	const now = new Date();
	let periodStart: string;

	if (windowType === "week") {
		const day = now.getDay();
		const diff = now.getDate() - day + (day === 0 ? -6 : 1);
		const monday = new Date(now.getFullYear(), now.getMonth(), diff);
		periodStart = monday.toISOString().split("T")[0];
	} else {
		periodStart = now.toISOString().split("T")[0];
	}

	const results = await db.batch([
		db
			.prepare(
				`INSERT INTO comment_rate_limits (user_id, limit_type, period_start, count)
         VALUES (?, ?, ?, 1)
         ON CONFLICT (user_id, limit_type) DO UPDATE SET
           count = CASE
             WHEN comment_rate_limits.period_start != excluded.period_start THEN 1
             ELSE comment_rate_limits.count + 1
           END,
           period_start = excluded.period_start
         WHERE comment_rate_limits.period_start != excluded.period_start
            OR comment_rate_limits.count < ?`,
			)
			.bind(userId, limitType, periodStart, limit),
		db
			.prepare(`SELECT count FROM comment_rate_limits WHERE user_id = ? AND limit_type = ?`)
			.bind(userId, limitType),
	]);

	const writeResult = results[0];
	const readResult = results[1] as D1Result<{ count: number }>;
	const currentCount = readResult.results?.[0]?.count ?? 0;
	const wasIncremented = ((writeResult.meta as D1Meta)?.changes ?? 0) > 0;

	if (!wasIncremented) {
		return { allowed: false, remaining: 0 };
	}

	return { allowed: true, remaining: limit - currentCount };
}
