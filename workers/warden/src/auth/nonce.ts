/**
 * Nonce Generation & Validation
 *
 * Single-use nonces for challenge-response auth.
 * Stored in KV with 30-second TTL — after use or expiry, they're gone.
 */

const NONCE_TTL_SECONDS = 30;

/** Generate a fresh nonce and store it in KV */
export async function generateNonce(kv: KVNamespace, agentId: string): Promise<string> {
	const nonce = crypto.randomUUID();
	const key = `nonce:${agentId}:${nonce}`;
	await kv.put(key, "1", { expirationTtl: NONCE_TTL_SECONDS });
	return nonce;
}

/** Validate and consume a nonce (single-use) */
export async function validateNonce(
	kv: KVNamespace,
	agentId: string,
	nonce: string,
): Promise<boolean> {
	const key = `nonce:${agentId}:${nonce}`;
	const value = await kv.get(key);
	if (!value) return false;

	// Consume immediately — single use
	await kv.delete(key);
	return true;
}
