/**
 * Server Utilities Module
 *
 * Server-side utilities for Cloudflare Workers and SvelteKit routes.
 * This is the canonical import path for server utilities:
 *
 * ```typescript
 * import { checkRateLimit, ENDPOINT_RATE_LIMITS } from '@autumnsgrove/groveengine/server';
 * ```
 *
 * @module server
 */

// Rate limiting (Threshold pattern)
export * from "./rate-limits";

// Logging
export {
  logAPI,
  logGitHub,
  logError,
  logCache,
  getLogs,
  getAllLogs,
  getLogStats,
  subscribe,
  clearLogs,
} from "./logger";
export type {
  LogLevel,
  LogCategory,
  LogEntry,
  LogStats,
  LogSubscriber,
} from "./logger";

// Cache utilities (re-export commonly used functions)
export { rateLimit } from "./services/cache";
