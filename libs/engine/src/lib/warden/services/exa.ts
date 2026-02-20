/**
 * Type-safe Exa methods for the Warden client.
 *
 * Convenience wrappers for Exa search, find_similar, and get_contents
 * actions routed through Warden.
 */

import type { WardenClient } from "../client";
import type { WardenResponse, ExaSearchResponse, ExaContentsResponse } from "../types";

export class WardenExa {
	constructor(private client: WardenClient) {}

	async search(params: {
		query: string;
		num_results?: number;
		type?: "auto" | "keyword" | "neural";
		use_autoprompt?: boolean;
		include_domains?: string[];
		exclude_domains?: string[];
		start_published_date?: string;
		end_published_date?: string;
		start_crawl_date?: string;
		end_crawl_date?: string;
		contents?: {
			text?: { max_characters?: number };
			highlights?: { num_sentences?: number };
		};
	}): Promise<WardenResponse<ExaSearchResponse>> {
		return this.client.request({
			service: "exa",
			action: "search",
			params,
		});
	}

	async findSimilar(params: {
		url: string;
		num_results?: number;
		include_domains?: string[];
		exclude_domains?: string[];
		start_published_date?: string;
		end_published_date?: string;
		contents?: {
			text?: { max_characters?: number };
			highlights?: { num_sentences?: number };
		};
	}): Promise<WardenResponse<ExaSearchResponse>> {
		return this.client.request({
			service: "exa",
			action: "find_similar",
			params,
		});
	}

	async getContents(params: {
		ids: string[];
		text?: { max_characters?: number };
		highlights?: { num_sentences?: number };
	}): Promise<WardenResponse<ExaContentsResponse>> {
		return this.client.request({
			service: "exa",
			action: "get_contents",
			params,
		});
	}
}
