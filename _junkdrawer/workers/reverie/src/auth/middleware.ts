/**
 * Reverie Auth Middleware
 *
 * Verifies caller identity via REVERIE_API_KEY, then extracts tenant
 * context from X-Tenant-Id / X-Tier headers set by the engine proxy.
 *
 * Only the SvelteKit engine proxy should call this worker. The proxy
 * authenticates users via Heartwood, then forwards verified tenant
 * context through the service binding with the API key.
 */

import { createAuthMiddleware } from "@autumnsgrove/infra/middleware";
import type { Env, ReverieVariables } from "../types";
import { REVERIE_ERRORS, buildReverieError } from "../errors";

const VALID_TIERS = ["wanderer", "seedling", "sapling", "oak", "evergreen"] as const;

/**
 * Auth middleware for protected routes.
 *
 * 1. Verify X-API-Key matches REVERIE_API_KEY (caller auth)
 * 2. Extract X-Tenant-Id and X-Tier from headers (tenant context)
 * 3. Reject wanderer tier (Reverie requires paid plan)
 */
export const reverieAuth = createAuthMiddleware<{
	Bindings: Env;
	Variables: ReverieVariables;
}>({
	getSecret: (env) => env.REVERIE_API_KEY,
	requiredContextHeaders: { tenantId: "X-Tenant-Id" },
	tierHeader: "X-Tier",
	validTiers: VALID_TIERS,
	forbiddenTiers: ["wanderer"],
	errors: {
		missingToken: (c) => {
			const { body, status } = buildReverieError(REVERIE_ERRORS.AUTH_REQUIRED);
			return c.json(body, status as 401);
		},
		secretNotConfigured: (c) => {
			console.error("[ReverieAuth] REVERIE_API_KEY secret not configured");
			const { body, status } = buildReverieError(REVERIE_ERRORS.INTERNAL_ERROR);
			return c.json(body, status as 500);
		},
		invalidToken: (c) => {
			const { body, status } = buildReverieError(REVERIE_ERRORS.AUTH_INVALID);
			return c.json(body, status as 401);
		},
		missingContextHeader: (c) => {
			const { body, status } = buildReverieError(REVERIE_ERRORS.AUTH_REQUIRED);
			return c.json(body, status as 401);
		},
		tierForbidden: (c) => {
			const { body, status } = buildReverieError(REVERIE_ERRORS.TIER_FORBIDDEN);
			return c.json(body, status as 403);
		},
	},
});
