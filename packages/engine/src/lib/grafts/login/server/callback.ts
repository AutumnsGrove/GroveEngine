/**
 * Callback Handler Factory
 *
 * Creates a SvelteKit request handler for OAuth callback processing.
 * Exchanges authorization code for tokens and sets session cookies.
 */

import { redirect, error } from "@sveltejs/kit";
import type { RequestHandler, RequestEvent } from "@sveltejs/kit";
import type { CallbackHandlerConfig } from "../types.js";
import { getRealOrigin, isProduction, getCookieDomain } from "./origin.js";
import { AUTH_COOKIE_NAMES, GROVEAUTH_URLS } from "../config.js";

// =============================================================================
// ERROR HANDLING
// =============================================================================

/**
 * User-friendly error messages for common OAuth errors.
 */
const ERROR_MESSAGES: Record<string, string> = {
  access_denied: "You cancelled the login process",
  invalid_grant: "Login session expired, please try again",
  server_error: "Authentication service unavailable, please try later",
  invalid_state: "Login session expired, please try again",
  missing_verifier: "Login session expired, please try again",
  missing_code: "Login was not completed, please try again",
  token_exchange_failed: "Unable to complete login, please try again",
  rate_limited: "Too many login attempts. Please wait before trying again.",
};

/**
 * Get a user-friendly error message for an error code.
 */
function getFriendlyErrorMessage(errorCode: string): string {
  return ERROR_MESSAGES[errorCode] || "An error occurred during login";
}

// =============================================================================
// RATE LIMITING
// =============================================================================

/**
 * Get client IP from request headers.
 * Cloudflare provides CF-Connecting-IP for the real client IP.
 */
function getClientIP(request: Request): string {
  return (
    request.headers.get("cf-connecting-ip") ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "unknown"
  );
}

/**
 * Simple KV-based rate limiting for auth endpoints.
 * Returns true if rate limited, false if allowed.
 */
async function isRateLimited(
  kv: KVNamespace,
  key: string,
  limit: number,
  windowSeconds: number,
): Promise<boolean> {
  const now = Math.floor(Date.now() / 1000);
  const windowKey = `ratelimit:${key}:${Math.floor(now / windowSeconds)}`;

  try {
    const current = await kv.get(windowKey);
    const count = current ? parseInt(current, 10) : 0;

    if (count >= limit) {
      return true; // Rate limited
    }

    // Increment counter with TTL
    await kv.put(windowKey, String(count + 1), {
      expirationTtl: windowSeconds,
    });

    return false;
  } catch (err) {
    // Fail open for auth availability, but log for monitoring
    console.warn("[Auth Callback] Rate limit KV error (failing open):", err);
    return false;
  }
}

// =============================================================================
// COOKIE MANAGEMENT
// =============================================================================

/**
 * Clear the temporary auth flow cookies.
 */
function clearAuthCookies(cookies: RequestEvent["cookies"]): void {
  const clearOptions = { path: "/", httpOnly: true, secure: true };
  cookies.delete(AUTH_COOKIE_NAMES.state, clearOptions);
  cookies.delete(AUTH_COOKIE_NAMES.codeVerifier, clearOptions);
  cookies.delete(AUTH_COOKIE_NAMES.returnTo, clearOptions);
}

/**
 * Set session cookies after successful authentication.
 */
function setSessionCookies(
  cookies: RequestEvent["cookies"],
  tokens: { accessToken: string; refreshToken?: string; expiresIn?: number },
  url: URL,
  cookieDomainOverride?: string,
): void {
  const isProd = isProduction(url);
  const cookieDomain = cookieDomainOverride || getCookieDomain(url);

  const cookieOptions = {
    path: "/",
    httpOnly: true,
    secure: isProd,
    sameSite: "lax" as const,
    ...(cookieDomain ? { domain: cookieDomain } : {}),
  };

  // Set access token
  cookies.set(AUTH_COOKIE_NAMES.accessToken, tokens.accessToken, {
    ...cookieOptions,
    maxAge: tokens.expiresIn || 3600,
  });

  // Set refresh token if provided
  if (tokens.refreshToken) {
    cookies.set(AUTH_COOKIE_NAMES.refreshToken, tokens.refreshToken, {
      ...cookieOptions,
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });
  }

  // Set session cookie
  const sessionId = crypto.randomUUID();
  cookies.set(AUTH_COOKIE_NAMES.session, sessionId, {
    ...cookieOptions,
    maxAge: 60 * 60 * 24 * 30, // 30 days
  });
}

// =============================================================================
// HANDLER FACTORY
// =============================================================================

/**
 * Create a callback handler for OAuth authentication.
 *
 * This factory creates a SvelteKit GET handler that:
 * 1. Validates the OAuth state (CSRF protection)
 * 2. Exchanges the authorization code for tokens
 * 3. Sets session cookies for cross-subdomain auth
 * 4. Redirects to the original return URL
 *
 * @param config - Configuration for the callback handler
 * @returns A SvelteKit RequestHandler
 *
 * @example
 * ```typescript
 * // In routes/auth/callback/+server.ts
 * import { createCallbackHandler } from '@autumnsgrove/groveengine/grafts/login/server';
 *
 * export const GET = createCallbackHandler({
 *   clientId: 'my-app',
 *   authApiUrl: 'https://auth-api.grove.place',
 *   defaultReturnTo: '/dashboard'
 * });
 * ```
 */
export function createCallbackHandler(
  config: CallbackHandlerConfig,
): RequestHandler {
  const {
    clientId,
    clientSecretEnvVar = "GROVEAUTH_CLIENT_SECRET",
    authApiUrl = GROVEAUTH_URLS.api,
    defaultReturnTo = "/admin",
    cookieDomain,
    rateLimitKvKey = "CACHE_KV",
  } = config;

  return async ({
    url,
    cookies,
    platform,
    request,
  }): Promise<Response | never> => {
    // Cast env to allow dynamic key access
    const env = platform?.env as Record<string, unknown> | undefined;

    // Rate limiting
    const kv = env?.[rateLimitKvKey] as KVNamespace | undefined;
    if (kv) {
      const clientIp = getClientIP(request);
      const rateLimited = await isRateLimited(
        kv,
        `auth-callback:${clientIp}`,
        10, // 10 attempts
        900, // per 15 minutes
      );

      if (rateLimited) {
        console.warn("[Auth Callback] Rate limited:", { ip: clientIp });
        return new Response(
          JSON.stringify({
            error: "rate_limited",
            message: getFriendlyErrorMessage("rate_limited"),
          }),
          {
            status: 429,
            headers: {
              "Content-Type": "application/json",
              "Retry-After": "900",
            },
          },
        );
      }
    }

    // Get parameters from URL
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const errorParam = url.searchParams.get("error");

    // Check for error from GroveAuth
    if (errorParam) {
      console.error("[Auth Callback] Error from provider:", errorParam);
      const friendlyMessage = getFriendlyErrorMessage(errorParam);
      redirect(302, `/?error=${encodeURIComponent(friendlyMessage)}`);
    }

    // Validate state (CSRF protection)
    const savedState = cookies.get(AUTH_COOKIE_NAMES.state);
    if (!state || state !== savedState) {
      console.error("[Auth Callback] State mismatch");
      redirect(
        302,
        `/?error=${encodeURIComponent(getFriendlyErrorMessage("invalid_state"))}`,
      );
    }

    // Get code verifier (PKCE)
    const codeVerifier = cookies.get(AUTH_COOKIE_NAMES.codeVerifier);
    if (!codeVerifier) {
      console.error("[Auth Callback] Missing code verifier");
      redirect(
        302,
        `/?error=${encodeURIComponent(getFriendlyErrorMessage("missing_verifier"))}`,
      );
    }

    // Validate authorization code
    if (!code) {
      redirect(
        302,
        `/?error=${encodeURIComponent(getFriendlyErrorMessage("missing_code"))}`,
      );
    }

    // Get return URL
    const returnTo = cookies.get(AUTH_COOKIE_NAMES.returnTo) || defaultReturnTo;

    // Clear temporary auth cookies
    clearAuthCookies(cookies);

    // Exchange code for tokens
    try {
      const clientSecret = (env?.[clientSecretEnvVar] as string) || "";
      const redirectUri = `${getRealOrigin(request, url)}/auth/callback`;

      const tokenResponse = await fetch(`${authApiUrl}/token`, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code,
          redirect_uri: redirectUri,
          client_id: clientId,
          client_secret: clientSecret,
          code_verifier: codeVerifier,
        }),
      });

      if (!tokenResponse.ok) {
        const errorData = (await tokenResponse
          .json()
          .catch(() => ({}))) as Record<string, unknown>;
        // Log full details server-side for debugging
        console.error("[Auth Callback] Token exchange failed:", {
          status: tokenResponse.status,
          error: errorData?.error,
          // Log description server-side only - don't expose to users
          description: errorData?.error_description,
        });
        // Only pass the error code to the user, not the description
        // This prevents leaking internal implementation details
        const errorCode =
          (errorData?.error as string) || "token_exchange_failed";
        const friendlyMessage = getFriendlyErrorMessage(errorCode);
        redirect(302, `/?error=${encodeURIComponent(friendlyMessage)}`);
      }

      const tokens = (await tokenResponse.json()) as {
        access_token?: string;
        refresh_token?: string;
        expires_in?: number;
      };

      // Set session cookies
      if (tokens.access_token) {
        setSessionCookies(
          cookies,
          {
            accessToken: tokens.access_token,
            refreshToken: tokens.refresh_token,
            expiresIn: tokens.expires_in,
          },
          url,
          cookieDomain,
        );
      }

      // Redirect to the requested destination
      redirect(302, returnTo);
    } catch (err) {
      // Re-throw redirects
      if (
        err &&
        typeof err === "object" &&
        "status" in err &&
        err.status === 302
      ) {
        throw err;
      }
      console.error("[Auth Callback] Error:", err);
      redirect(
        302,
        `/?error=${encodeURIComponent(getFriendlyErrorMessage("token_exchange_failed"))}`,
      );
    }
  };
}
