/**
 * Shared Utilities
 */

/**
 * Hash IP address for privacy-preserving rate limiting
 */
export async function hashIp(ip: string, salt: string): Promise<string> {
	const encoder = new TextEncoder();
	const data = encoder.encode(ip + salt);
	const hash = await crypto.subtle.digest("SHA-256", data);
	return Array.from(new Uint8Array(hash))
		.slice(0, 8)
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}
