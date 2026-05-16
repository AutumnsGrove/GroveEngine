/**
 * Grove Pulse — Product Observability Event Types
 *
 * @module pulse/types
 */

// =============================================================================
// Event Categories
// =============================================================================

export type PulseCategory =
	| "page"
	| "signup"
	| "publish"
	| "social"
	| "curio"
	| "feature"
	| "error";

// =============================================================================
// Event Names (per category)
// =============================================================================

export type PageEvent = "page.viewed";

export type SignupEvent =
	| "signup.started"
	| "signup.oauth_complete"
	| "signup.profile_done"
	| "signup.email_verified"
	| "signup.plan_selected"
	| "signup.checkout_complete"
	| "signup.tenant_created";

export type PublishEvent = "post.published" | "post.updated" | "post.deleted";

export type SocialEvent = "comment.posted" | "comment.moderated";

export type CurioEvent = "curio.deployed" | "curio.removed";

export type FeatureEvent = "lantern.navigated" | "reeds.engaged";

export type ErrorEvent = "error.server" | "error.client";

export type PulseEventName =
	| PageEvent
	| SignupEvent
	| PublishEvent
	| SocialEvent
	| CurioEvent
	| FeatureEvent
	| ErrorEvent;

// =============================================================================
// Core Event Shape
// =============================================================================

export interface PulseEvent {
	event: PulseEventName;
	category: PulseCategory;
	timestamp: number;
	route?: string;
	method?: string;
	status?: number;
	duration_ms?: number;
	tenant_id?: string;
	visitor_hash?: string;
	app?: string;
	metadata?: Record<string, unknown>;
}

// =============================================================================
// Automatic Request Event (from SvelteKit handle hook)
// =============================================================================

export interface PulseRequestEvent {
	route: string;
	method: string;
	status: number;
	duration_ms: number;
	tenant_id?: string;
	visitor_hash?: string;
	app: string;
}

// =============================================================================
// Signup Funnel Record (dedicated table)
// =============================================================================

export interface SignupFunnelEntry {
	user_id: string;
	step: SignupEvent;
	timestamp: number;
	duration_from_start_ms?: number;
	metadata?: Record<string, unknown>;
}

// =============================================================================
// Collector Environment Bindings
// =============================================================================

export interface PulseEnv {
	OBS_DB: D1Database;
	PULSE_BUFFER: DurableObjectNamespace;
}

// =============================================================================
// Service Binding Interface (what apps call)
// =============================================================================

export interface PulseCollector {
	fetch(request: Request): Promise<Response>;
}

// =============================================================================
// Batch Payload (what the collector receives)
// =============================================================================

export interface PulseBatchPayload {
	events: PulseEvent[];
}
