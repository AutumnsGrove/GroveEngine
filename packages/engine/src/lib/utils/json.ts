/**
 * JSON utility functions
 */

/**
 * Safely parse JSON with fallback for corrupted or missing data.
 * Prevents crashes when parsing malformed JSON from external sources.
 *
 * @example
 * safeJsonParse('["a","b"]', [])  // Returns ['a', 'b']
 * safeJsonParse('invalid', [])    // Returns []
 * safeJsonParse(null, {})         // Returns {}
 */
export function safeJsonParse<T>(str: string | null | undefined, fallback: T = [] as T): T {
  if (!str) return fallback;
  try {
    return JSON.parse(str) as T;
  } catch (e) {
    console.warn('Failed to parse JSON:', e instanceof Error ? e.message : String(e));
    return fallback;
  }
}
