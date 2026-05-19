/**
 * Grove Pulse — Privacy-preserving visitor identification
 *
 * Daily-rotating SHA-256 hash of IP + User-Agent. Inherits the Rings
 * privacy model: same visitor on same day = same hash, different day =
 * different hash. Cannot be reversed to recover IP.
 *
 * @module pulse/visitor
 */

const HASH_PREFIX = "grove-pulse";

/**
 * Privacy-preserving visitor hash.
 *
 * @param ip - Connecting IP address (or "unknown")
 * @param userAgent - User-Agent header value (or "unknown")
 * @param date - ISO date string override (defaults to today, UTC)
 * @param secret - Optional server-side secret mixed into the salt.
 *   When provided, the salt becomes `${HASH_PREFIX}-${day}-${secret}`,
 *   making brute-force deanonymization infeasible even with DB read access.
 *   When omitted, behavior is unchanged (backward compatible).
 *   Supply via the `PULSE_VISITOR_SECRET` environment variable.
 */
export async function hashVisitor(
	ip: string,
	userAgent: string,
	date?: string,
	secret?: string,
): Promise<string> {
	const day = date ?? new Date().toISOString().split("T")[0];
	const salt = secret ? `${HASH_PREFIX}-${day}-${secret}` : `${HASH_PREFIX}-${day}`;
	const payload = `${salt}:${ip}:${userAgent}`;

	const encoded = new TextEncoder().encode(payload);
	const digest = await crypto.subtle.digest("SHA-256", encoded);
	const hex = Array.from(new Uint8Array(digest))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");

	return hex.substring(0, 16);
}
