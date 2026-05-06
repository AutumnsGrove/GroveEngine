/**
 * Login Graft Configuration Tests
 *
 * Tests for provider registry and configuration utilities.
 */

import { describe, it, expect } from "vitest";
import {
	PROVIDERS,
	getProviderConfig,
	getProviderName,
	isProviderAvailable,
	getAvailableProviders,
	DEFAULT_PROVIDERS,
	DEFAULT_LOGIN_URL,
	DEFAULT_RETURN_TO,
	GROVEAUTH_URLS,
	AUTH_COOKIE_NAMES,
	AUTH_COOKIE_OPTIONS,
} from "./config.js";

describe("Login Graft Configuration", () => {
	// ==========================================================================
	// Constants
	// ==========================================================================

	describe("Constants", () => {
		it("exports default providers with all implemented providers", () => {
			expect(DEFAULT_PROVIDERS).toEqual(["google"]);
		});

		it("exports default login URL", () => {
			expect(DEFAULT_LOGIN_URL).toBe("/auth/login");
		});

		it("exports default return URL", () => {
			expect(DEFAULT_RETURN_TO).toBe("/arbor");
		});

		it("exports GroveAuth URLs", () => {
			expect(GROVEAUTH_URLS.auth).toBe("https://auth.grove.place");
			expect(GROVEAUTH_URLS.api).toBe("https://login.grove.place");
		});
	});

	// ==========================================================================
	// Provider Registry
	// ==========================================================================

	describe("PROVIDERS registry", () => {
		it("includes google provider", () => {
			expect(PROVIDERS.google).toBeDefined();
			expect(PROVIDERS.google.id).toBe("google");
			expect(PROVIDERS.google.name).toBe("Google");
		});

		it("includes github provider (not yet available)", () => {
			expect(PROVIDERS.github).toBeDefined();
			expect(PROVIDERS.github.id).toBe("github");
			expect(PROVIDERS.github.name).toBe("GitHub");
			expect(PROVIDERS.github.available).toBe(false);
		});

		it("marks google as available and github as unavailable", () => {
			expect(PROVIDERS.google.available).toBe(true);
			expect(PROVIDERS.github.available).toBe(false);
		});

		it("includes descriptions for all providers", () => {
			expect(PROVIDERS.google.description).toContain("Google");
			expect(PROVIDERS.github.description).toContain("GitHub");
		});
	});

	// ==========================================================================
	// getProviderConfig
	// ==========================================================================

	describe("getProviderConfig", () => {
		it("returns config for google provider", () => {
			const config = getProviderConfig("google");

			expect(config.id).toBe("google");
			expect(config.name).toBe("Google");
			expect(config.available).toBe(true);
		});

		it("returns config for github provider", () => {
			const config = getProviderConfig("github");

			expect(config.id).toBe("github");
			expect(config.name).toBe("GitHub");
			expect(config.available).toBe(false);
		});
	});

	// ==========================================================================
	// getProviderName
	// ==========================================================================

	describe("getProviderName", () => {
		it("returns 'Google' for google provider", () => {
			expect(getProviderName("google")).toBe("Google");
		});

		it("returns 'GitHub' for github provider", () => {
			expect(getProviderName("github")).toBe("GitHub");
		});

		it("returns the provider id as fallback for unknown provider", () => {
			// @ts-expect-error - testing unknown provider
			expect(getProviderName("unknown")).toBe("unknown");
		});
	});

	// ==========================================================================
	// isProviderAvailable
	// ==========================================================================

	describe("isProviderAvailable", () => {
		it("returns true for google", () => {
			expect(isProviderAvailable("google")).toBe(true);
		});

		it("returns false for github", () => {
			expect(isProviderAvailable("github")).toBe(false);
		});

		it("returns false for unknown provider", () => {
			// @ts-expect-error - testing unknown provider
			expect(isProviderAvailable("unknown")).toBe(false);
		});
	});

	// ==========================================================================
	// getAvailableProviders
	// ==========================================================================

	describe("getAvailableProviders", () => {
		it("returns only available providers", () => {
			const available = getAvailableProviders();

			expect(available).toContain("google");
			expect(available).not.toContain("github");
		});

		it("returns an array", () => {
			const available = getAvailableProviders();
			expect(Array.isArray(available)).toBe(true);
		});

		it("currently returns only google", () => {
			const available = getAvailableProviders();
			expect(available).toContain("google");
			expect(available).toHaveLength(1);
		});
	});

	// ==========================================================================
	// Cookie Configuration
	// ==========================================================================

	describe("AUTH_COOKIE_NAMES", () => {
		it("defines return URL cookie name", () => {
			expect(AUTH_COOKIE_NAMES.returnTo).toBe("auth_return_to");
		});

		it("defines Better Auth session cookie name", () => {
			expect(AUTH_COOKIE_NAMES.betterAuthSession).toBe("better-auth.session_token");
		});

		it("defines Better Auth secure session cookie name", () => {
			expect(AUTH_COOKIE_NAMES.betterAuthSessionSecure).toBe("__Secure-better-auth.session_token");
		});

		it("no longer includes deprecated legacy cookie names", () => {
			const keys = Object.keys(AUTH_COOKIE_NAMES);
			expect(keys).not.toContain("state");
			expect(keys).not.toContain("codeVerifier");
			expect(keys).not.toContain("accessToken");
			expect(keys).not.toContain("refreshToken");
			expect(keys).not.toContain("session");
		});
	});

	describe("AUTH_COOKIE_OPTIONS", () => {
		describe("temporary cookies (for OAuth flow)", () => {
			it("sets path to root", () => {
				expect(AUTH_COOKIE_OPTIONS.temporary.path).toBe("/");
			});

			it("sets httpOnly to true (security)", () => {
				expect(AUTH_COOKIE_OPTIONS.temporary.httpOnly).toBe(true);
			});

			it("does not set secure in base options (added dynamically by handlers)", () => {
				// secure is determined at runtime based on production vs localhost
				// This allows localhost development while enforcing HTTPS in production
				expect(AUTH_COOKIE_OPTIONS.temporary).not.toHaveProperty("secure");
			});

			it("sets sameSite to lax (allows OAuth redirect)", () => {
				expect(AUTH_COOKIE_OPTIONS.temporary.sameSite).toBe("lax");
			});

			it("sets maxAge to 10 minutes (OAuth flow timeout)", () => {
				expect(AUTH_COOKIE_OPTIONS.temporary.maxAge).toBe(60 * 10);
			});
		});

		describe("session cookies (for authenticated users)", () => {
			it("sets path to root", () => {
				expect(AUTH_COOKIE_OPTIONS.session.path).toBe("/");
			});

			it("sets httpOnly to true (security)", () => {
				expect(AUTH_COOKIE_OPTIONS.session.httpOnly).toBe(true);
			});

			it("sets sameSite to lax", () => {
				expect(AUTH_COOKIE_OPTIONS.session.sameSite).toBe("lax");
			});

			it("sets maxAge to 30 days", () => {
				expect(AUTH_COOKIE_OPTIONS.session.maxAge).toBe(60 * 60 * 24 * 30);
			});

			it("does not set secure in base options (added dynamically)", () => {
				// secure is determined at runtime based on production vs localhost
				expect(AUTH_COOKIE_OPTIONS.session).not.toHaveProperty("secure");
			});
		});
	});

	// ==========================================================================
	// Integration: Provider Filtering
	// ==========================================================================

	describe("Integration: Provider Filtering", () => {
		it("allows filtering a list of providers to only available ones", () => {
			const requestedProviders = ["google", "github"] as const;
			const available = requestedProviders.filter((p) => isProviderAvailable(p));

			// google is available; github is not
			expect(available).toEqual(["google"]);
		});

		it("handles empty input gracefully", () => {
			const requestedProviders: string[] = [];
			const available = requestedProviders.filter((p) => isProviderAvailable(p as any));

			expect(available).toEqual([]);
		});

		it("handles all-unavailable providers", () => {
			const requestedProviders = ["github"] as const;
			const available = requestedProviders.filter((p) => isProviderAvailable(p));

			expect(available).toEqual([]);
		});
	});
});
