/**
 * Type-safe Cloudflare methods for the Warden client.
 *
 * Convenience wrappers for Cloudflare API actions
 * routed through Warden.
 */

import type { WardenClient } from "../client";
import type {
	WardenResponse,
	CloudflareWorkerScript,
	CloudflareKvNamespace,
	CloudflareD1Database,
	CloudflareDnsRecord,
	CloudflareListResponse,
	CloudflareSingleResponse,
} from "../types";

export class WardenCloudflare {
	constructor(private client: WardenClient) {}

	async listWorkers(params: {
		account_id: string;
	}): Promise<WardenResponse<CloudflareListResponse<CloudflareWorkerScript>>> {
		return this.client.request({
			service: "cloudflare",
			action: "list_workers",
			params,
		});
	}

	async getWorker(params: {
		account_id: string;
		script_name: string;
	}): Promise<WardenResponse<CloudflareSingleResponse<CloudflareWorkerScript>>> {
		return this.client.request({
			service: "cloudflare",
			action: "get_worker",
			params,
		});
	}

	async listKvNamespaces(params: {
		account_id: string;
		per_page?: number;
		page?: number;
	}): Promise<WardenResponse<CloudflareListResponse<CloudflareKvNamespace>>> {
		return this.client.request({
			service: "cloudflare",
			action: "list_kv_namespaces",
			params,
		});
	}

	async listD1Databases(params: {
		account_id: string;
		per_page?: number;
		page?: number;
	}): Promise<WardenResponse<CloudflareListResponse<CloudflareD1Database>>> {
		return this.client.request({
			service: "cloudflare",
			action: "list_d1_databases",
			params,
		});
	}

	async listDnsRecords(params: {
		zone_id: string;
		type?: string;
		name?: string;
		per_page?: number;
		page?: number;
	}): Promise<WardenResponse<CloudflareListResponse<CloudflareDnsRecord>>> {
		return this.client.request({
			service: "cloudflare",
			action: "list_dns_records",
			params,
		});
	}

	async createDnsRecord(params: {
		zone_id: string;
		type: string;
		name: string;
		content: string;
		ttl?: number;
		proxied?: boolean;
	}): Promise<WardenResponse<CloudflareSingleResponse<CloudflareDnsRecord>>> {
		return this.client.request({
			service: "cloudflare",
			action: "create_dns_record",
			params,
		});
	}

	async purgeCache(params: {
		zone_id: string;
		purge_everything?: boolean;
		files?: string[];
		tags?: string[];
		hosts?: string[];
	}): Promise<WardenResponse<CloudflareSingleResponse<{ id: string }>>> {
		return this.client.request({
			service: "cloudflare",
			action: "purge_cache",
			params,
		});
	}
}
