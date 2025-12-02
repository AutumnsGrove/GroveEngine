/**
 * Log API activity (requests, responses, timing)
 */
export function logAPI(endpoint: any, method: any, status: any, metadata?: {}): void;
/**
 * Log GitHub API operations (rate limits, queries, errors)
 */
export function logGitHub(operation: any, metadata?: {}): void;
/**
 * Log errors (exceptions, failed operations, validation errors)
 */
export function logError(message: any, error?: null, metadata?: {}): void;
/**
 * Log cache operations (KV get/set, hits/misses)
 */
export function logCache(operation: any, key: any, metadata?: {}): void;
/**
 * Get logs from a specific category
 */
export function getLogs(category: any, since?: null): any;
/**
 * Get all logs across all categories
 */
export function getAllLogs(since?: null): any[];
/**
 * Get log statistics
 */
export function getLogStats(): {
    api: {
        total: number;
        recent: number;
    };
    github: {
        total: number;
        recent: number;
    };
    errors: {
        total: number;
        recent: number;
    };
    cache: {
        total: number;
        recent: number;
    };
};
/**
 * Subscribe to log events (for SSE streaming)
 */
export function subscribe(callback: any): () => boolean;
/**
 * Clear logs for a specific category or all categories
 */
export function clearLogs(category?: null): void;
