/**
 * Warden Crypto — HMAC Signature Generation
 *
 * Used by the SDK client for challenge-response authentication.
 * Signs nonces with the agent's secret using HMAC-SHA256.
 */

/** Generate an HMAC-SHA256 signature for challenge-response auth */
export async function signNonce(secret: string, nonce: string): Promise<string> {
	const encoder = new TextEncoder();
	const key = await crypto.subtle.importKey(
		"raw",
		encoder.encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signatureBuffer = await crypto.subtle.sign("HMAC", key, encoder.encode(nonce));
	return Array.from(new Uint8Array(signatureBuffer))
		.map((b) => b.toString(16).padStart(2, "0"))
		.join("");
}
