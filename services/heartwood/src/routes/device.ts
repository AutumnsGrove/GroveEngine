/**
 * Device Authorization Routes (RFC 8628)
 *
 * Implements OAuth 2.0 Device Authorization Grant for CLI/device authentication.
 * Users initiate auth from CLI, then approve in browser while logged in.
 *
 * Endpoints:
 * - POST /auth/device-code - Generate device/user codes (called by CLI)
 * - GET /auth/device - Authorization UI page (user visits this)
 * - POST /auth/device/authorize - User approves/denies (from UI)
 */

import { Hono, type Context } from "hono";
import type { Env, DeviceCodeResponse, User } from "../types.js";
import {
	getClientByClientId,
	createDeviceCode,
	getDeviceCodeByUserCode,
	authorizeDeviceCode,
	denyDeviceCode,
	isUserCodeUnique,
	createAuditLog,
	cleanupExpiredDeviceCodes,
	getUserById,
} from "../db/queries.js";
import { createDbSession } from "../db/session.js";
import {
	generateDeviceCode,
	generateUserCode,
	hashSecret,
	timingSafeEqual,
	base64UrlEncode,
} from "../utils/crypto.js";
import { deviceCodeInitSchema, deviceAuthorizeSchema } from "../utils/validation.js";
import { getClientIP, getUserAgent } from "../middleware/security.js";
import { checkRouteRateLimit } from "../middleware/rateLimit.js";
import { parseCookieHeader } from "../lib/session.js";
import {
	DEVICE_CODE_EXPIRY,
	DEVICE_CODE_POLL_INTERVAL,
	DEVICE_CODE_CHARS,
	USER_CODE_LENGTH,
	RATE_LIMIT_DEVICE_INIT,
	RATE_LIMIT_DEVICE_AUTHORIZE,
	RATE_LIMIT_WINDOW,
} from "../utils/constants.js";
import { getDeviceAuthorizationPageHTML } from "../templates/device.js";

const device = new Hono<{ Bindings: Env }>();

const DEVICE_CODE_COOKIE = "device_code_pending";

/**
 * Resolve the current user via a Better Auth session, verified against the
 * Cookie header on this request. Shared by GET /device and POST
 * /device/authorize so session-verification logic lives in exactly one
 * place.
 */
async function getBetterAuthUser(
	c: Context<{ Bindings: Env }>,
	db: ReturnType<typeof createDbSession>,
): Promise<User | null> {
	try {
		const sessionResponse = await fetch(`${c.env.AUTH_BASE_URL}/api/auth/session`, {
			headers: {
				Cookie: c.req.header("Cookie") || "",
			},
		});
		if (sessionResponse.ok) {
			const sessionData = (await sessionResponse.json()) as {
				user?: { id: string };
			};
			if (sessionData?.user?.id) {
				return await getUserById(db, sessionData.user.id);
			}
		}
	} catch (error) {
		console.error("[Device] Better Auth session check failed:", error);
	}
	return null;
}

/**
 * Sign a consent token binding a specific user to a specific device
 * user_code. Rendered as a hidden field on the approve/deny form and
 * verified on submit — defense-in-depth against CSRF beyond Origin/Referer
 * checks, since an attacker's page can't derive this value without
 * SESSION_SECRET.
 */
async function signConsentToken(secret: string, userId: string, userCode: string): Promise<string> {
	const key = await crypto.subtle.importKey(
		"raw",
		new TextEncoder().encode(secret),
		{ name: "HMAC", hash: "SHA-256" },
		false,
		["sign"],
	);
	const signature = await crypto.subtle.sign(
		"HMAC",
		key,
		new TextEncoder().encode(`${userId}:${userCode}`),
	);
	return base64UrlEncode(signature);
}

/**
 * POST /auth/device-code - Device Authorization Request
 *
 * Called by CLI to initiate the device flow.
 * Returns device_code (for polling) and user_code (for user to enter).
 */
device.post("/device-code", async (c) => {
	const db = createDbSession(c.env);

	// Parse and validate request body BEFORE rate limiting, so a malformed
	// request doesn't consume the IP's quota — but still before any DB
	// lookup, so a well-formed spam request does.
	let body: { client_id: string; scope?: string };
	try {
		const contentType = c.req.header("content-type") || "";
		if (contentType.includes("application/json")) {
			body = await c.req.json();
		} else {
			// URL-encoded form data
			const formData = await c.req.text();
			const params = new URLSearchParams(formData);
			body = {
				client_id: params.get("client_id") || "",
				scope: params.get("scope") || undefined,
			};
		}
	} catch {
		return c.json({ error: "invalid_request", error_description: "Invalid request body" }, 400);
	}

	const parsed = deviceCodeInitSchema.safeParse(body);
	if (!parsed.success) {
		return c.json(
			{
				error: "invalid_request",
				error_description: parsed.error.issues[0].message,
			},
			400,
		);
	}

	const { client_id, scope } = parsed.data;

	// Rate limit by IP + client_id, before any DB lookup.
	const clientIP = getClientIP(c.req.raw);
	const rateLimit = await checkRouteRateLimit(
		db,
		"device_init",
		`${clientIP}:${client_id}`,
		RATE_LIMIT_DEVICE_INIT,
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

	// Validate client exists
	const client = await getClientByClientId(db, client_id);
	if (!client) {
		return c.json({ error: "invalid_client", error_description: "Client not found" }, 401);
	}

	// Generate unique user code (retry if collision)
	let userCode = "";
	let unique = false;
	let attempts = 0;
	const maxAttempts = 5;
	while (!unique && attempts < maxAttempts) {
		userCode = generateUserCode(DEVICE_CODE_CHARS, USER_CODE_LENGTH);
		unique = await isUserCodeUnique(db, userCode);
		attempts++;
	}

	if (!unique) {
		return c.json(
			{
				error: "server_error",
				error_description: "Failed to generate unique code",
			},
			500,
		);
	}

	// Generate device code and hash it for storage
	const deviceCodeRaw = generateDeviceCode();
	const deviceCodeHash = await hashSecret(deviceCodeRaw);

	// Calculate expiration
	const expiresAt = Math.floor(Date.now() / 1000) + DEVICE_CODE_EXPIRY;

	// Store device code. isUserCodeUnique above is check-then-insert with an
	// await gap — a genuinely rare concurrent collision on the UNIQUE
	// user_code column would otherwise surface as a raw, unhandled D1
	// exception instead of a clean error response.
	try {
		await createDeviceCode(db, {
			device_code_hash: deviceCodeHash,
			user_code: userCode,
			client_id,
			scope,
			expires_at: expiresAt,
			interval: DEVICE_CODE_POLL_INTERVAL,
		});
	} catch (error) {
		console.error("[Device] Failed to create device code:", error);
		return c.json(
			{ error: "server_error", error_description: "Failed to create device code" },
			500,
		);
	}

	// Log creation. The user_code itself is a live credential for the
	// ~15-minute life of this code — deliberately not stored in the audit
	// log, since anyone with audit-log read access could otherwise approve
	// it. Correlate by device_codes.id / client_id instead.
	await createAuditLog(db, {
		event_type: "device_code_created",
		client_id,
		ip_address: clientIP,
		user_agent: getUserAgent(c.req.raw),
	});

	// Cleanup expired codes opportunistically
	c.executionCtx.waitUntil(cleanupExpiredDeviceCodes(db));

	// Build verification URIs
	const verificationUri = `${c.env.AUTH_BASE_URL}/auth/device`;
	const verificationUriComplete = `${verificationUri}?user_code=${encodeURIComponent(userCode)}`;

	const response: DeviceCodeResponse = {
		device_code: deviceCodeRaw,
		user_code: userCode,
		verification_uri: verificationUri,
		verification_uri_complete: verificationUriComplete,
		expires_in: DEVICE_CODE_EXPIRY,
		interval: DEVICE_CODE_POLL_INTERVAL,
	};

	return c.json(response);
});

/**
 * GET /auth/device - Device Authorization Page
 *
 * User visits this page to enter the user_code and approve/deny.
 * Requires authenticated session (grove_session cookie from Google OAuth).
 */
device.get("/device", async (c) => {
	const db = createDbSession(c.env);

	// Rate limit by IP — this page performs a DB lookup keyed on
	// user-suppliable user_code, and is otherwise unthrottled.
	const clientIP = getClientIP(c.req.raw);
	const rateLimit = await checkRouteRateLimit(
		db,
		"device_authorize_page",
		clientIP,
		RATE_LIMIT_DEVICE_AUTHORIZE,
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

	// Get user_code from query params, from state (after OAuth redirect), or
	// from the pending-code cookie (set below when we redirect to login).
	let userCodeParam = c.req.query("user_code");
	const stateParam = c.req.query("state");

	if (!userCodeParam && stateParam) {
		try {
			const stateUrl = new URL(decodeURIComponent(stateParam));
			userCodeParam = stateUrl.searchParams.get("user_code") || undefined;
		} catch {
			// State wasn't a URL, ignore
		}
	}

	const cookies = parseCookieHeader(c.req.header("Cookie") || null);
	if (!userCodeParam) {
		userCodeParam = cookies[DEVICE_CODE_COOKIE] || undefined;
	}

	// Try Better Auth session first (new system)
	const user = await getBetterAuthUser(c, db);

	if (!user) {
		// Not logged in - redirect to Heartwood login page. Carry the
		// user_code via an HttpOnly cookie rather than the returnTo URL, so
		// it doesn't sit in CF request logs / browser history / analytics for
		// the length of the login round-trip — this is a live credential for
		// the code's ~15-minute lifetime.
		const returnUrl = `${c.env.AUTH_BASE_URL}/auth/device`;
		const signInUrl = `${c.env.AUTH_BASE_URL}/login?returnTo=${encodeURIComponent(returnUrl)}`;
		const response = c.redirect(signInUrl);
		if (userCodeParam) {
			response.headers.append(
				"Set-Cookie",
				`${DEVICE_CODE_COOKIE}=${encodeURIComponent(userCodeParam)}; Path=/auth/device; HttpOnly; Secure; SameSite=Lax; Max-Age=${DEVICE_CODE_EXPIRY}`,
			);
		}
		return response;
	}

	// Check for success state from redirect
	const successRaw = c.req.query("success");
	const successParam: "approved" | "denied" | null =
		successRaw === "approved" || successRaw === "denied" ? successRaw : null;
	let deviceCode = null;
	let error = null;

	if (userCodeParam && !successParam) {
		deviceCode = await getDeviceCodeByUserCode(db, userCodeParam);
		if (!deviceCode) {
			error = "Invalid or expired code";
		} else {
			const now = Math.floor(Date.now() / 1000);
			if (deviceCode.expires_at < now) {
				error = "This code has expired";
				deviceCode = null;
			} else if (deviceCode.status !== "pending") {
				error = `This code has already been ${deviceCode.status}`;
				deviceCode = null;
			}
		}
	}

	// Get client name for display
	let clientName = "Grove CLI";
	if (deviceCode) {
		const client = await getClientByClientId(db, deviceCode.client_id);
		if (client) {
			clientName = client.name;
		}
	}

	const consentToken = deviceCode
		? await signConsentToken(c.env.SESSION_SECRET, user.id, userCodeParam || "")
		: undefined;

	const html = getDeviceAuthorizationPageHTML({
		userCode: userCodeParam || "",
		clientName,
		userName: user.name || user.email,
		error,
		showForm: !!deviceCode,
		authBaseUrl: c.env.AUTH_BASE_URL,
		success: successParam,
		scope: deviceCode?.scope,
		consentToken,
	});

	// Once the code has been read and rendered into the page (or the cookie
	// turned out stale/invalid), clear the carrier cookie — it's served its
	// purpose and there's no reason to let it linger for the full 15 minutes.
	const htmlResponse = c.html(html);
	if (cookies[DEVICE_CODE_COOKIE]) {
		htmlResponse.headers.append(
			"Set-Cookie",
			`${DEVICE_CODE_COOKIE}=; Path=/auth/device; HttpOnly; Secure; SameSite=Lax; Max-Age=0`,
		);
	}
	return htmlResponse;
});

/**
 * POST /auth/device/authorize - Authorize or Deny Device Code
 *
 * Called when user clicks Approve or Deny on the authorization page.
 * Requires authenticated session.
 */
device.post("/device/authorize", async (c) => {
	const db = createDbSession(c.env);

	// CSRF protection: Validate Origin header on state-changing request
	// SameSite=Lax cookies block cross-origin POST in modern browsers,
	// but Origin validation provides defense-in-depth
	const origin = c.req.header("Origin");
	if (origin) {
		const authOrigin = new URL(c.env.AUTH_BASE_URL).origin;
		if (origin !== authOrigin) {
			return c.json({ error: "invalid_request", error_description: "Invalid origin" }, 403);
		}
	} else {
		// Origin header missing — check Referer as fallback
		const referer = c.req.header("Referer");
		if (referer) {
			const authOrigin = new URL(c.env.AUTH_BASE_URL).origin;
			// Extract origin from Referer URL for exact comparison.
			// startsWith would allow "https://auth.grove.place.evil.com" to
			// bypass. A malformed Referer must fail closed, not throw a raw
			// 500 that skips the CSRF check entirely.
			let refererOrigin: string | null = null;
			try {
				refererOrigin = new URL(referer).origin;
			} catch {
				refererOrigin = null;
			}
			if (refererOrigin !== authOrigin) {
				return c.json({ error: "invalid_request", error_description: "Invalid origin" }, 403);
			}
		} else {
			// SECURITY: Both Origin and Referer missing — deny by default.
			// Modern browsers always send Origin on POST requests (same-origin and cross-origin).
			// Missing both headers suggests header stripping (privacy extensions, proxies, or attack).
			return c.json(
				{
					error: "invalid_request",
					error_description: "Origin validation required",
				},
				403,
			);
		}
	}

	// Rate limit by IP, before the Better Auth session fetch or any DB
	// lookup — this endpoint doubles as an oracle for guessing live
	// user_codes (see the collapsed error responses below), so it needs the
	// same protection RFC 8628 §5.2 calls for on code entry generally.
	const clientIP = getClientIP(c.req.raw);
	const rateLimit = await checkRouteRateLimit(
		db,
		"device_authorize",
		clientIP,
		RATE_LIMIT_DEVICE_AUTHORIZE,
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

	// Try Better Auth session first (new system)
	const user = await getBetterAuthUser(c, db);

	if (!user) {
		return c.json({ error: "unauthorized", error_description: "Authentication required" }, 401);
	}

	// Parse request body
	let body: { user_code: string; action: "approve" | "deny"; consent_token: string };
	try {
		const contentType = c.req.header("content-type") || "";
		if (contentType.includes("application/json")) {
			body = await c.req.json();
		} else {
			const formData = await c.req.text();
			const params = new URLSearchParams(formData);
			body = {
				user_code: params.get("user_code") || "",
				action: (params.get("action") as "approve" | "deny") || "deny",
				consent_token: params.get("consent_token") || "",
			};
		}
	} catch {
		return c.json({ error: "invalid_request", error_description: "Invalid request body" }, 400);
	}

	const parsed = deviceAuthorizeSchema.safeParse(body);
	if (!parsed.success) {
		return c.json(
			{
				error: "invalid_request",
				error_description: parsed.error.issues[0].message,
			},
			400,
		);
	}

	const { user_code, action, consent_token } = parsed.data;

	// Verify the consent token is bound to this exact user + user_code —
	// closes the gap where Origin/Referer checks alone leave a one-click
	// approval reachable from any same-origin content-injection primitive.
	const expectedToken = await signConsentToken(c.env.SESSION_SECRET, user.id, user_code);
	if (!timingSafeEqual(consent_token, expectedToken)) {
		return c.json({ error: "invalid_request", error_description: "Invalid consent token" }, 403);
	}

	// Get device code. Failure cases below (not found / expired / already
	// resolved) are collapsed into one generic response — a distinguishable
	// "already authorized" vs "not found" response would let an
	// authenticated caller enumerate live codes with no other throttle
	// beyond the rate limit above.
	const deviceCode = await getDeviceCodeByUserCode(db, user_code);
	const now = Math.floor(Date.now() / 1000);
	const isPending = !!deviceCode && deviceCode.expires_at >= now && deviceCode.status === "pending";

	if (!isPending || !deviceCode) {
		return c.json({ error: "invalid_grant", error_description: "Invalid or expired code" }, 400);
	}

	const userAgent = getUserAgent(c.req.raw);

	if (action === "approve") {
		// Atomically transition pending -> authorized. Returns null if lost
		// a race with a concurrent request (e.g. a duplicate/replayed POST)
		// that already resolved this code — treated the same as any other
		// already-resolved code.
		const authorized = await authorizeDeviceCode(db, deviceCode.id, user.id);
		if (!authorized) {
			return c.json({ error: "invalid_grant", error_description: "Invalid or expired code" }, 400);
		}

		await createAuditLog(db, {
			event_type: "device_code_authorized",
			user_id: user.id,
			client_id: deviceCode.client_id,
			ip_address: clientIP,
			user_agent: userAgent,
		});

		// For HTML form submission, redirect to success page
		const contentType = c.req.header("content-type") || "";
		if (!contentType.includes("application/json")) {
			return c.redirect(`${c.env.AUTH_BASE_URL}/auth/device?success=approved`);
		}

		return c.json({ success: true, message: "Device authorized successfully" });
	} else {
		const denied = await denyDeviceCode(db, deviceCode.id);
		if (!denied) {
			return c.json({ error: "invalid_grant", error_description: "Invalid or expired code" }, 400);
		}

		await createAuditLog(db, {
			event_type: "device_code_denied",
			user_id: user.id,
			client_id: deviceCode.client_id,
			ip_address: clientIP,
			user_agent: userAgent,
		});

		// For HTML form submission, redirect to denied page
		const contentType = c.req.header("content-type") || "";
		if (!contentType.includes("application/json")) {
			return c.redirect(`${c.env.AUTH_BASE_URL}/auth/device?success=denied`);
		}

		return c.json({ success: true, message: "Device authorization denied" });
	}
});

export default device;
