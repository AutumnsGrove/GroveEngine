/**
 * Grove Pulse — SvelteKit handleError Hook
 *
 * Automatically captures uncaught server errors as Pulse events.
 * Export from hooks.server.ts alongside the handle hook.
 *
 * Usage:
 *   export { pulseHandleError as handleError } from "@autumnsgrove/lattice/pulse";
 *
 * @module pulse/error-hook
 */

import type { HandleServerError } from "@sveltejs/kit";
import { emitPulseEvent } from "./emitter.js";

export interface PulseErrorHookOptions {
	app: string;
}

/**
 * Strip absolute file paths from stack frames, retaining only the filename,
 * function name, and line/column numbers.
 *
 * Security note: raw stack traces contain full server-side file paths
 * (e.g. /home/runner/work/lattice/…). Those paths must never reach a client
 * or a dashboard that could be publicly accessible. This transform is applied
 * before the stack is stored in pulse metadata so the sanitized form is the
 * only thing that ever leaves this process.
 */
function sanitizeStack(stack: string): string {
	// Replace absolute paths inside "at … (…)" frames, keeping only the filename
	return stack.replace(/\s+at\s+(.+?)\s+\((.+?)\)/g, (match, fn, path) =>
		match.replace(path, path.replace(/.*\//, "")),
	);
}

export function createPulseErrorHook(options: PulseErrorHookOptions): HandleServerError {
	return ({ error, event, status, message }) => {
		const err = error instanceof Error ? error : undefined;
		const MAX_STACK_LINES = 5;

		const rawStack = err?.stack?.split("\n").slice(0, MAX_STACK_LINES).join("\n");

		emitPulseEvent("error.server", {
			app: options.app,
			route: event.route?.id ?? event.url.pathname,
			method: event.request.method,
			status,
			metadata: {
				message: err?.message ?? message,
				stack: rawStack !== undefined ? sanitizeStack(rawStack) : undefined,
			},
		});

		return {
			message: "An unexpected error occurred.",
			code: "INTERNAL_ERROR",
		};
	};
}
