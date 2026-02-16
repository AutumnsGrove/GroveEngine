/**
 * @deprecated Use $lib/threshold/ modules instead.
 * This file is a compatibility shim — all real logic lives in threshold/.
 *
 * Migration guide:
 *   checkRateLimit     → createThreshold() + thresholdCheck()
 *   rateLimitHeaders   → thresholdHeaders()
 *   buildRateLimitKey  → template string `a:b`
 *   getClientIP        → import from $lib/threshold/adapters/worker.js
 */

export { getClientIP } from "../../threshold/adapters/worker.js";
export {
  thresholdCheck as checkRateLimit,
  thresholdHeaders as rateLimitHeaders,
} from "../../threshold/adapters/sveltekit.js";

/** @deprecated Use template string `a:b` instead */
export function buildRateLimitKey(
  endpoint: string,
  identifier: string,
): string {
  return `${endpoint}:${identifier}`;
}

// Re-export types for backwards compatibility
export type { ThresholdResult as RateLimitResult } from "../../threshold/types.js";

/** @deprecated */
export interface RateLimitMiddlewareOptions {
  kv: KVNamespace;
  key: string;
  limit: number;
  windowSeconds: number;
  namespace?: string;
  failClosed?: boolean;
}

/** @deprecated */
export interface RateLimitCheckResult {
  result: { allowed: boolean; remaining: number; resetAt: number };
  response?: Response;
}
