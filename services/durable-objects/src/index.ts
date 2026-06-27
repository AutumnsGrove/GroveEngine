/**
 * Grove Durable Objects Worker
 *
 * This worker hosts all Durable Objects for the Grove Platform.
 * Other services (Lattice Pages, post-migrator) reference these
 * via service bindings with script_name: "grove-durable-objects".
 *
 * Part of the Loom pattern - Grove's coordination layer.
 */

// Export DO classes for Cloudflare to instantiate
export { TenantDO } from "./TenantDO.js";
export { PostMetaDO } from "./PostMetaDO.js";
export { PostContentDO } from "./PostContentDO.js";
export { SentinelDO } from "./sentinel/SentinelDO.js";
export { ExportDO } from "./ExportDO.js";
export { ThresholdDO } from "./ThresholdDO.js";

// Stub exports for orphaned DO classes that Cloudflare still tracks internally.
// These have no bindings, no data, and no consumers — they exist solely to
// satisfy Cloudflare's class export requirement until CF clears its state.
export class TriageDO {
	fetch() {
		return new Response("gone", { status: 410 });
	}
}
export class ChatDO {
	fetch() {
		return new Response("gone", { status: 410 });
	}
}
export class FeedDO {
	fetch() {
		return new Response("gone", { status: 410 });
	}
}

// ============================================================================
// Worker Export
// ============================================================================

export default {
	async fetch(request: Request): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname === "/health") {
			return Response.json({
				status: "ok",
				service: "grove-durable-objects",
				classes: [
					"TenantDO",
					"PostMetaDO",
					"PostContentDO",
					"SentinelDO",
					"ExportDO",
					"ThresholdDO",
				],
			});
		}

		return new Response("Grove Durable Objects Worker", {
			headers: { "Content-Type": "text/plain" },
		});
	},
};
