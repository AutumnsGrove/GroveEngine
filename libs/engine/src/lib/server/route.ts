/**
 * Grove Route Utilities
 *
 * Shared guards and helpers for SvelteKit +server.ts route handlers.
 * Import via: import { ... } from "@autumnsgrove/lattice/server"
 */

import { json } from "@sveltejs/kit";

/**
 * Guard: require an authenticated user.
 *
 * Returns a 401 Response if the user is falsy; returns null if authenticated.
 *
 * Usage:
 *   const guard = guardAuth(locals.user);
 *   if (guard) return guard;
 */
export function guardAuth(user: unknown): Response | null {
	if (!user) {
		return json(
			{
				error: "GROVE-API-020",
				error_code: "UNAUTHORIZED",
				error_description: "Please sign in to continue.",
			},
			{ status: 401 },
		);
	}
	return null;
}

/**
 * Guard: require a D1 database binding.
 *
 * Returns a 503 Response if the binding is missing; returns null if available.
 *
 * Usage:
 *   const guard = guardDb(platform?.env?.DB);
 *   if (guard) return guard;
 */
export function guardDb(db: unknown): Response | null {
	if (!db) {
		return json(
			{
				error: "GROVE-API-503",
				error_code: "DATABASE_UNAVAILABLE",
				error_description: "Database unavailable.",
			},
			{ status: 503 },
		);
	}
	return null;
}

/**
 * Parse JSON from a Request body, returning [body, null] on success
 * or [null, Response] on invalid JSON.
 *
 * Usage:
 *   const [body, parseError] = await parseJsonBody<MyType>(request);
 *   if (parseError) return parseError;
 */
export async function parseJsonBody<T>(request: Request): Promise<[T, null] | [null, Response]> {
	try {
		const body = (await request.json()) as T;
		return [body, null];
	} catch {
		return [
			null,
			json(
				{
					error: "GROVE-API-001",
					error_code: "INVALID_BODY",
					error_description: "Invalid JSON body.",
				},
				{ status: 400 },
			),
		];
	}
}
