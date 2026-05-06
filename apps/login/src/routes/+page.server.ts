/**
 * Login Page — Server Actions
 *
 * Handles Google OAuth entirely server-side.
 *
 * By running this as a SvelteKit form action:
 * - No JavaScript required for sign-in
 * - The redirect cookie is HttpOnly
 * - All auth logic runs in the Cloudflare Worker isolate alongside everything else
 */

import { redirect, fail } from "@sveltejs/kit";
import type { Actions } from "./$types";
import { validateRedirectUrl } from "$lib/redirect";

const DEFAULT_AUTH_URL = "https://login.grove.place";

/**
 * Parsed representation of a Set-Cookie header string.
 * Used to forward cookies that Heartwood sets (e.g. better-auth.oauth_state)
 * when the auth flow is initiated from a server-side form action rather than
 * a client-side fetch.
 */
type SetCookieOpts = {
	path: string;
	httpOnly?: boolean;
	secure?: boolean;
	sameSite?: "strict" | "lax" | "none";
	maxAge?: number;
	domain?: string;
};

function parseRawSetCookie(
	raw: string,
): { name: string; value: string; options: SetCookieOpts } | null {
	const parts = raw.split(";").map((p) => p.trim());
	const first = parts[0];
	if (!first) return null;

	const eqIdx = first.indexOf("=");
	if (eqIdx === -1) return null;

	const name = first.slice(0, eqIdx);
	const value = first.slice(eqIdx + 1);
	const options: SetCookieOpts = { path: "/" };

	for (const attr of parts.slice(1)) {
		const lower = attr.toLowerCase();
		if (lower === "httponly") options.httpOnly = true;
		else if (lower === "secure") options.secure = true;
		else if (lower.startsWith("samesite=")) {
			const sv = attr.split("=")[1]?.toLowerCase();
			if (sv === "strict" || sv === "lax" || sv === "none") {
				options.sameSite = sv;
			}
		} else if (lower.startsWith("path=")) {
			options.path = attr.split("=")[1] ?? "/";
		} else if (lower.startsWith("max-age=")) {
			options.maxAge = parseInt(attr.split("=")[1] ?? "0", 10);
		} else if (lower.startsWith("domain=")) {
			options.domain = attr.split("=")[1];
		}
	}

	return { name, value, options };
}

export const actions: Actions = {
	/**
	 * Google OAuth — triggers the OAuth redirect entirely server-side.
	 *
	 * Calls Heartwood via service binding to get the Google authorization URL,
	 * sets the redirect cookie (now HttpOnly), forwards the oauth_state cookie
	 * Better Auth generates, then redirects the browser to Google.
	 */
	google: async ({ request, cookies, platform, url }) => {
		const formData = await request.formData();
		const redirectTo = validateRedirectUrl(formData.get("redirect")?.toString());
		// Relative URL — Heartwood resolves it against the login origin (login.grove.place).
		// Safe because AUTH is a service binding; this never becomes a public redirect target.
		const callbackURL = `/callback?redirect=${encodeURIComponent(redirectTo)}`;

		if (!platform?.env?.AUTH) {
			return fail(503, {
				provider: "google" as const,
				error: "Auth service unavailable. Please try again shortly.",
			});
		}

		// Set redirect cookie server-side — now HttpOnly.
		// Previously this required document.cookie because there was no server action
		// to call before the client-initiated OAuth navigation began.
		cookies.set("grove_auth_redirect", encodeURIComponent(redirectTo), {
			path: "/",
			maxAge: 600,
			sameSite: "lax",
			secure: true,
			httpOnly: true,
		});

		const authBaseUrl = platform.env.GROVEAUTH_URL ?? DEFAULT_AUTH_URL;
		let response: Response;
		try {
			response = await platform.env.AUTH.fetch(`${authBaseUrl}/api/auth/sign-in/social`, {
				method: "POST",
				headers: {
					"Content-Type": "application/json",
					Origin: url.origin,
				},
				body: JSON.stringify({ provider: "google", callbackURL }),
				redirect: "manual",
			});
		} catch (fetchErr) {
			console.error("[Google OAuth] Service binding fetch error:", fetchErr);
			return fail(503, {
				provider: "google" as const,
				error: "Could not reach auth service. Please try again.",
			});
		}

		// Forward Set-Cookie headers from Heartwood (e.g. oauth_state).
		// Cloudflare Workers' Headers supports getAll() for set-cookie specifically.
		const forwardCookies = () => {
			const cfHeaders = response.headers as unknown as {
				getAll?(name: string): string[];
			};
			const setCookies = cfHeaders.getAll?.("set-cookie") ?? [];
			for (const raw of setCookies) {
				const parsed = parseRawSetCookie(raw);
				if (parsed) {
					cookies.set(parsed.name, parsed.value, parsed.options);
				}
			}
		};

		// Better Auth responds with a redirect → Google OAuth authorization URL.
		// Accept standard redirect statuses (not 304/305/306 which aren't redirects).
		const isRedirect = [301, 302, 303, 307, 308].includes(response.status);
		if (isRedirect) {
			const location = response.headers.get("location");
			if (location) {
				forwardCookies();
				throw redirect(302, location);
			}
		}

		// Better Auth returns 200 JSON when the request uses Content-Type: application/json.
		// The JSON body contains { url, redirect: true } — we follow the URL ourselves.
		if (response.ok) {
			try {
				const body = (await response.json()) as { url?: string; redirect?: boolean };
				if (body.url && body.redirect) {
					forwardCookies();
					throw redirect(302, body.url);
				}
			} catch (err) {
				// Re-throw SvelteKit redirects (thrown by redirect(), not returned)
				if ((err as any)?.status && (err as any)?.location) throw err;
				// JSON parse failed — fall through to error handling
			}
		}

		// Non-redirect response — Heartwood returned an error or unexpected response.
		// Log full details for debugging (visible in Cloudflare real-time logs).
		let responseBody = "";
		try {
			responseBody = await response.text();
		} catch {
			/* ignore read errors */
		}
		console.error(
			"[Google OAuth] Unexpected response from Heartwood:",
			response.status,
			response.headers.get("content-type"),
		);
		console.error("[Google OAuth] Response body:", responseBody.slice(0, 500));

		// Surface more detail in the user-facing error based on the status.
		let userError: string;
		if (response.status >= 500) {
			userError =
				"Google sign-in failed to start — the auth service returned an error. Please try again shortly.";
		} else if (response.status === 429) {
			userError = "Too many sign-in attempts. Please wait a moment and try again.";
		} else {
			userError = "Google sign-in failed to start. Please try again.";
		}

		return fail(500, {
			provider: "google" as const,
			error: userError,
		});
	},
};
