/**
 * Warden SDK Types
 *
 * All interfaces for the Warden API gateway client.
 */

// =============================================================================
// Service Types
// =============================================================================

export type WardenService = "github" | "tavily";

export type WardenErrorCode =
	| "INVALID_REQUEST"
	| "AUTH_FAILED"
	| "AUTH_REQUIRED"
	| "AGENT_NOT_FOUND"
	| "NONCE_INVALID"
	| "SIGNATURE_INVALID"
	| "SCOPE_DENIED"
	| "RATE_LIMITED"
	| "UNKNOWN_SERVICE"
	| "UNKNOWN_ACTION"
	| "INVALID_PARAMS"
	| "NO_CREDENTIAL"
	| "UPSTREAM_ERROR"
	| "NETWORK_ERROR"
	| "INTERNAL_ERROR";

// =============================================================================
// Configuration
// =============================================================================

export interface WardenConfig {
	baseUrl: string;
	/** API key for service binding / direct auth */
	apiKey?: string;
	/** Agent credentials for challenge-response auth */
	agent?: {
		id: string;
		secret: string;
	};
	/** Service Binding Fetcher for direct Worker-to-Worker communication */
	fetcher?: {
		fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
	};
}

// =============================================================================
// Request / Response
// =============================================================================

export interface WardenRequest {
	service: WardenService;
	action: string;
	params: Record<string, unknown>;
	tenant_id?: string;
}

export interface WardenResponse<T = unknown> {
	success: boolean;
	data?: T;
	error?: {
		code: WardenErrorCode | string;
		message: string;
	};
	meta?: {
		service: string;
		action: string;
		latencyMs: number;
	};
}

// =============================================================================
// GitHub Types
// =============================================================================

export interface GitHubRepo {
	id: number;
	name: string;
	full_name: string;
	description: string | null;
	html_url: string;
	private: boolean;
	language: string | null;
	stargazers_count: number;
	forks_count: number;
	open_issues_count: number;
	updated_at: string;
}

export interface GitHubIssue {
	id: number;
	number: number;
	title: string;
	body: string | null;
	state: string;
	html_url: string;
	user: { login: string; avatar_url: string };
	labels: Array<{ name: string; color: string }>;
	assignees: Array<{ login: string }>;
	created_at: string;
	updated_at: string;
}

export interface GitHubComment {
	id: number;
	body: string;
	html_url: string;
	user: { login: string };
	created_at: string;
}

export interface GitHubWorkflowRun {
	id: number;
	name: string;
	status: string;
	conclusion: string | null;
	html_url: string;
	head_branch: string;
	created_at: string;
	updated_at: string;
}

// =============================================================================
// Tavily Types
// =============================================================================

export interface TavilySearchResult {
	title: string;
	url: string;
	content: string;
	raw_content?: string;
	score: number;
}

export interface TavilySearchResponse {
	query: string;
	results: TavilySearchResult[];
	answer?: string;
	response_time: number;
}

export interface TavilyCrawlResult {
	url: string;
	content: string;
	raw_content?: string;
}

export interface TavilyCrawlResponse {
	results: TavilyCrawlResult[];
}

export interface TavilyExtractResponse {
	results: Array<{ url: string; raw_content: string }>;
	failed_results: Array<{ url: string; error: string }>;
}

// =============================================================================
// Health
// =============================================================================

export interface WardenHealth {
	status: string;
	services: string[];
	version: string;
}

// =============================================================================
// Admin Types (for gw CLI)
// =============================================================================

export interface WardenAgentInfo {
	id: string;
	name: string;
	owner: string;
	scopes: string[];
	rate_limit_rpm: number;
	rate_limit_daily: number;
	enabled: boolean;
	created_at: string;
	last_used_at: string | null;
	request_count: number;
}

export interface WardenAgentRegistration {
	id: string;
	name: string;
	owner: string;
	scopes: string[];
	secret: string;
	rate_limit_rpm: number;
	rate_limit_daily: number;
	message: string;
}
