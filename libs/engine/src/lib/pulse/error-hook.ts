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

export function createPulseErrorHook(options: PulseErrorHookOptions): HandleServerError {
	return ({ error, event, status, message }) => {
		const err = error instanceof Error ? error : undefined;
		const MAX_STACK_LINES = 5;

		emitPulseEvent("error.server", {
			app: options.app,
			route: event.route?.id ?? event.url.pathname,
			method: event.request.method,
			status,
			metadata: {
				message: err?.message ?? message,
				stack: err?.stack?.split("\n").slice(0, MAX_STACK_LINES).join("\n"),
			},
		});

		return {
			message: "An unexpected error occurred.",
			code: "INTERNAL_ERROR",
		};
	};
}
