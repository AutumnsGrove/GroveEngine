/**
 * Grove Pulse — Product Observability
 *
 * Two-layer event pipeline: automatic (every request via SvelteKit handle hook)
 * and explicit (business events at key moments). Events flow through a
 * pulse-collector worker with DO-buffered D1 writes.
 *
 * Import from '@autumnsgrove/lattice/pulse'
 *
 * @module pulse
 */

// Emitter API
export { initPulse, emitPulseEvent, emitRequestEvent, flushPulse } from "./emitter.js";

// Visitor hashing
export { hashVisitor } from "./visitor.js";

// SvelteKit handle hook
export { pulseHandle, createPulseFlushHook } from "./hook.js";
export type { PulseHandleOptions } from "./hook.js";

// SvelteKit handleError hook
export { createPulseErrorHook } from "./error-hook.js";
export type { PulseErrorHookOptions } from "./error-hook.js";

// Types
export type {
	PulseCategory,
	PulseEvent,
	PulseEventName,
	PulseRequestEvent,
	PulseBatchPayload,
	PulseCollector,
	PulseEnv,
	SignupFunnelEntry,
	PageEvent,
	SignupEvent,
	PublishEvent,
	SocialEvent,
	CurioEvent,
	FeatureEvent,
	ErrorEvent,
} from "./types.js";
