/**
 * Response Scrubbing
 *
 * Strips sensitive data from upstream API responses before returning
 * to agents. Catches leaked tokens, API keys, internal URLs, and
 * credential-bearing query parameters.
 */

/** Patterns that indicate leaked credentials */
const SENSITIVE_PATTERNS = [
	// GitHub tokens
	/ghp_[A-Za-z0-9_]{36}/g,
	/gho_[A-Za-z0-9_]{36}/g,
	/github_pat_[A-Za-z0-9_]{22,}/g,
	// Cloudflare API tokens
	/v1\.[A-Za-z0-9_-]{40,}/g,
	// Resend API keys
	/re_[A-Za-z0-9_]{20,}/g,
	// Stripe secret keys (live and test)
	/sk_live_[A-Za-z0-9]{20,}/g,
	/sk_test_[A-Za-z0-9]{20,}/g,
	// Stripe restricted keys
	/rk_live_[A-Za-z0-9]{20,}/g,
	/rk_test_[A-Za-z0-9]{20,}/g,
	// Exa API keys (generic alphanumeric with dashes)
	/exa-[A-Za-z0-9_-]{20,}/g,
	// Generic API keys (long hex/base64 strings in auth contexts)
	/(?:api[_-]?key|token|secret|password|authorization)['":\s]*[=:]\s*['"]?[A-Za-z0-9+/=_-]{20,}['"]?/gi,
	// Tavily API keys
	/tvly-[A-Za-z0-9]{20,}/g,
];

/** Query parameter names that carry credentials */
const SENSITIVE_QUERY_PARAMS = ["token", "api_key", "access_token", "secret", "key", "apikey"];

/** Strip credential-bearing query params from URLs in strings */
function sanitizeUrls(str: string): string {
	return str.replace(/https?:\/\/[^\s"'<>]+/g, (urlMatch) => {
		try {
			const url = new URL(urlMatch);
			let changed = false;
			for (const param of SENSITIVE_QUERY_PARAMS) {
				if (url.searchParams.has(param)) {
					url.searchParams.set(param, "[REDACTED]");
					changed = true;
				}
			}
			return changed ? url.toString() : urlMatch;
		} catch {
			return urlMatch;
		}
	});
}

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
	let result = sanitizeUrls(str);
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
