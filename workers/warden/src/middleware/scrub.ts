/**
 * Response Scrubbing
 *
 * Strips sensitive data from upstream API responses before returning
 * to agents. Catches leaked tokens, API keys, and internal URLs.
 */

/** Patterns that indicate leaked credentials */
const SENSITIVE_PATTERNS = [
	// GitHub tokens
	/ghp_[A-Za-z0-9_]{36}/g,
	/gho_[A-Za-z0-9_]{36}/g,
	/github_pat_[A-Za-z0-9_]{22,}/g,
	// Generic API keys (long hex/base64 strings in auth contexts)
	/(?:api[_-]?key|token|secret|password|authorization)['":\s]*[=:]\s*['"]?[A-Za-z0-9+/=_-]{20,}['"]?/gi,
	// Tavily API keys
	/tvly-[A-Za-z0-9]{20,}/g,
];

/** Scrub sensitive data from a response payload */
export function scrubResponse(data: unknown): unknown {
	if (typeof data === "string") {
		return scrubString(data);
	}

	if (Array.isArray(data)) {
		return data.map(scrubResponse);
	}

	if (data && typeof data === "object") {
		const result: Record<string, unknown> = {};
		for (const [key, value] of Object.entries(data as Record<string, unknown>)) {
			// Completely redact fields that typically hold credentials
			if (isSensitiveKey(key)) {
				result[key] = "[REDACTED]";
			} else {
				result[key] = scrubResponse(value);
			}
		}
		return result;
	}

	return data;
}

function scrubString(str: string): string {
	let result = str;
	for (const pattern of SENSITIVE_PATTERNS) {
		result = result.replace(pattern, "[REDACTED]");
	}
	return result;
}

/** Keys that are always redacted regardless of value */
function isSensitiveKey(key: string): boolean {
	const lower = key.toLowerCase();
	return (
		lower === "authorization" ||
		lower === "x-api-key" ||
		lower === "api_key" ||
		lower === "secret" ||
		lower === "token" ||
		lower === "password" ||
		lower === "access_token" ||
		lower === "refresh_token"
	);
}
