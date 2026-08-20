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

interface Env {
	THRESHOLD: DurableObjectNamespace;
	/** Shared secret for operator-only endpoints (e.g. rate limit reset). Not exposed to any tenant-facing app. */
	OPS_ADMIN_KEY?: string;
}

/**
 * Constant-time string comparison — hashes both sides first so the
 * comparison always operates on equal-length buffers with no early exit.
 */
async function timingSafeEqual(a: string, b: string): Promise<boolean> {
	const encoder = new TextEncoder();
	const [hashA, hashB] = await Promise.all([
		crypto.subtle.digest("SHA-256", encoder.encode(a)),
		crypto.subtle.digest("SHA-256", encoder.encode(b)),
	]);
	const viewA = new Uint8Array(hashA);
	const viewB = new Uint8Array(hashB);
	let result = 0;
	for (let i = 0; i < viewA.length; i++) {
		result |= viewA[i] ^ viewB[i];
	}
	return result === 0;
}

/**
 * POST /threshold/reset — operator-only escape hatch for clearing a rate
 * limit window. Never wired into any tenant-facing app or session auth;
 * reachable only with the OPS_ADMIN_KEY secret, held outside the codebase.
 *
 * Body: { identifier: string, key: string }
 *   identifier — the value passed to createThreshold({ identifier }) at the
 *                call site (e.g. a Heartwood user id), used to locate the DO.
 *   key        — the exact rate-limit key checked (e.g. "ai/timeline-generate:<userId>").
 */
async function handleThresholdReset(request: Request, env: Env): Promise<Response> {
	if (!env.OPS_ADMIN_KEY) {
		return Response.json({ error: "not_configured" }, { status: 503 });
	}

	const auth = request.headers.get("Authorization") ?? "";
	const provided = auth.startsWith("Bearer ") ? auth.slice(7) : "";
	if (!provided || !(await timingSafeEqual(provided, env.OPS_ADMIN_KEY))) {
		return Response.json({ error: "unauthorized" }, { status: 401 });
	}

	const body = (await request.json().catch(() => null)) as {
		identifier?: string;
		key?: string;
	} | null;

	if (!body?.identifier || !body?.key) {
		return Response.json(
			{ error: "bad_request", message: "Missing identifier or key" },
			{ status: 400 },
		);
	}

	const id = env.THRESHOLD.idFromName(`threshold:${body.identifier}`);
	const stub = env.THRESHOLD.get(id);
	const res = await stub.fetch("https://threshold.internal/reset", {
		method: "POST",
		headers: { "Content-Type": "application/json" },
		body: JSON.stringify({ key: body.key }),
	});

	return new Response(await res.text(), {
		status: res.status,
		headers: { "Content-Type": "application/json" },
	});
}

export default {
	async queue(_batch: MessageBatch<unknown>): Promise<void> {
		// Stub — queue consumer configured via CF dashboard
	},
	async fetch(request: Request, env: Env): Promise<Response> {
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

		if (url.pathname === "/threshold/reset" && request.method === "POST") {
			return handleThresholdReset(request, env);
		}

		return new Response("Grove Durable Objects Worker", {
			headers: { "Content-Type": "text/plain" },
		});
	},
};
