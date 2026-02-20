/**
 * Cloudflare Service Definition
 *
 * Actions: list_workers, get_worker, list_kv_namespaces, list_d1_databases,
 *          list_dns_records, create_dns_record, purge_cache
 *
 * Auth: Bearer token (Cloudflare API Token)
 */

import { z } from "zod";
import { registerService } from "./registry";
import type { ServiceAction } from "./registry";

const BASE_URL = "https://api.cloudflare.com/client/v4";

const commonHeaders = (token: string) => ({
	Authorization: `Bearer ${token}`,
	"Content-Type": "application/json",
});

const actions: Record<string, ServiceAction> = {
	list_workers: {
		schema: z.object({
			account_id: z.string(),
		}),
		buildRequest: (params, token) => ({
			url: `${BASE_URL}/accounts/${params.account_id}/workers/scripts`,
			method: "GET",
			headers: commonHeaders(token),
		}),
	},

	get_worker: {
		schema: z.object({
			account_id: z.string(),
			script_name: z.string(),
		}),
		buildRequest: (params, token) => ({
			url: `${BASE_URL}/accounts/${params.account_id}/workers/scripts/${params.script_name}`,
			method: "GET",
			headers: commonHeaders(token),
		}),
	},

	list_kv_namespaces: {
		schema: z.object({
			account_id: z.string(),
			per_page: z.number().int().min(1).max(100).default(20),
			page: z.number().int().min(1).default(1),
		}),
		buildRequest: (params, token) => {
			const qs = new URLSearchParams({
				per_page: String(params.per_page ?? 20),
				page: String(params.page ?? 1),
			});
			return {
				url: `${BASE_URL}/accounts/${params.account_id}/storage/kv/namespaces?${qs}`,
				method: "GET",
				headers: commonHeaders(token),
			};
		},
	},

	list_d1_databases: {
		schema: z.object({
			account_id: z.string(),
			per_page: z.number().int().min(1).max(100).default(20),
			page: z.number().int().min(1).default(1),
		}),
		buildRequest: (params, token) => {
			const qs = new URLSearchParams({
				per_page: String(params.per_page ?? 20),
				page: String(params.page ?? 1),
			});
			return {
				url: `${BASE_URL}/accounts/${params.account_id}/d1/database?${qs}`,
				method: "GET",
				headers: commonHeaders(token),
			};
		},
	},

	list_dns_records: {
		schema: z.object({
			zone_id: z.string(),
			type: z.string().optional(),
			name: z.string().optional(),
			per_page: z.number().int().min(1).max(100).default(50),
			page: z.number().int().min(1).default(1),
		}),
		buildRequest: (params, token) => {
			const qs = new URLSearchParams({
				per_page: String(params.per_page ?? 50),
				page: String(params.page ?? 1),
			});
			if (params.type) qs.set("type", String(params.type));
			if (params.name) qs.set("name", String(params.name));
			return {
				url: `${BASE_URL}/zones/${params.zone_id}/dns_records?${qs}`,
				method: "GET",
				headers: commonHeaders(token),
			};
		},
	},

	create_dns_record: {
		schema: z.object({
			zone_id: z.string(),
			type: z.string(),
			name: z.string(),
			content: z.string(),
			ttl: z.number().int().min(1).default(1),
			proxied: z.boolean().default(false),
		}),
		buildRequest: (params, token) => ({
			url: `${BASE_URL}/zones/${params.zone_id}/dns_records`,
			method: "POST",
			headers: commonHeaders(token),
			body: JSON.stringify({
				type: params.type,
				name: params.name,
				content: params.content,
				ttl: params.ttl,
				proxied: params.proxied,
			}),
		}),
	},

	purge_cache: {
		schema: z.object({
			zone_id: z.string(),
			purge_everything: z.boolean().default(false),
			files: z.array(z.string()).optional(),
			tags: z.array(z.string()).optional(),
			hosts: z.array(z.string()).optional(),
		}),
		buildRequest: (params, token) => {
			const body: Record<string, unknown> = {};
			if (params.purge_everything) {
				body.purge_everything = true;
			} else {
				if (params.files) body.files = params.files;
				if (params.tags) body.tags = params.tags;
				if (params.hosts) body.hosts = params.hosts;
			}
			return {
				url: `${BASE_URL}/zones/${params.zone_id}/purge_cache`,
				method: "POST",
				headers: commonHeaders(token),
				body: JSON.stringify(body),
			};
		},
	},
};

registerService({
	name: "cloudflare",
	baseUrl: BASE_URL,
	auth: { type: "bearer" },
	actions,
});
