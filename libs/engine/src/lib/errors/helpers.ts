import { error } from "@sveltejs/kit";
import { logGroveError, buildErrorUrl, buildErrorJson } from "@autumnsgrove/grove-errors";
import type { GroveErrorDef } from "@autumnsgrove/grove-errors";

export { logGroveError, buildErrorUrl, buildErrorJson };

/**
 * Log a structured error and throw a SvelteKit error with the code attached.
 *
 * The thrown error includes `{ message, code, category }` which `+error.svelte`
 * can render with the error code in monospace.
 *
 * **Important:** This uses SvelteKit's `error()` helper, so it must NOT be used
 * in Hono-based packages (Heartwood). Use `buildErrorJson()` there instead.
 */
export function throwGroveError(
	status: number,
	groveError: GroveErrorDef,
	prefix: string,
	context: {
		path?: string;
		userId?: string;
		detail?: string;
		cause?: unknown;
		[key: string]: unknown;
	} = {},
): never {
	logGroveError(prefix, groveError, context);

	throw error(status, {
		message: groveError.userMessage,
		code: groveError.code,
	});
}
