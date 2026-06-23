import type {
	RefreshToken,
	UserSession,
	UserClientPreference,
	D1DatabaseOrSession,
} from "../../types.js";
import { generateUUID } from "../../utils/crypto.js";

// ==================== Refresh Tokens ====================

export async function createRefreshToken(
	db: D1DatabaseOrSession,
	data: {
		token_hash: string;
		user_id: string;
		client_id: string;
		expires_at: string;
	},
): Promise<string> {
	const id = generateUUID();

	await db
		.prepare(
			`INSERT INTO refresh_tokens (id, token_hash, user_id, client_id, expires_at)
       VALUES (?, ?, ?, ?, ?)`,
		)
		.bind(id, data.token_hash, data.user_id, data.client_id, data.expires_at)
		.run();

	return id;
}

export async function getRefreshTokenByHash(
	db: D1DatabaseOrSession,
	tokenHash: string,
): Promise<RefreshToken | null> {
	const result = await db
		.prepare("SELECT * FROM refresh_tokens WHERE token_hash = ? AND revoked = 0")
		.bind(tokenHash)
		.first<RefreshToken>();
	return result;
}

export async function revokeRefreshToken(
	db: D1DatabaseOrSession,
	tokenHash: string,
): Promise<void> {
	await db
		.prepare("UPDATE refresh_tokens SET revoked = 1 WHERE token_hash = ?")
		.bind(tokenHash)
		.run();
}

export async function revokeAllUserTokens(db: D1DatabaseOrSession, userId: string): Promise<void> {
	await db.prepare("UPDATE refresh_tokens SET revoked = 1 WHERE user_id = ?").bind(userId).run();
}

export async function cleanupExpiredRefreshTokens(db: D1DatabaseOrSession): Promise<void> {
	const now = new Date().toISOString();
	await db
		.prepare("DELETE FROM refresh_tokens WHERE expires_at < ? OR revoked = 1")
		.bind(now)
		.run();
}

// ==================== User Sessions ====================

export async function createUserSession(
	db: D1DatabaseOrSession,
	data: {
		user_id: string;
		client_id: string;
		session_token_hash: string;
		expires_at: string;
	},
): Promise<string> {
	const id = generateUUID();
	const now = new Date().toISOString();
	await db
		.prepare(
			`INSERT INTO user_sessions (id, user_id, client_id, session_token_hash, last_used_at, expires_at, is_active)
     VALUES (?, ?, ?, ?, ?, ?, 1)`,
		)
		.bind(id, data.user_id, data.client_id, data.session_token_hash, now, data.expires_at)
		.run();
	return id;
}

export async function getSessionByTokenHash(
	db: D1DatabaseOrSession,
	tokenHash: string,
): Promise<UserSession | null> {
	const now = new Date().toISOString();
	return db
		.prepare(
			`SELECT * FROM user_sessions WHERE session_token_hash = ? AND is_active = 1 AND expires_at > ?`,
		)
		.bind(tokenHash, now)
		.first<UserSession>();
}

export async function updateSessionLastUsed(
	db: D1DatabaseOrSession,
	sessionId: string,
): Promise<void> {
	const now = new Date().toISOString();
	await db
		.prepare(`UPDATE user_sessions SET last_used_at = ? WHERE id = ?`)
		.bind(now, sessionId)
		.run();
}

export async function revokeSession(db: D1DatabaseOrSession, sessionId: string): Promise<void> {
	await db.prepare(`UPDATE user_sessions SET is_active = 0 WHERE id = ?`).bind(sessionId).run();
}

export async function revokeAllUserSessions(
	db: D1DatabaseOrSession,
	userId: string,
): Promise<void> {
	await db.prepare(`UPDATE user_sessions SET is_active = 0 WHERE user_id = ?`).bind(userId).run();
}

// ==================== User Client Preferences ====================

export async function getUserClientPreference(
	db: D1DatabaseOrSession,
	userId: string,
): Promise<UserClientPreference | null> {
	return db
		.prepare(`SELECT * FROM user_client_preferences WHERE user_id = ?`)
		.bind(userId)
		.first<UserClientPreference>();
}

export async function updateLastUsedClient(
	db: D1DatabaseOrSession,
	userId: string,
	clientId: string,
): Promise<void> {
	const now = new Date().toISOString();
	await db
		.prepare(
			`INSERT INTO user_client_preferences (user_id, last_used_client_id, updated_at)
     VALUES (?, ?, ?)
     ON CONFLICT(user_id) DO UPDATE SET last_used_client_id = ?, updated_at = ?`,
		)
		.bind(userId, clientId, now, clientId, now)
		.run();
}
