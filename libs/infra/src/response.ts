/**
 * Grove Infra SDK — Shared Response Builders
 *
 * Standard JSON envelope for Grove workers and services:
 *
 *   Success: { success: true,  data: T }
 *   Error:   { success: false, error: { code: string, message: string } }
 *
 * Use these in new code and when touching existing response sites.
 * Migrate conservatively — do not change external API contracts.
 *
 * @example
 * ```typescript
 * import { jsonResponse, errorResponse } from "@autumnsgrove/infra/response";
 *
 * // success
 * return jsonResponse({ id: "abc", status: "ok" });
 *
 * // error
 * return errorResponse("Agent not found", 404, "NOT_FOUND");
 *
 * // no content
 * return noContentResponse();
 * ```
 */

// =============================================================================
// Types
// =============================================================================

/** Standard success envelope. */
export interface GroveSuccessResponse<T = unknown> {
	success: true;
	data: T;
}

/** Standard error envelope. */
export interface GroveErrorResponse {
	success: false;
	error: {
		code: string;
		message: string;
	};
}

/** Union of success and error envelopes. */
export type GroveResponse<T = unknown> = GroveSuccessResponse<T> | GroveErrorResponse;

// =============================================================================
// Helpers
// =============================================================================

const JSON_HEADERS = { "Content-Type": "application/json" } as const;

/**
 * Create a 200 (or custom status) JSON success response.
 *
 * Wraps `data` in the standard `{ success: true, data }` envelope.
 */
export function jsonResponse<T>(data: T, status = 200): Response {
	const body: GroveSuccessResponse<T> = { success: true, data };
	return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

/**
 * Create a JSON error response.
 *
 * Defaults to HTTP 400. If `code` is omitted it falls back to `HTTP_<status>`.
 */
export function errorResponse(message: string, status = 400, code?: string): Response {
	const body: GroveErrorResponse = {
		success: false,
		error: { code: code ?? `HTTP_${status}`, message },
	};
	return new Response(JSON.stringify(body), { status, headers: JSON_HEADERS });
}

/**
 * Create a 204 No Content response.
 *
 * Use for DELETE or mutation endpoints that have nothing meaningful to return.
 */
export function noContentResponse(): Response {
	return new Response(null, { status: 204 });
}

/**
 * Serialize a pre-built `GroveResponse` object into an HTTP `Response`.
 *
 * Useful when business logic assembles the envelope first and the route
 * just needs to send it. Success uses `successStatus` (default 200),
 * errors use `errorStatus` (default 400).
 */
export function groveResponse<T>(
	result: GroveResponse<T>,
	successStatus = 200,
	errorStatus = 400,
): Response {
	if (result.success) {
		return new Response(JSON.stringify(result), { status: successStatus, headers: JSON_HEADERS });
	}
	return new Response(JSON.stringify(result), { status: errorStatus, headers: JSON_HEADERS });
}
