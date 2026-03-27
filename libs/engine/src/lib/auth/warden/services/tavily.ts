/**
 * Type-safe Tavily methods for the Warden client.
 *
 * Convenience wrappers for Tavily search, crawl, and extract
 * actions routed through Warden.
 */

import type { WardenClient } from "../client";
import type {
	WardenResponse,
	TavilySearchResponse,
	TavilyCrawlResponse,
	TavilyExtractResponse,
} from "../types";

export class WardenTavily {
	constructor(private client: WardenClient) {}

	async search(params: {
		query: string;
		search_depth?: "basic" | "advanced";
		max_results?: number;
		include_domains?: string[];
		exclude_domains?: string[];
		include_raw_content?: boolean;
		include_images?: boolean;
	}): Promise<WardenResponse<TavilySearchResponse>> {
		return this.client.request({
			service: "tavily",
			action: "search",
			params,
		});
	}

	async crawl(params: {
		url: string;
		max_depth?: number;
		max_breadth?: number;
		limit?: number;
		instructions?: string;
		select_paths?: string[];
		select_domains?: string[];
	}): Promise<WardenResponse<TavilyCrawlResponse>> {
		return this.client.request({
			service: "tavily",
			action: "crawl",
			params,
		});
	}

	async extract(params: {
		urls: string[];
		include_images?: boolean;
	}): Promise<WardenResponse<TavilyExtractResponse>> {
		return this.client.request({
			service: "tavily",
			action: "extract",
			params,
		});
	}
}
