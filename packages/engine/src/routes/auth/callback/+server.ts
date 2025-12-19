/**
 * OAuth Callback - Handle GroveAuth (Heartwood) authentication response
 *
 * Exchanges the authorization code for tokens, fetches user info,
 * upserts user into D1, and sets session cookies.
 */

import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

/**
 * OAuth token response from GroveAuth
 */
interface TokenResponse {
  access_token: string;
  refresh_token?: string;
  expires_in?: number;
}

/**
 * OAuth error response from GroveAuth
 */
interface ErrorResponse {
  error?: string;
  error_description?: string;
}

/**
 * User info response from GroveAuth /userinfo endpoint
 */
interface UserInfoResponse {
  sub: string;           // GroveAuth user ID
  email: string;         // User's email
  name?: string;         // Display name
  picture?: string;      // Avatar URL
}

/**
 * Map error codes to user-friendly messages
 */
const ERROR_MESSAGES: Record<string, string> = {
  access_denied: "You cancelled the login process",
  invalid_grant: "Login session expired, please try again",
  server_error: "Authentication service unavailable, please try later",
  invalid_state: "Login session expired, please try again",
  missing_verifier: "Login session expired, please try again",
  missing_code: "Login was not completed, please try again",
  token_exchange_failed: "Unable to complete login, please try again",
};

function getFriendlyErrorMessage(errorCode: string): string {
  return ERROR_MESSAGES[errorCode] || "An error occurred during login";
}

export const GET: RequestHandler = async ({ url, cookies, platform }) => {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const errorParam = url.searchParams.get("error");

  // Check for error from GroveAuth
  if (errorParam) {
    console.error("[Auth Callback] Error from GroveAuth:", errorParam);
    const friendlyMessage = getFriendlyErrorMessage(errorParam);
    redirect(302, `/auth/login?error=${encodeURIComponent(friendlyMessage)}`);
  }

  // Validate state (CSRF protection)
  const savedState = cookies.get("auth_state");
  if (!state || state !== savedState) {
    console.error("[Auth Callback] State mismatch - CSRF check failed");
    redirect(
      302,
      `/auth/login?error=${encodeURIComponent(getFriendlyErrorMessage("invalid_state"))}`,
    );
  }

  // Get code verifier (PKCE)
  const codeVerifier = cookies.get("auth_code_verifier");
  if (!codeVerifier) {
    console.error("[Auth Callback] Missing code verifier");
    redirect(
      302,
      `/auth/login?error=${encodeURIComponent(getFriendlyErrorMessage("missing_verifier"))}`,
    );
  }

  if (!code) {
    redirect(
      302,
      `/auth/login?error=${encodeURIComponent(getFriendlyErrorMessage("missing_code"))}`,
    );
  }

  // Get return URL
  const returnTo = cookies.get("auth_return_to") || "/admin";

  // Clear auth cookies immediately
  cookies.delete("auth_state", { path: "/" });
  cookies.delete("auth_code_verifier", { path: "/" });
  cookies.delete("auth_return_to", { path: "/" });

  try {
    const authBaseUrl =
      platform?.env?.GROVEAUTH_URL || "https://auth-api.grove.place";
    const clientId = platform?.env?.GROVEAUTH_CLIENT_ID || "groveengine";
    const clientSecret = platform?.env?.GROVEAUTH_CLIENT_SECRET || "";
    const redirectUri = `${url.origin}/auth/callback`;

    // Exchange code for tokens
    const tokenResponse = await fetch(`${authBaseUrl}/token`, {
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
      const errorData = await tokenResponse.json() as ErrorResponse;
      console.error("[Auth Callback] Token exchange failed:", {
        status: tokenResponse.status,
        error: errorData,
        authBaseUrl,
        clientId,
        hasSecret: !!clientSecret,
        redirectUri,
      });
      const debugError =
        errorData?.error_description ||
        errorData?.error ||
        "token_exchange_failed";
      redirect(302, `/auth/login?error=${encodeURIComponent(debugError)}`);
    }

    const tokens = await tokenResponse.json() as TokenResponse;

    // Fetch user info from GroveAuth
    let userInfo: UserInfoResponse | null = null;
    try {
      const userInfoResponse = await fetch(`${authBaseUrl}/userinfo`, {
        headers: {
          Authorization: `Bearer ${tokens.access_token}`,
        },
      });

      if (userInfoResponse.ok) {
        userInfo = await userInfoResponse.json() as UserInfoResponse;
      } else {
        console.warn("[Auth Callback] Failed to fetch user info:", userInfoResponse.status);
      }
    } catch (userInfoErr) {
      console.warn("[Auth Callback] Error fetching user info:", userInfoErr);
    }

    // Upsert user into D1 if we have user info and database access
    if (userInfo && platform?.env?.DB) {
      try {
        const userId = crypto.randomUUID();
        await platform.env.DB.prepare(`
          INSERT INTO users (id, groveauth_id, email, display_name, avatar_url, last_login_at, login_count, created_at, updated_at)
          VALUES (?, ?, ?, ?, ?, unixepoch(), 1, unixepoch(), unixepoch())
          ON CONFLICT (groveauth_id) DO UPDATE SET
            email = excluded.email,
            display_name = excluded.display_name,
            avatar_url = excluded.avatar_url,
            last_login_at = unixepoch(),
            login_count = login_count + 1,
            updated_at = unixepoch()
        `)
          .bind(userId, userInfo.sub, userInfo.email, userInfo.name || null, userInfo.picture || null)
          .run();

        console.log("[Auth Callback] User upserted:", userInfo.email);
      } catch (dbErr) {
        // Log but don't fail auth - user can still proceed
        console.error("[Auth Callback] Failed to upsert user:", dbErr);
      }
    }

    // Determine if we're in production
    const isProduction =
      url.hostname !== "localhost" && url.hostname !== "127.0.0.1";

    // Set cookies - use .grove.place domain in production for cross-subdomain access
    const cookieOptions = {
      path: "/",
      httpOnly: true,
      secure: isProduction,
      sameSite: "lax" as const,
      ...(isProduction ? { domain: ".grove.place" } : {}),
    };

    // Set access token (used for API calls and session verification)
    cookies.set("access_token", tokens.access_token, {
      ...cookieOptions,
      maxAge: tokens.expires_in || 3600, // Default 1 hour
    });

    // Set refresh token if provided
    if (tokens.refresh_token) {
      cookies.set("refresh_token", tokens.refresh_token, {
        ...cookieOptions,
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

    // Set session identifier cookie
    const sessionId = crypto.randomUUID();
    cookies.set("session", sessionId, {
      ...cookieOptions,
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

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
      `/auth/login?error=${encodeURIComponent(getFriendlyErrorMessage("token_exchange_failed"))}`,
    );
  }
};
