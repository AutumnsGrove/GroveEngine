/**
 * Bearer Token Authentication Middleware
 *
 * Single-user auth: validates Authorization header against LOFT_API_KEY.
 * Health route is excluded (handled before this middleware).
 *
 * Uses timing-safe comparison (fixes the previous direct equality check).
 */

import { createAuthMiddleware } from "@autumnsgrove/infra/middleware";
import type { Env, AppVariables } from "../types";

export const authMiddleware = createAuthMiddleware<{
	Bindings: Env;
	Variables: AppVariables;
}>({
	headerName: "Authorization",
	tokenPrefix: "Bearer ",
	getSecret: (env) => env.LOFT_API_KEY,
	errors: {
		missingToken: (c) =>
			c.json(
				{ success: false, error: { code: "AUTH_REQUIRED", message: "Bearer token required" } },
				401,
			),
		invalidToken: (c) =>
			c.json({ success: false, error: { code: "AUTH_FAILED", message: "Invalid API key" } }, 401),
	},
});
