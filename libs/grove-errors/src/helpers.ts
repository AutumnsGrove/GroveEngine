import type { GroveErrorDef } from "./types.js";

/**
 * Log a Grove error with structured context.
 * Sensitive data (tokens, secrets, passwords) is NEVER included.
 */
export function logGroveError(
	prefix: string,
	groveError: GroveErrorDef,
	context: {
		path?: string;
		userId?: string;
		detail?: string;
		cause?: unknown;
		[key: string]: unknown;
	} = {},
): void {
	const { cause, ...rest } = context;
	const causeMessage = cause instanceof Error ? cause.message : cause ? String(cause) : undefined;

	console.error(
		`[${prefix}] ${groveError.code}: ${groveError.adminMessage}`,
		JSON.stringify({
			code: groveError.code,
			category: groveError.category,
			...rest,
			...(causeMessage ? { cause: causeMessage } : {}),
		}),
	);
}

/**
 * Build a redirect URL with structured error params.
 */
export function buildErrorUrl(
	groveError: GroveErrorDef,
	baseUrl = "/",
	extra?: Record<string, string>,
): string {
	const params = new URLSearchParams();
	params.set("error", groveError.userMessage);
	params.set("error_code", groveError.code);

	if (extra) {
		for (const [key, value] of Object.entries(extra)) {
			if (key !== "error" && key !== "error_code") {
				params.set(key, value);
			}
		}
	}

	return `${baseUrl}?${params.toString()}`;
}

/**
 * Build a JSON error response body.
 * Compatible with Heartwood's existing `{ error, error_code, error_description }` format.
 */
export function buildErrorJson(groveError: GroveErrorDef): {
	error: string;
	error_code: string;
	error_description: string;
} {
	return {
		error: groveError.code,
		error_code: groveError.code,
		error_description: groveError.userMessage,
	};
}
