/**
 * Input validation utilities using Zod
 */

import { z } from "zod";
import { SUBSCRIPTION_TIERS, type SubscriptionTier } from "../types.js";
import { SUBSCRIPTION_POST_COUNT_MAX } from "./constants.js";

// Token request validation
export const tokenRequestSchema = z
	.object({
		grant_type: z.enum(["authorization_code", "refresh_token"]),
		code: z.string().optional(),
		redirect_uri: z.string().url().optional(),
		client_id: z.string().min(1, "client_id is required"),
		client_secret: z.string().min(1, "client_secret is required"),
		code_verifier: z.string().optional(),
		refresh_token: z.string().optional(),
	})
	.refine(
		(data) => {
			if (data.grant_type === "authorization_code") {
				return !!data.code && !!data.redirect_uri;
			}
			if (data.grant_type === "refresh_token") {
				return !!data.refresh_token;
			}
			return false;
		},
		{
			message: "Missing required parameters for grant type",
		},
	);

// Token revoke request validation
export const tokenRevokeSchema = z.object({
	token: z.string().min(1, "token is required"),
	token_type_hint: z.enum(["refresh_token", "access_token"]).optional(),
	client_id: z.string().min(1, "client_id is required"),
	client_secret: z.string().min(1, "client_secret is required"),
});

// Email validation helper
export function isValidEmail(email: string): boolean {
	const result = z.string().email().safeParse(email);
	return result.success;
}

// URL validation helper
export function isValidUrl(url: string): boolean {
	const result = z.string().url().safeParse(url);
	return result.success;
}

// Parse URL-encoded form data
export function parseFormData(body: string): Record<string, string> {
	const params = new URLSearchParams(body);
	const result: Record<string, string> = {};
	for (const [key, value] of params.entries()) {
		result[key] = value;
	}
	return result;
}

// Device code initiation request validation (RFC 8628)
export const deviceCodeInitSchema = z.object({
	client_id: z.string().min(1, "client_id is required"),
	scope: z.string().optional(),
});

// Device code authorization request validation (user approving/denying)
export const deviceAuthorizeSchema = z.object({
	user_code: z.string().min(1, "user_code is required"),
	action: z.enum(["approve", "deny"]),
	// Bound to the specific user + user_code that rendered the consent form —
	// defense-in-depth against CSRF beyond Origin/Referer checks.
	consent_token: z.string().min(1, "consent_token is required"),
});

// Subscription tier update (internal-service only — see subscription.ts)
export const subscriptionTierUpdateSchema = z.object({
	tier: z.enum(SUBSCRIPTION_TIERS as [SubscriptionTier, ...SubscriptionTier[]]),
});

// Subscription post-count update (internal-service only — see subscription.ts)
// count must be a non-negative, finite integer within a sane ceiling — a
// bare `typeof === "number"` check previously let through 1.5, -5, and
// 1e308, all of which reached the database unvalidated.
export const subscriptionPostCountUpdateSchema = z.union([
	z.object({ action: z.enum(["increment", "decrement"]) }),
	z.object({
		count: z
			.number()
			.int("count must be an integer")
			.min(0, "count must not be negative")
			.max(SUBSCRIPTION_POST_COUNT_MAX, "count is unreasonably large"),
	}),
]);
