/**
 * Token Routes - Token exchange, refresh, and revocation
 */

import { Hono, type Context } from "hono";
import type { Env, TokenResponse } from "../types.js";
import {
	getClientByClientId,
	consumeAuthCode,
	getUserById,
	createRefreshToken,
	consumeRefreshToken,
	getRefreshTokenByHashAnyStatus,
	revokeRefreshToken,
	revokeAllUserTokens,
	getDeviceCodeByHash,
	updateDevicePollCount,
	incrementDeviceInterval,
	deleteDeviceCode,
	consumeDeviceCode,
	createAuditLog,
} from "../db/queries.js";
import { createDbSession } from "../db/session.js";
import { parseFormData } from "../utils/validation.js";
import {
	generateRefreshToken,
	hashSecret,
	verifySecret,
	verifyCodeChallenge,
} from "../utils/crypto.js";
import { createAccessToken } from "../services/jwt.js";
import {
	logTokenExchange,
	logTokenRefresh,
	logTokenRevoke,
	logRefreshTokenReuse,
} from "../services/user.js";
import { getClientIP, getUserAgent } from "../middleware/security.js";
import { checkRouteRateLimit } from "../middleware/rateLimit.js";
import {
	ACCESS_TOKEN_EXPIRY,
	REFRESH_TOKEN_EXPIRY,
	RATE_LIMIT_TOKEN_PER_CLIENT,
	RATE_LIMIT_DEVICE_POLL,
	RATE_LIMIT_WINDOW,
	DEVICE_CODE_SLOW_DOWN_INCREMENT,
	DEVICE_CODE_MAX_POLL_INTERVAL,
	DEFAULT_SCOPE,
} from "../utils/constants.js";

const token = new Hono<{ Bindings: Env }>();

// RFC 6749 §5.1: token responses must never be cached.
const NO_STORE_HEADERS = { "Cache-Control": "no-store", Pragma: "no-cache" };

/**
 * POST /token - Exchange authorization code for tokens
 */
token.post("/", async (c) => {
	const db = createDbSession(c.env);

	// Parse form data
	const bodyText = await c.req.text();
	const params = parseFormData(bodyText);

	const grantType = params.grant_type;

	// Route to appropriate handler based on grant type
	if (grantType === "authorization_code") {
		return handleAuthorizationCodeGrant(c, params, db);
	} else if (grantType === "refresh_token") {
		return handleRefreshTokenGrant(c, params, db);
	} else if (grantType === "urn:ietf:params:oauth:grant-type:device_code") {
		return handleDeviceCodeGrant(c, params, db);
	} else {
		return c.json(
			{
				error: "unsupported_grant_type",
				error_description: "Grant type not supported",
			},
			400,
		);
	}
});

/**
 * POST /token/refresh - Refresh access token (alias for grant_type=refresh_token)
 */
token.post("/refresh", async (c) => {
	const db = createDbSession(c.env);

	const bodyText = await c.req.text();
	const params = parseFormData(bodyText);
	params.grant_type = "refresh_token";
	return handleRefreshTokenGrant(c, params, db);
});

/**
 * POST /token/revoke - Revoke a refresh token
 */
token.post("/revoke", async (c) => {
	const db = createDbSession(c.env);

	const bodyText = await c.req.text();
	const params = parseFormData(bodyText);

	const { token: tokenValue, client_id, client_secret } = params;

	if (!tokenValue || !client_id || !client_secret) {
		return c.json(
			{
				error: "invalid_request",
				error_description: "Missing required parameters",
			},
			400,
		);
	}

	// Rate limit — this is a credential-checking endpoint (client_secret) with
	// no other throttle; without this it's an unlimited secret-guessing oracle.
	const clientIP = getClientIP(c.req.raw) || "unknown";
	const rateLimitKey = `${clientIP}:${client_id}`;
	const rateLimit = await checkRouteRateLimit(
		db,
		"token_revoke",
		rateLimitKey,
		RATE_LIMIT_TOKEN_PER_CLIENT,
	);
	if (!rateLimit.allowed) {
		return c.json(
			{
				error: "rate_limit",
				error_description: "Too many requests",
				retry_after: rateLimit.retryAfter,
			},
			429,
		);
	}

	// Validate client credentials
	const client = await getClientByClientId(db, client_id);
	if (!client) {
		return c.json({ error: "invalid_client", error_description: "Client not found" }, 401);
	}

	const secretValid = await verifySecret(client_secret, client.client_secret_hash);
	if (!secretValid) {
		return c.json(
			{
				error: "invalid_client",
				error_description: "Invalid client credentials",
			},
			401,
		);
	}

	// Revoke the token — only if it belongs to the authenticating client.
	// RFC 7009 §2.1 requires verifying token ownership before revoking; without
	// this check, any registered client could revoke another client's tokens.
	const tokenHash = await hashSecret(tokenValue);
	const existingToken = await getRefreshTokenByHashAnyStatus(db, tokenHash);

	if (existingToken && existingToken.client_id === client_id) {
		await revokeRefreshToken(db, tokenHash);

		// Log the revocation
		await logTokenRevoke(db, existingToken.user_id, {
			client_id,
			ip_address: getClientIP(c.req.raw),
			user_agent: getUserAgent(c.req.raw),
		});
	}

	// Always return success per RFC 7009 — don't leak whether the token
	// existed, was already revoked, or belonged to someone else.
	return c.json({ success: true }, 200, NO_STORE_HEADERS);
});

/**
 * Handle authorization_code grant type
 */
async function handleAuthorizationCodeGrant(
	c: Context<{ Bindings: Env }>,
	params: Record<string, string>,
	db: ReturnType<D1Database["withSession"]>,
) {
	const { code, redirect_uri, client_id, client_secret, code_verifier } = params;

	if (!code || !redirect_uri || !client_id || !client_secret) {
		return c.json(
			{
				error: "invalid_request",
				error_description: "Missing required parameters",
			},
			400,
		);
	}

	// Rate limit check - use IP + client_id to prevent bypass via different client IDs
	const clientIP = getClientIP(c.req.raw) || "unknown";
	const rateLimitKey = `${clientIP}:${client_id}`;
	const rateLimit = await checkRouteRateLimit(
		db,
		"token",
		rateLimitKey,
		RATE_LIMIT_TOKEN_PER_CLIENT,
	);
	if (!rateLimit.allowed) {
		return c.json(
			{
				error: "rate_limit",
				error_description: "Too many requests",
				retry_after: rateLimit.retryAfter,
			},
			429,
		);
	}

	// Validate client credentials
	const client = await getClientByClientId(db, client_id);
	if (!client) {
		return c.json({ error: "invalid_client", error_description: "Client not found" }, 401);
	}

	const secretValid = await verifySecret(client_secret, client.client_secret_hash);
	if (!secretValid) {
		return c.json(
			{
				error: "invalid_client",
				error_description: "Invalid client credentials",
			},
			401,
		);
	}

	// Atomically consume auth code - validates and marks as used in a single operation
	// This prevents race conditions where concurrent requests could both pass validation
	const authCode = await consumeAuthCode(db, code, client_id);

	if (!authCode) {
		return c.json(
			{
				error: "invalid_grant",
				error_description: "Authorization code invalid, expired, or already used",
			},
			400,
		);
	}

	// Validate redirect_uri matches (not checked in atomic query for security - must match exactly)
	if (authCode.redirect_uri !== redirect_uri) {
		return c.json({ error: "invalid_grant", error_description: "Redirect URI mismatch" }, 400);
	}

	// PKCE is mandatory per OAuth 2.1 spec to prevent authorization code interception
	if (!authCode.code_challenge) {
		return c.json(
			{
				error: "invalid_request",
				error_description: "PKCE code_challenge is required for all clients",
			},
			400,
		);
	}

	if (!authCode.code_challenge_method) {
		return c.json(
			{
				error: "invalid_request",
				error_description: "code_challenge_method required when code_challenge is present",
			},
			400,
		);
	}

	if (!code_verifier) {
		return c.json({ error: "invalid_grant", error_description: "Code verifier required" }, 400);
	}

	const valid = await verifyCodeChallenge(
		code_verifier,
		authCode.code_challenge,
		authCode.code_challenge_method,
	);

	if (!valid) {
		return c.json({ error: "invalid_grant", error_description: "PKCE verification failed" }, 400);
	}

	// Get user
	const user = await getUserById(db, authCode.user_id);
	if (!user) {
		return c.json({ error: "invalid_grant", error_description: "User not found" }, 400);
	}

	// Generate tokens
	const accessToken = await createAccessToken(c.env, user, client_id);
	const refreshToken = generateRefreshToken();
	const refreshTokenHash = await hashSecret(refreshToken);
	const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY * 1000).toISOString();

	await createRefreshToken(db, {
		token_hash: refreshTokenHash,
		user_id: user.id,
		client_id: client_id,
		expires_at: refreshExpiresAt,
	});

	// Log the exchange
	await logTokenExchange(db, user.id, {
		client_id,
		ip_address: getClientIP(c.req.raw),
		user_agent: getUserAgent(c.req.raw),
	});

	const response: TokenResponse = {
		access_token: accessToken,
		token_type: "Bearer",
		expires_in: ACCESS_TOKEN_EXPIRY,
		refresh_token: refreshToken,
		scope: DEFAULT_SCOPE,
	};

	return c.json(response, 200, NO_STORE_HEADERS);
}

/**
 * Handle refresh_token grant type
 */
async function handleRefreshTokenGrant(
	c: Context<{ Bindings: Env }>,
	params: Record<string, string>,
	db: ReturnType<D1Database["withSession"]>,
) {
	const { refresh_token, client_id, client_secret } = params;

	if (!refresh_token || !client_id || !client_secret) {
		return c.json(
			{
				error: "invalid_request",
				error_description: "Missing required parameters",
			},
			400,
		);
	}

	// Rate limit check - use IP + client_id to prevent bypass via different client IDs
	const clientIP = getClientIP(c.req.raw) || "unknown";
	const rateLimitKey = `${clientIP}:${client_id}`;
	const rateLimit = await checkRouteRateLimit(
		db,
		"token",
		rateLimitKey,
		RATE_LIMIT_TOKEN_PER_CLIENT,
	);
	if (!rateLimit.allowed) {
		return c.json(
			{
				error: "rate_limit",
				error_description: "Too many requests",
				retry_after: rateLimit.retryAfter,
			},
			429,
		);
	}

	// Validate client credentials
	const client = await getClientByClientId(db, client_id);
	if (!client) {
		return c.json({ error: "invalid_client", error_description: "Client not found" }, 401);
	}

	const secretValid = await verifySecret(client_secret, client.client_secret_hash);
	if (!secretValid) {
		return c.json(
			{
				error: "invalid_client",
				error_description: "Invalid client credentials",
			},
			401,
		);
	}

	// Atomically validate + revoke (rotate) the refresh token in one statement.
	// A read-then-write here would let two concurrent requests both pass
	// validation on the same token before either revoke lands, minting two
	// independent valid token families from one stolen token.
	const tokenHash = await hashSecret(refresh_token);
	const consumedToken = await consumeRefreshToken(db, tokenHash, client_id);

	if (!consumedToken) {
		// Distinguish "already used" from "never existed"/"wrong
		// client"/"expired": presenting an already-rotated token is the
		// canonical signal (RFC 6819 §5.2.2.3) that a copy was stolen and used
		// by someone else first — the whole family gets revoked, not just this
		// one token, since we can no longer tell which copy is legitimate.
		const anyRecord = await getRefreshTokenByHashAnyStatus(db, tokenHash);
		if (anyRecord && anyRecord.revoked && anyRecord.client_id === client_id) {
			await revokeAllUserTokens(db, anyRecord.user_id);
			await logRefreshTokenReuse(db, anyRecord.user_id, {
				client_id,
				ip_address: getClientIP(c.req.raw),
				user_agent: getUserAgent(c.req.raw),
			});
		}

		return c.json({ error: "invalid_grant", error_description: "Invalid refresh token" }, 400);
	}

	// Get user
	const user = await getUserById(db, consumedToken.user_id);
	if (!user) {
		return c.json({ error: "invalid_grant", error_description: "User not found" }, 400);
	}

	// Generate new tokens
	const accessToken = await createAccessToken(c.env, user, client_id);
	const newRefreshToken = generateRefreshToken();
	const newRefreshTokenHash = await hashSecret(newRefreshToken);
	const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY * 1000).toISOString();

	await createRefreshToken(db, {
		token_hash: newRefreshTokenHash,
		user_id: user.id,
		client_id: client_id,
		expires_at: refreshExpiresAt,
	});

	// Log the refresh
	await logTokenRefresh(db, user.id, {
		client_id,
		ip_address: getClientIP(c.req.raw),
		user_agent: getUserAgent(c.req.raw),
	});

	const response: TokenResponse = {
		access_token: accessToken,
		token_type: "Bearer",
		expires_in: ACCESS_TOKEN_EXPIRY,
		refresh_token: newRefreshToken,
		scope: DEFAULT_SCOPE,
	};

	return c.json(response, 200, NO_STORE_HEADERS);
}

/**
 * Handle urn:ietf:params:oauth:grant-type:device_code grant type (RFC 8628)
 *
 * This is called by the CLI to poll for authorization status.
 * Returns tokens when user approves, or appropriate error codes otherwise.
 */
async function handleDeviceCodeGrant(
	c: Context<{ Bindings: Env }>,
	params: Record<string, string>,
	db: ReturnType<D1Database["withSession"]>,
) {
	const { device_code, client_id } = params;

	if (!device_code || !client_id) {
		return c.json(
			{
				error: "invalid_request",
				error_description: "Missing required parameters",
			},
			400,
		);
	}

	// Rate limit by device_code — unauthenticated (no client_secret per RFC
	// 8628) and performs DB writes every poll, so it needs its own ceiling
	// independent of the per-code `interval` slow_down logic below (which
	// does nothing for an attacker spraying random device_code values).
	const rateLimit = await checkRouteRateLimit(
		db,
		"device_poll",
		device_code,
		RATE_LIMIT_DEVICE_POLL,
		RATE_LIMIT_WINDOW,
	);
	if (!rateLimit.allowed) {
		return c.json(
			{
				error: "slow_down",
				error_description: "Too many requests",
				retry_after: rateLimit.retryAfter,
			},
			429,
		);
	}

	// Validate client exists (no secret required for device flow per RFC 8628)
	const client = await getClientByClientId(db, client_id);
	if (!client) {
		return c.json({ error: "invalid_client", error_description: "Client not found" }, 401);
	}

	// Hash the device code to look it up
	const deviceCodeHash = await hashSecret(device_code);
	const deviceCodeRecord = await getDeviceCodeByHash(db, deviceCodeHash);

	if (!deviceCodeRecord) {
		return c.json({ error: "invalid_grant", error_description: "Invalid device code" }, 400);
	}

	// Verify client_id matches
	if (deviceCodeRecord.client_id !== client_id) {
		return c.json({ error: "invalid_grant", error_description: "Client mismatch" }, 400);
	}

	const now = Math.floor(Date.now() / 1000);

	// Check if code has expired
	if (deviceCodeRecord.expires_at < now) {
		return c.json({ error: "expired_token", error_description: "Device code has expired" }, 400);
	}

	// Check polling rate (slow_down detection) using the timestamp from
	// *before* this poll is recorded below.
	const isPollingTooFast =
		deviceCodeRecord.last_poll_at != null &&
		now - deviceCodeRecord.last_poll_at < deviceCodeRecord.interval;

	// Always record this poll attempt, including rejected ones — otherwise
	// last_poll_at never advances for a client polling faster than the
	// interval, so every subsequent fast poll re-compares against the same
	// stale timestamp and ratchets the interval again on every request,
	// rapidly exceeding DEVICE_CODE_EXPIRY for a merely-eager client.
	await updateDevicePollCount(db, deviceCodeRecord.id);

	if (isPollingTooFast) {
		// Cap the ratchet so a fast-polling client can't drive the interval
		// past the code's own expiry within a few seconds.
		const newInterval = Math.min(
			deviceCodeRecord.interval + DEVICE_CODE_SLOW_DOWN_INCREMENT,
			DEVICE_CODE_MAX_POLL_INTERVAL,
		);
		const delta = newInterval - deviceCodeRecord.interval;
		if (delta > 0) {
			await incrementDeviceInterval(db, deviceCodeRecord.id, delta);
		}
		return c.json(
			{
				error: "slow_down",
				error_description: `Poll interval increased to ${newInterval} seconds`,
				interval: newInterval,
			},
			400,
		);
	}

	// Check authorization status
	switch (deviceCodeRecord.status) {
		case "pending":
			return c.json(
				{
					error: "authorization_pending",
					error_description: "User has not yet authorized",
				},
				400,
			);

		case "denied":
			// Delete the device code record
			await deleteDeviceCode(db, deviceCodeRecord.id);
			return c.json(
				{
					error: "access_denied",
					error_description: "User denied the authorization request",
				},
				400,
			);

		case "expired":
			return c.json(
				{
					error: "expired_token",
					error_description: "Device code has expired",
				},
				400,
			);

		case "authorized":
			// User approved - issue tokens (handled below)
			break;

		default:
			return c.json(
				{
					error: "server_error",
					error_description: "Invalid device code status",
				},
				500,
			);
	}

	// Atomically consume the device code — only succeeds if it's still
	// `authorized`, and deletes it as part of the same statement. Two
	// concurrent polls of the same authorized code can no longer both mint a
	// token pair: only the request that wins the atomic consume proceeds.
	const consumed = await consumeDeviceCode(db, deviceCodeRecord.id);
	if (!consumed) {
		return c.json(
			{
				error: "invalid_grant",
				error_description: "Device code was already used",
			},
			400,
		);
	}

	// Get the user who authorized
	if (!consumed.user_id) {
		return c.json({ error: "server_error", error_description: "Authorization incomplete" }, 500);
	}

	const user = await getUserById(db, consumed.user_id);
	if (!user) {
		return c.json({ error: "invalid_grant", error_description: "User not found" }, 400);
	}

	// Generate tokens
	const accessToken = await createAccessToken(c.env, user, client_id);
	const refreshToken = generateRefreshToken();
	const refreshTokenHash = await hashSecret(refreshToken);
	const refreshExpiresAt = new Date(Date.now() + REFRESH_TOKEN_EXPIRY * 1000).toISOString();

	await createRefreshToken(db, {
		token_hash: refreshTokenHash,
		user_id: user.id,
		client_id: client_id,
		expires_at: refreshExpiresAt,
	});

	// Log the device code token exchange
	await createAuditLog(db, {
		event_type: "device_code_polled",
		user_id: user.id,
		client_id,
		ip_address: getClientIP(c.req.raw),
		user_agent: getUserAgent(c.req.raw),
		details: { action: "token_issued", user_code: consumed.user_code },
	});

	const response: TokenResponse = {
		access_token: accessToken,
		token_type: "Bearer",
		expires_in: ACCESS_TOKEN_EXPIRY,
		refresh_token: refreshToken,
		scope: consumed.scope || DEFAULT_SCOPE,
	};

	return c.json(response, 200, NO_STORE_HEADERS);
}

export default token;
