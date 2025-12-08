/**
 * GroveAuth OAuth Callback Handler
 *
 * Handles the callback from GroveAuth after user authentication.
 * Exchanges the authorization code for tokens and creates a local session.
 */

import { redirect, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { createSession, getOrCreateUser } from '$lib/server/db';

export const GET: RequestHandler = async ({ url, cookies, platform }) => {
  if (!platform?.env?.DB) {
    throw error(500, 'Database not available');
  }

  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');
  const errorParam = url.searchParams.get('error');
  const errorDescription = url.searchParams.get('error_description');

  // Check for error from GroveAuth
  if (errorParam) {
    console.error('[GroveAuth Callback] Error:', errorParam, errorDescription);
    throw redirect(302, `/login?error=${encodeURIComponent(errorDescription || errorParam)}`);
  }

  // Validate state
  const savedState = cookies.get('auth_state');
  if (!state || state !== savedState) {
    console.error('[GroveAuth Callback] State mismatch');
    throw redirect(302, '/login?error=invalid_state');
  }

  // Get code verifier
  const codeVerifier = cookies.get('auth_code_verifier');
  if (!codeVerifier) {
    console.error('[GroveAuth Callback] Missing code verifier');
    throw redirect(302, '/login?error=missing_verifier');
  }

  if (!code) {
    throw redirect(302, '/login?error=missing_code');
  }

  // Clear auth cookies
  cookies.delete('auth_state', { path: '/' });
  cookies.delete('auth_code_verifier', { path: '/' });

  try {
    const { DB, GROVEAUTH_CLIENT_ID, GROVEAUTH_CLIENT_SECRET, GROVEAUTH_REDIRECT_URI } = platform.env;
    const authBaseUrl = platform.env.GROVEAUTH_URL || 'https://auth.grove.place';

    // Exchange code for tokens
    const tokenResponse = await fetch(`${authBaseUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: GROVEAUTH_REDIRECT_URI || `${url.origin}/auth/callback`,
        client_id: GROVEAUTH_CLIENT_ID || 'domains',
        client_secret: GROVEAUTH_CLIENT_SECRET || '',
        code_verifier: codeVerifier,
      }),
    });

    if (!tokenResponse.ok) {
      const errorData = await tokenResponse.json();
      console.error('[GroveAuth Callback] Token exchange failed:', errorData);
      throw redirect(302, `/login?error=${encodeURIComponent(errorData.error_description || 'token_exchange_failed')}`);
    }

    const tokens = await tokenResponse.json();

    // Get user info
    const userInfoResponse = await fetch(`${authBaseUrl}/userinfo`, {
      headers: {
        Authorization: `Bearer ${tokens.access_token}`,
      },
    });

    if (!userInfoResponse.ok) {
      console.error('[GroveAuth Callback] Failed to get user info');
      throw redirect(302, '/login?error=userinfo_failed');
    }

    const userInfo = await userInfoResponse.json();

    // Create or get user in local DB
    const user = await getOrCreateUser(DB, userInfo.email);

    // Create local session
    const session = await createSession(DB, user.id);

    // Store tokens in session cookie (httpOnly)
    cookies.set('session', session.id, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: 60 * 60 * 24 * 30, // 30 days
    });

    // Store access token for API calls (consider refresh token flow for production)
    cookies.set('access_token', tokens.access_token, {
      path: '/',
      httpOnly: true,
      secure: true,
      sameSite: 'lax',
      maxAge: tokens.expires_in || 3600,
    });

    // Store refresh token for token refresh
    if (tokens.refresh_token) {
      cookies.set('refresh_token', tokens.refresh_token, {
        path: '/',
        httpOnly: true,
        secure: true,
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 30, // 30 days
      });
    }

    // Redirect to admin
    throw redirect(302, '/admin');
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err && err.status === 302) {
      throw err; // Re-throw redirects
    }
    console.error('[GroveAuth Callback] Error:', err);
    throw redirect(302, '/login?error=callback_failed');
  }
};
