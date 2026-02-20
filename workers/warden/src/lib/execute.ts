/**
 * HTTP Execution
 *
 * Executes upstream API requests with credential injection,
 * latency measurement, and structured response handling.
 */

import type { WardenResponse } from "../types";

export interface ExecuteRequest {
	url: string;
	method: string;
	headers: Record<string, string>;
	body?: string;
}

export interface ExecuteResult {
	response: WardenResponse;
	latencyMs: number;
	status: number;
}

/** Execute an upstream HTTP request and return a structured result */
export async function executeUpstream(request: ExecuteRequest): Promise<ExecuteResult> {
	const start = Date.now();

	try {
		const response = await fetch(request.url, {
			method: request.method,
			headers: request.headers,
			body: request.body,
		});

		const latencyMs = Date.now() - start;

		// Try to parse JSON response
		let data: unknown;
		const contentType = response.headers.get("Content-Type") || "";
		if (contentType.includes("application/json")) {
			try {
				data = await response.json();
			} catch {
				data = await response.text();
			}
		} else {
			data = await response.text();
		}

		if (!response.ok) {
			return {
				response: {
					success: false,
					error: {
						code: `UPSTREAM_${response.status}`,
						message: typeof data === "object" ? JSON.stringify(data) : String(data),
					},
				},
				latencyMs,
				status: response.status,
			};
		}

		return {
			response: { success: true, data },
			latencyMs,
			status: response.status,
		};
	} catch (err) {
		const latencyMs = Date.now() - start;
		const message = err instanceof Error ? err.message : String(err);
		return {
			response: {
				success: false,
				error: { code: "NETWORK_ERROR", message: `Upstream request failed: ${message}` },
			},
			latencyMs,
			status: 0,
		};
	}
}
