import type { HumProvider, HumProviderInfo } from "./types.js";
import { HUM_PROVIDERS } from "./providers/index.js";

const MAX_URL_LENGTH = 500;

/**
 * Detect which music provider a URL belongs to.
 * Returns "unknown" if no provider matches.
 */
export function detectProvider(url: string): HumProvider {
	if (url.length > MAX_URL_LENGTH) {
		return "unknown";
	}
	for (const [provider, info] of Object.entries(HUM_PROVIDERS)) {
		if (provider === "unknown") continue;
		for (const pattern of info.patterns) {
			if (pattern.test(url)) {
				return provider as HumProvider;
			}
		}
	}
	return "unknown";
}

/**
 * Check if a URL is a recognized music link.
 */
export function isMusicUrl(url: string): boolean {
	return detectProvider(url) !== "unknown";
}

/**
 * Get display info for a provider.
 */
export function getProviderInfo(provider: HumProvider): HumProviderInfo {
	return HUM_PROVIDERS[provider] || HUM_PROVIDERS.unknown;
}
