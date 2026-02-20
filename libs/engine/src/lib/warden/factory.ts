/**
 * Warden Client Factory
 *
 * Creates WardenClient instances from SvelteKit platform.env context.
 * Auto-detects service binding vs HTTPS, following the Zephyr pattern.
 *
 * @example
 * ```typescript
 * import { createWardenClient } from '@autumnsgrove/lattice/warden';
 *
 * // In a SvelteKit server route:
 * export const POST: RequestHandler = async ({ platform }) => {
 *   const warden = createWardenClient(platform.env);
 *   const repos = await warden.request({
 *     service: 'github',
 *     action: 'list_repos',
 *     params: { owner: 'AutumnsGrove' }
 *   });
 * };
 * ```
 */

import { WardenClient } from "./client";

const DEFAULT_WARDEN_URL = "https://warden.grove.place";

/**
 * Create a WardenClient from platform environment variables.
 *
 * When a WARDEN Service Binding is available (deployed on Cloudflare),
 * requests route directly through internal networking.
 */
export function createWardenClient(env: {
	WARDEN_URL?: string;
	WARDEN_API_KEY?: string;
	WARDEN_AGENT_ID?: string;
	WARDEN_AGENT_SECRET?: string;
	WARDEN?: {
		fetch: (input: RequestInfo | URL, init?: RequestInit) => Promise<Response>;
	};
}): WardenClient {
	return new WardenClient({
		baseUrl: env.WARDEN_URL || DEFAULT_WARDEN_URL,
		apiKey: env.WARDEN_API_KEY,
		agent:
			env.WARDEN_AGENT_ID && env.WARDEN_AGENT_SECRET
				? { id: env.WARDEN_AGENT_ID, secret: env.WARDEN_AGENT_SECRET }
				: undefined,
		fetcher: env.WARDEN,
	});
}
