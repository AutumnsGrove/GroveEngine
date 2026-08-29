/**
 * JWT Service - Token creation and verification using jose
 */

import * as jose from "jose";
import type { Env, JWTPayload, User } from "../types.js";
import { ACCESS_TOKEN_EXPIRY, JWT_ISSUER, JWT_ALGORITHM } from "../utils/constants.js";

// Cache for imported keys. NOTE: despite the name, this is per-*isolate*,
// not per-request — Workers reuse an isolate across many requests, so a
// warm isolate keeps verifying against whichever key was imported first
// until it's recycled. Rotating JWT_PRIVATE_KEY/JWT_PUBLIC_KEY does not
// invalidate this cache; deploying a new key can produce a window where
// some in-flight isolates still validate against the old key.
let cachedPrivateKey: CryptoKey | null = null;
let cachedPublicKey: CryptoKey | null = null;

/**
 * Import RSA private key from PEM format
 */
async function getPrivateKey(env: Env): Promise<CryptoKey> {
	if (cachedPrivateKey) return cachedPrivateKey;

	const privateKey = await jose.importPKCS8(env.JWT_PRIVATE_KEY, JWT_ALGORITHM);
	cachedPrivateKey = privateKey as CryptoKey;
	return cachedPrivateKey;
}

/**
 * Import RSA public key from PEM format
 */
async function getPublicKey(env: Env): Promise<CryptoKey> {
	if (cachedPublicKey) return cachedPublicKey;

	const publicKey = await jose.importSPKI(env.JWT_PUBLIC_KEY, JWT_ALGORITHM);
	cachedPublicKey = publicKey as CryptoKey;
	return cachedPublicKey;
}

/**
 * Create a signed JWT access token
 */
export async function createAccessToken(env: Env, user: User, clientId: string): Promise<string> {
	const privateKey = await getPrivateKey(env);
	const now = Math.floor(Date.now() / 1000);

	// Note: PII (email, name) intentionally excluded from JWT claims
	// Clients should fetch user details from the /userinfo endpoint
	const payload: JWTPayload = {
		sub: user.id,
		client_id: clientId,
		aud: clientId,
		iss: JWT_ISSUER,
		iat: now,
		exp: now + ACCESS_TOKEN_EXPIRY,
	};

	const jwt = await new jose.SignJWT(payload as unknown as jose.JWTPayload)
		.setProtectedHeader({ alg: JWT_ALGORITHM, typ: "JWT" })
		.setIssuedAt(payload.iat)
		.setExpirationTime(payload.exp)
		.setIssuer(payload.iss)
		.setSubject(payload.sub)
		.setAudience(clientId)
		.sign(privateKey);

	return jwt;
}

/**
 * Verify and decode a JWT access token.
 *
 * `expectedAudience` is optional and unchecked by default — /verify and
 * /userinfo are generic resource-server endpoints serving every registered
 * client equally, so they have no single expected audience to check
 * against. A resource server that only ever expects tokens for its own
 * client_id should pass its own client_id here so a token issued for a
 * different client is rejected rather than merely decoded and trusted.
 */
export async function verifyAccessToken(
	env: Env,
	token: string,
	expectedAudience?: string,
): Promise<JWTPayload | null> {
	try {
		const publicKey = await getPublicKey(env);

		const { payload } = await jose.jwtVerify(token, publicKey, {
			issuer: JWT_ISSUER,
			algorithms: [JWT_ALGORITHM],
			...(expectedAudience ? { audience: expectedAudience } : {}),
		});

		return {
			sub: payload.sub as string,
			client_id: payload.client_id as string,
			aud: (Array.isArray(payload.aud) ? payload.aud[0] : payload.aud) as string,
			iss: payload.iss as string,
			iat: payload.iat as number,
			exp: payload.exp as number,
		};
	} catch {
		return null;
	}
}

/**
 * Decode a JWT without verification (for inspection only)
 */
export function decodeToken(token: string): JWTPayload | null {
	try {
		const decoded = jose.decodeJwt(token);
		return {
			sub: decoded.sub as string,
			client_id: decoded.client_id as string,
			aud: (Array.isArray(decoded.aud) ? decoded.aud[0] : decoded.aud) as string,
			iss: decoded.iss as string,
			iat: decoded.iat as number,
			exp: decoded.exp as number,
		};
	} catch {
		return null;
	}
}

/**
 * Check if a token is expired
 */
export function isTokenExpired(payload: JWTPayload): boolean {
	const now = Math.floor(Date.now() / 1000);
	return payload.exp < now;
}

/**
 * Get token expiration time remaining in seconds
 */
export function getTokenTimeRemaining(payload: JWTPayload): number {
	const now = Math.floor(Date.now() / 1000);
	return Math.max(0, payload.exp - now);
}
