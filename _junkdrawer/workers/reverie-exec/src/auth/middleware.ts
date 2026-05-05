/**
 * Execution Worker Auth Middleware
 *
 * Validates the EXEC_API_KEY sent by the Reverie worker.
 * Extracts tenant ID and tier from request headers.
 *
 * Auth chain: Reverie → (EXEC_API_KEY) → Exec Worker
 * Only the Reverie worker should call this service.
 */

import { createAuthMiddleware } from "@autumnsgrove/infra/middleware";
import type { Env, ExecVariables } from "../types";
import { EXEC_ERRORS, buildExecError } from "../errors";

// Seedling is first — it is the fallback when X-Tier header is absent.
const VALID_TIERS = ["seedling", "wanderer", "sapling", "oak", "evergreen"] as const;

/**
 * Auth middleware for the execution worker.
 * Validates X-API-Key against EXEC_API_KEY secret.
 */
export const execAuth = createAuthMiddleware<{
	Bindings: Env;
	Variables: ExecVariables;
}>({
	getSecret: (env) => env.EXEC_API_KEY,
	requiredContextHeaders: { tenantId: "X-Tenant-Id" },
	tierHeader: "X-Tier",
	validTiers: VALID_TIERS,
	errors: {
		missingToken: (c) => {
			const { body, status } = buildExecError(EXEC_ERRORS.AUTH_REQUIRED);
			return c.json(body, status as 401);
		},
		secretNotConfigured: (c) => {
			console.error("[ExecAuth] EXEC_API_KEY secret not configured");
			const { body, status } = buildExecError(EXEC_ERRORS.INTERNAL_ERROR);
			return c.json(body, status as 500);
		},
		invalidToken: (c) => {
			const { body, status } = buildExecError(EXEC_ERRORS.AUTH_INVALID);
			return c.json(body, status as 401);
		},
		missingContextHeader: (c, headerName) => {
			const { body, status } = buildExecError(
				EXEC_ERRORS.AUTH_REQUIRED,
				`Missing ${headerName} header`,
			);
			return c.json(body, status as 401);
		},
	},
});
