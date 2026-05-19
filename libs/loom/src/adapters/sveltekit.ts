/**
 * Loom — SvelteKit Adapter
 *
 * Helpers for accessing Durable Objects from SvelteKit
 * server-side code (load functions, form actions, API routes).
 *
 * @example
 * ```typescript
 * import { getLoomDO } from '@autumnsgrove/loom/sveltekit';
 *
 * // In a +page.server.ts load function:
 * const contentDO = getLoomDO(platform, "POST_CONTENT", `content:${tenantId}:${slug}`);
 * const response = await contentDO.fetch(new Request("https://do/content"));
 * ```
 */

import { getLoomStub, loomFetch, loomFetchJson } from "../factory.js";
import { LOOM_ERRORS, logLoomError } from "../errors.js";

/** Minimal SvelteKit platform shape — avoids depending on App.Platform global */
interface LoomPlatform {
  env?: Record<string, unknown>;
}

/**
 * Get a DO stub from SvelteKit's platform.env.
 *
 * @param platform - The SvelteKit platform object (from event.platform)
 * @param bindingName - The DO binding name in wrangler.toml (e.g. "POST_CONTENT")
 * @param name - The DO instance name (used with idFromName)
 */
export function getLoomDO<T extends Rpc.DurableObjectBranded>(
  platform: LoomPlatform | undefined,
  bindingName: string,
  name: string,
): DurableObjectStub<T> {
  if (!platform?.env) {
    logLoomError(LOOM_ERRORS.INIT_FAILED, { bindingName, name });
    throw new Error(
      `[Loom] platform.env not available — are you in a server-side context?`,
    );
  }

  const namespace = (platform.env as Record<string, unknown>)[bindingName] as
    | DurableObjectNamespace<T>
    | undefined;

  if (!namespace) {
    logLoomError(LOOM_ERRORS.INIT_FAILED, { bindingName, name });
    throw new Error(
      `[Loom] DO binding "${bindingName}" not found in platform.env. Check wrangler.toml.`,
    );
  }

  return getLoomStub(namespace, name);
}

/**
 * Fetch JSON from a DO via SvelteKit platform.
 * Combines getLoomDO + loomFetchJson in one call.
 */
export async function fetchLoomJson<T>(
  platform: LoomPlatform | undefined,
  bindingName: string,
  name: string,
  path: string,
  method = "GET",
  body?: unknown,
): Promise<T> {
  const stub = getLoomDO(platform, bindingName, name);
  return loomFetchJson<T>(stub, path, method, body);
}

// Re-export factory helpers for convenience
export { loomFetch, loomFetchJson } from "../factory.js";
