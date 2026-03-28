// Shared types for the Searcher route components

export type SearchMode = "detailed" | "vibe";

export interface VibeOptions {
	value: string;
	label: string;
}

export interface TldGroup {
	id: string;
	label: string;
	description: string;
	tlds: { value: string; label: string }[];
}

export interface ParsedVibe {
	business_name: string;
	vibe: string;
	keywords: string;
	tld_preferences: string[];
	domain_idea: string | null;
}

export interface EvaluationData {
	pronounceable?: boolean;
	memorable?: boolean;
	brand_fit?: boolean;
	email_friendly?: boolean;
	notes?: string;
	rdap_registrar?: string;
	rdap_expiration?: string;
	pricing_category?: "bundled" | "recommended" | "standard" | "premium";
	renewal_cents?: number;
}

export interface DomainResult {
	domain: string;
	tld: string;
	status: "available" | "registered" | "unknown";
	price_cents?: number;
	score: number;
	flags: string[];
	evaluation_data?: EvaluationData;
	price_display?: string;
	pricing_category?: string;
}

export interface PricingSummary {
	bundled: number;
	recommended: number;
	standard: number;
	premium: number;
}

export interface TokenUsage {
	input_tokens: number;
	output_tokens: number;
	total_tokens: number;
}

export interface ResultsResponse {
	job_id: string;
	status: string;
	batch_num: number;
	domains: DomainResult[];
	total_checked: number;
	pricing_summary: PricingSummary;
	usage: TokenUsage;
}

export interface QuizQuestion {
	id: string;
	type: "text" | "single_select" | "multi_select";
	prompt: string;
	required: boolean;
	placeholder?: string;
	options?: { value: string; label: string }[];
	default?: string | string[];
}

export interface FollowupResponse {
	job_id: string;
	questions: QuizQuestion[];
	context: {
		batches_completed: number;
		domains_checked: number;
		good_found: number;
		target: number;
	};
}

export interface SSEStatusEvent {
	event: "status";
	job_id: string;
	status: string;
	batch_num: number;
	domains_checked: number;
	domains_available: number;
	good_results: number;
}
