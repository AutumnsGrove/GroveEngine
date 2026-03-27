/**
 * UI Grafts System — DEPRECATED re-export shim
 *
 * This module has moved to platform/.
 * This shim exists for backward compatibility and will be removed in a future release.
 */

// Types
export type {
	GraftId,
	ProductId,
	GraftRegistryEntry,
	GraftContext,
	BaseGraftProps,
} from "../platform/types.js";

// Registry & helpers
export {
	GRAFT_REGISTRY,
	getGraftEntry,
	isGraftEnabled,
	getAllGrafts,
	getGraftsByStatus,
} from "../platform/registry.js";

// Svelte context
export {
	setGraftContext,
	getGraftContext,
	requireGraftContext,
} from "../platform/context.svelte.js";
