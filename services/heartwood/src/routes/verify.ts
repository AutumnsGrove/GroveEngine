/**
 * Verify Routes - Token verification and user info
 */

import { Hono, type Context } from "hono";
import type { Env, TokenInfo, UserInfo } from "../types.js";
import {
	getUserById,
	revokeAllUserTokens,
	revokeAllUserSessions as revokeAllDbSessions,
} from "../db/queries.js";
import { verifyAccessToken } from "../services/jwt.js";
import { logLogout } from "../services/user.js";
import { getClientIP, getUserAgent } from "../middleware/security.js";
import { createDbSession } from "../db/session.js";
import { verifyRateLimiter, checkRouteRateLimit } from "../middleware/rateLimit.js";
import { buildClearAuthCookiesHeaders } from "../lib/session.js";
import { invalidateAllUserSessions as invalidateAllBetterAuthSessions } from "../lib/server/session.js";
import type { SessionDO } from "../durables/SessionDO.js";
import { RATE_LIMIT_WINDOW, RATE_LIMIT_LOGOUT } from "../utils/constants.js";

const verify = new Hono<{ Bindings: Env }>();

// Was defined but never wired up anywhere in the service — see #1583.
// Keyed by IP (the caller isn't authenticated yet when this runs), so it
// also bounds the DB-free /verify and auth-gated-before-DB /userinfo paths
// against flood/CPU-amplification abuse from anyone, not just token holders.
verify.use("/*", verifyRateLimiter);

// /logout's only expected body field is a short redirect_uri string, and
// this route isn't proxied through login's MAX_BODY_SIZE guard (it's
// directly internet-reachable) — bound it well above any real value.
const MAX_LOGOUT_BODY_BYTES = 4096;

const MISSING_TOKEN_ERROR = {
	error: "invalid_token",
	error_description: "Missing or invalid token",
} as const;
const INVALID_TOKEN_ERROR = {
	error: "invalid_token",
	error_description: "Token is invalid or expired",
} as const;

/** Extract a bearer token from the Authorization header, or null. */
function extractBearerToken(c: Context<{ Bindings: Env }>): string | null {
	const authHeader = c.req.header("Authorization");
	if (!authHeader || !authHeader.startsWith("Bearer ")) return null;
	return authHeader.substring(7);
}

/**
 * GET /verify - Verify an access token (OAuth 2.0 Token Introspection)
 */
verify.get("/", async (c) => {
	const token = extractBearerToken(c);
	if (!token) {
		// Per OAuth 2.0 introspection spec, return inactive for invalid tokens
		const response: TokenInfo = { active: false };
		return c.json(response);
	}

	const payload = await verifyAccessToken(c.env, token);
	if (!payload) {
		const response: TokenInfo = { active: false };
		return c.json(response);
	}

	// JWT access tokens are stateless: a token whose owner has since logged
	// out, been banned, or been deleted stays signature-valid for the rest of
	// its lifetime (ACCESS_TOKEN_EXPIRY, currently 1 hour) — there's no
	// revocation blocklist (same accepted tradeoff documented in
	// session.ts). This existence check closes the one gap that's cheap to
	// close without one: /userinfo already refuses a deleted user's token,
	// so /verify should agree rather than report active:true for a user
	// that no longer exists.
	const db = createDbSession(c.env);
	const user = await getUserById(db, payload.sub);
	if (!user) {
		const response: TokenInfo = { active: false };
		return c.json(response);
	}

	// Token is valid
	// Note: email and name intentionally excluded - clients should use /userinfo endpoint
	const response: TokenInfo = {
		active: true,
		sub: payload.sub,
		exp: payload.exp,
		iat: payload.iat,
		client_id: payload.client_id,
	};

	return c.json(response);
});

/**
 * GET /userinfo - Get current user information
 */
verify.get("/userinfo", async (c) => {
	const db = createDbSession(c.env);
	const token = extractBearerToken(c);

	if (!token) {
		return c.json(MISSING_TOKEN_ERROR, 401);
	}

	const payload = await verifyAccessToken(c.env, token);
	if (!payload) {
		return c.json(INVALID_TOKEN_ERROR, 401);
	}

	// Get full user info from database
	const user = await getUserById(db, payload.sub);

	if (!user) {
		// SECURITY: Return same error as invalid token to prevent user enumeration
		// (attacker with token for deleted user shouldn't learn user was deleted)
		return c.json(INVALID_TOKEN_ERROR, 401);
	}

	const response: UserInfo = {
		sub: user.id,
		email: user.email,
		name: user.name,
		picture: user.avatar_url || "",
		provider: user.provider,
	};

	return c.json(response);
});

/**
 * POST /logout - Logout user and revoke every session mechanism
 *
 * Revokes refresh tokens, SessionDO sessions, Better Auth sessions, and
 * legacy D1 sessions for this user, and clears every auth cookie — this
 * endpoint is documented as Heartwood's logout endpoint (see the root
 * endpoint listing in index.ts) and previously only revoked refresh
 * tokens, leaving a caller that also held a grove_session or Better Auth
 * cookie fully signed in through every other mechanism.
 */
verify.post("/logout", async (c) => {
	const db = createDbSession(c.env);
	const token = extractBearerToken(c);

	if (!token) {
		return c.json(MISSING_TOKEN_ERROR, 401);
	}

	const payload = await verifyAccessToken(c.env, token);
	if (!payload) {
		return c.json(INVALID_TOKEN_ERROR, 401);
	}

	// Per-user limit, separate from the IP-keyed verifyRateLimiter above —
	// this call fans out to four revocation calls per request.
	const rateLimit = await checkRouteRateLimit(
		db,
		"logout",
		payload.sub,
		RATE_LIMIT_LOGOUT,
		RATE_LIMIT_WINDOW,
	);
	if (!rateLimit.allowed) {
		return c.json(
			{
				error: "rate_limit",
				message: "Too many requests. Please try again later.",
				retry_after: rateLimit.retryAfter,
			},
			429,
		);
	}

	const sessionDO = c.env.SESSIONS.get(
		c.env.SESSIONS.idFromName(`session:${payload.sub}`),
	) as DurableObjectStub<SessionDO>;

	await Promise.all([
		revokeAllUserTokens(db, payload.sub),
		sessionDO.revokeAllSessions(),
		invalidateAllBetterAuthSessions(payload.sub, c.env),
		revokeAllDbSessions(db, payload.sub),
	]);

	// Log the logout
	await logLogout(db, payload.sub, {
		client_id: payload.client_id,
		ip_address: getClientIP(c.req.raw),
		user_agent: getUserAgent(c.req.raw),
	});

	// Parse optional redirect URI from body. This is echoed back inert — the
	// caller already supplied the value, nothing is gained by reflecting
	// it — never used as a redirect target by this endpoint. A non-string
	// value is dropped rather than serialized back untyped. Bounded on the
	// raw text (not Content-Length, which isn't guaranteed present) so an
	// oversized body is rejected before JSON.parse rather than after.
	let redirectUri: string | undefined;
	try {
		const rawBody = await c.req.text();
		if (rawBody && rawBody.length <= MAX_LOGOUT_BODY_BYTES) {
			const body = JSON.parse(rawBody) as { redirect_uri?: unknown };
			if (typeof body.redirect_uri === "string") {
				redirectUri = body.redirect_uri;
			}
		}
	} catch {
		// No body or invalid JSON, that's fine
	}

	return new Response(JSON.stringify({ success: true, redirect_uri: redirectUri }), {
		status: 200,
		headers: buildClearAuthCookiesHeaders({ "Content-Type": "application/json" }),
	});
});

export default verify;
