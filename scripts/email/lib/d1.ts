/**
 * D1 Database Utilities for Broadcast System
 *
 * Uses wrangler CLI to query the remote D1 database.
 */

import type { EmailSignup } from "./types";

const DATABASE_NAME = "grove-engine-db";

/**
 * Escape a value for safe interpolation into a SQL string literal.
 * SQLite uses '' to escape single quotes inside string literals.
 * Also rejects null bytes which can truncate strings in some contexts.
 */
function sqlEscapeString(value: string): string {
	if (value.includes("\0")) {
		throw new Error("SQL value must not contain null bytes");
	}
	return value.replace(/'/g, "''");
}

/**
 * Execute a D1 query and return raw JSON output.
 *
 * When `params` are provided, positional `?` placeholders in `sql` are
 * replaced with safely-escaped string literals before sending to wrangler.
 * (Wrangler CLI does not support native bind parameters.)
 */
async function executeD1Query(sql: string, params?: string[]): Promise<string> {
	let finalSql = sql;
	if (params && params.length > 0) {
		let paramIndex = 0;
		finalSql = sql.replace(/\?/g, () => {
			if (paramIndex >= params.length) {
				throw new Error("More ? placeholders than parameters provided");
			}
			const escaped = sqlEscapeString(params[paramIndex]);
			paramIndex++;
			return `'${escaped}'`;
		});
		if (paramIndex !== params.length) {
			throw new Error("More parameters provided than ? placeholders");
		}
	}

	const proc = Bun.spawn(
		["wrangler", "d1", "execute", DATABASE_NAME, "--remote", "--json", "--command", finalSql],
		{
			stdout: "pipe",
			stderr: "pipe",
		},
	);

	const stdout = await new Response(proc.stdout).text();
	const stderr = await new Response(proc.stderr).text();
	const exitCode = await proc.exited;

	if (exitCode !== 0) {
		throw new Error(`D1 query failed: ${stderr}`);
	}

	return stdout;
}

/**
 * Parse D1 JSON output to extract results
 */
function parseD1Results<T>(output: string): T[] {
	try {
		const parsed = JSON.parse(output);
		// D1 returns an array with one result object containing 'results'
		if (Array.isArray(parsed) && parsed[0]?.results) {
			return parsed[0].results as T[];
		}
		return [];
	} catch {
		throw new Error(`Failed to parse D1 output: ${output}`);
	}
}

/**
 * Get all active (non-unsubscribed) email signups
 */
export async function getActiveSubscribers(): Promise<EmailSignup[]> {
	const sql = `SELECT id, email, name, created_at, unsubscribed_at, source
               FROM email_signups
               WHERE unsubscribed_at IS NULL
               ORDER BY created_at DESC`;

	const output = await executeD1Query(sql);
	return parseD1Results<EmailSignup>(output);
}

/**
 * Get total subscriber count
 */
export async function getSubscriberCount(): Promise<{
	active: number;
	unsubscribed: number;
}> {
	const sql = `SELECT
                 SUM(CASE WHEN unsubscribed_at IS NULL THEN 1 ELSE 0 END) as active,
                 SUM(CASE WHEN unsubscribed_at IS NOT NULL THEN 1 ELSE 0 END) as unsubscribed
               FROM email_signups`;

	const output = await executeD1Query(sql);
	const results = parseD1Results<{ active: number; unsubscribed: number }>(output);
	return results[0] || { active: 0, unsubscribed: 0 };
}

/**
 * Delete a subscriber by email (full deletion, not soft delete)
 * This is used when syncing unsubscribes from Resend back to D1
 */
export async function deleteSubscriber(email: string): Promise<boolean> {
	try {
		await executeD1Query("DELETE FROM email_signups WHERE LOWER(email) = LOWER(?)", [email]);
		return true;
	} catch (error) {
		console.error(`Failed to delete ${email}:`, error);
		return false;
	}
}

/**
 * Check if a subscriber exists in D1
 */
export async function subscriberExists(email: string): Promise<boolean> {
	const output = await executeD1Query(
		"SELECT 1 FROM email_signups WHERE LOWER(email) = LOWER(?) LIMIT 1",
		[email],
	);
	const results = parseD1Results<{ 1: number }>(output);
	return results.length > 0;
}
