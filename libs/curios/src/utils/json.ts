/**
 * Safe JSON parsing with fallback for corrupted or missing data.
 */
export function safeParseJson<T>(
	input: string | null | undefined,
	fallback: T,
	_options?: { silent?: boolean; context?: string },
): T {
	if (input == null || input === "") return fallback;
	try {
		return JSON.parse(input) as T;
	} catch {
		return fallback;
	}
}
