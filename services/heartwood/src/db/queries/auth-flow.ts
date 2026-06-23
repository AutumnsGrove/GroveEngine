import type { AuthCode, MagicCode, OAuthState, D1DatabaseOrSession } from "../../types.js";
import { generateUUID } from "../../utils/crypto.js";

// ==================== Auth Codes ====================

export async function createAuthCode(
	db: D1DatabaseOrSession,
	data: {
		code: string;
		client_id: string;
		user_id: string;
		redirect_uri: string;
		code_challenge?: string;
		code_challenge_method?: string;
		expires_at: string;
	},
): Promise<void> {
	await db
		.prepare(
			`INSERT INTO auth_codes (code, client_id, user_id, redirect_uri, code_challenge, code_challenge_method, expires_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
		)
		.bind(
			data.code,
			data.client_id,
			data.user_id,
			data.redirect_uri,
			data.code_challenge || null,
			data.code_challenge_method || null,
			data.expires_at,
		)
		.run();
}

export async function getAuthCode(db: D1DatabaseOrSession, code: string): Promise<AuthCode | null> {
	const result = await db
		.prepare("SELECT * FROM auth_codes WHERE code = ?")
		.bind(code)
		.first<AuthCode>();
	return result;
}

export async function markAuthCodeUsed(db: D1DatabaseOrSession, code: string): Promise<void> {
	await db.prepare("UPDATE auth_codes SET used = 1 WHERE code = ?").bind(code).run();
}

export async function consumeAuthCode(
	db: D1DatabaseOrSession,
	code: string,
	clientId: string,
): Promise<AuthCode | null> {
	const now = new Date().toISOString();

	const result = await db
		.prepare(
			`UPDATE auth_codes
       SET used = 1
       WHERE code = ?
         AND used = 0
         AND expires_at > ?
         AND client_id = ?
       RETURNING *`,
		)
		.bind(code, now, clientId)
		.first<AuthCode>();

	return result;
}

export async function cleanupExpiredAuthCodes(db: D1DatabaseOrSession): Promise<void> {
	const now = new Date().toISOString();
	await db.prepare("DELETE FROM auth_codes WHERE expires_at < ? OR used = 1").bind(now).run();
}

// ==================== Magic Codes (Deprecated) ====================

/** @deprecated Magic code auth removed — Great Grove Refactor Phase 2. Table dropped in migration 0010. */
export async function createMagicCode(
	db: D1DatabaseOrSession,
	data: {
		email: string;
		code: string;
		expires_at: string;
	},
): Promise<void> {
	const id = generateUUID();

	await db
		.prepare("INSERT INTO magic_codes (id, email, code, expires_at) VALUES (?, ?, ?, ?)")
		.bind(id, data.email.toLowerCase(), data.code, data.expires_at)
		.run();
}

/** @deprecated Magic code auth removed — Great Grove Refactor Phase 2 */
export async function getMagicCode(
	db: D1DatabaseOrSession,
	email: string,
	code: string,
): Promise<MagicCode | null> {
	const now = new Date().toISOString();
	const result = await db
		.prepare(
			"SELECT * FROM magic_codes WHERE email = ? AND code = ? AND used = 0 AND expires_at > ?",
		)
		.bind(email.toLowerCase(), code, now)
		.first<MagicCode>();
	return result;
}

/** @deprecated Magic code auth removed — Great Grove Refactor Phase 2 */
export async function markMagicCodeUsed(db: D1DatabaseOrSession, id: string): Promise<void> {
	await db.prepare("UPDATE magic_codes SET used = 1 WHERE id = ?").bind(id).run();
}

/** @deprecated Magic code auth removed — Great Grove Refactor Phase 2 */
export async function cleanupExpiredMagicCodes(db: D1DatabaseOrSession): Promise<void> {
	const now = new Date().toISOString();
	await db.prepare("DELETE FROM magic_codes WHERE expires_at < ? OR used = 1").bind(now).run();
}

// ==================== OAuth State ====================

export async function saveOAuthState(
	db: D1DatabaseOrSession,
	data: {
		state: string;
		client_id: string;
		redirect_uri: string;
		code_challenge?: string;
		code_challenge_method?: string;
		original_state: string;
		expires_at: string;
		is_internal_service?: boolean;
	},
): Promise<void> {
	await db
		.prepare(
			`INSERT INTO oauth_states (state, client_id, redirect_uri, code_challenge, code_challenge_method, original_state, expires_at, is_internal_service)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		)
		.bind(
			data.state,
			data.client_id,
			data.redirect_uri,
			data.code_challenge || null,
			data.code_challenge_method || null,
			data.original_state,
			data.expires_at,
			data.is_internal_service ? 1 : 0,
		)
		.run();
}

export async function getOAuthState(
	db: D1DatabaseOrSession,
	state: string,
): Promise<OAuthState | null> {
	const now = new Date().toISOString();
	const result = await db
		.prepare("SELECT * FROM oauth_states WHERE state = ? AND expires_at > ?")
		.bind(state, now)
		.first<OAuthState & { original_state: string }>();

	if (!result) return null;

	return {
		client_id: result.client_id,
		redirect_uri: result.redirect_uri,
		state: result.original_state,
		code_challenge: result.code_challenge || undefined,
		code_challenge_method: result.code_challenge_method || undefined,
		is_internal_service: Boolean((result as { is_internal_service?: number }).is_internal_service),
	};
}

export async function deleteOAuthState(db: D1DatabaseOrSession, state: string): Promise<void> {
	await db.prepare("DELETE FROM oauth_states WHERE state = ?").bind(state).run();
}

export async function cleanupExpiredOAuthStates(db: D1DatabaseOrSession): Promise<void> {
	const now = new Date().toISOString();
	await db.prepare("DELETE FROM oauth_states WHERE expires_at < ?").bind(now).run();
}
