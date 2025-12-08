/**
 * GroveAuth Client
 *
 * Client library for integrating with GroveAuth authentication service.
 * Use this to handle OAuth flows, token management, and subscription checks.
 */

import type {
  GroveAuthConfig,
  TokenResponse,
  TokenInfo,
  UserInfo,
  LoginUrlResult,
  SubscriptionResponse,
  CanPostResponse,
  SubscriptionTier,
} from './types.js';
import { GroveAuthError } from './types.js';

const DEFAULT_AUTH_URL = 'https://auth.grove.place';

// =============================================================================
// PKCE HELPERS
// =============================================================================

/**
 * Generate a cryptographically secure random string
 */
function generateRandomString(length: number): string {
  const charset = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-._~';
  const randomValues = new Uint8Array(length);
  crypto.getRandomValues(randomValues);
  return Array.from(randomValues, (byte) => charset[byte % charset.length]).join('');
}

/**
 * Generate a code verifier for PKCE
 */
export function generateCodeVerifier(): string {
  return generateRandomString(64);
}

/**
 * Generate a code challenge from a code verifier using SHA-256
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const hash = await crypto.subtle.digest('SHA-256', data);
  const base64 = btoa(String.fromCharCode(...new Uint8Array(hash)));
  // URL-safe base64
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Generate a random state parameter for CSRF protection
 */
export function generateState(): string {
  return crypto.randomUUID();
}

// =============================================================================
// INPUT VALIDATION
// =============================================================================

/**
 * Validate a user ID to prevent injection attacks.
 * User IDs should only contain safe characters.
 *
 * Valid characters: alphanumeric, underscore, hyphen
 * Max length: 128 characters (UUIDs are 36 chars)
 */
const USER_ID_PATTERN = /^[a-zA-Z0-9_-]{1,128}$/;

function validateUserId(userId: string): void {
  if (!userId || typeof userId !== 'string') {
    throw new GroveAuthError('invalid_user_id', 'User ID is required', 400);
  }
  if (!USER_ID_PATTERN.test(userId)) {
    throw new GroveAuthError('invalid_user_id', 'User ID contains invalid characters', 400);
  }
}

// =============================================================================
// GROVEAUTH CLIENT CLASS
// =============================================================================

export class GroveAuthClient {
  private config: Required<GroveAuthConfig>;

  constructor(config: GroveAuthConfig) {
    this.config = {
      ...config,
      authBaseUrl: config.authBaseUrl || DEFAULT_AUTH_URL,
    };
  }

  // ===========================================================================
  // AUTHENTICATION FLOW
  // ===========================================================================

  /**
   * Generate a login URL with PKCE
   * Store the state and codeVerifier in a secure cookie for verification
   */
  async getLoginUrl(): Promise<LoginUrlResult> {
    const state = generateState();
    const codeVerifier = generateCodeVerifier();
    const codeChallenge = await generateCodeChallenge(codeVerifier);

    const params = new URLSearchParams({
      client_id: this.config.clientId,
      redirect_uri: this.config.redirectUri,
      state,
      code_challenge: codeChallenge,
      code_challenge_method: 'S256',
    });

    return {
      url: `${this.config.authBaseUrl}/login?${params}`,
      state,
      codeVerifier,
    };
  }

  /**
   * Exchange an authorization code for tokens
   */
  async exchangeCode(code: string, codeVerifier: string): Promise<TokenResponse> {
    const response = await fetch(`${this.config.authBaseUrl}/token`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code,
        redirect_uri: this.config.redirectUri,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
        code_verifier: codeVerifier,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new GroveAuthError(
        data.error || 'token_error',
        data.error_description || data.message || 'Failed to exchange code',
        response.status
      );
    }

    return data as TokenResponse;
  }

  /**
   * Refresh an access token using a refresh token
   */
  async refreshToken(refreshToken: string): Promise<TokenResponse> {
    const response = await fetch(`${this.config.authBaseUrl}/token/refresh`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      throw new GroveAuthError(
        data.error || 'refresh_error',
        data.error_description || data.message || 'Failed to refresh token',
        response.status
      );
    }

    return data as TokenResponse;
  }

  /**
   * Revoke a refresh token
   */
  async revokeToken(refreshToken: string): Promise<void> {
    const response = await fetch(`${this.config.authBaseUrl}/token/revoke`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        token: refreshToken,
        token_type_hint: 'refresh_token',
        client_id: this.config.clientId,
        client_secret: this.config.clientSecret,
      }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new GroveAuthError(
        data.error || 'revoke_error',
        data.error_description || data.message || 'Failed to revoke token',
        response.status
      );
    }
  }

  // ===========================================================================
  // TOKEN VERIFICATION
  // ===========================================================================

  /**
   * Verify an access token
   */
  async verifyToken(accessToken: string): Promise<TokenInfo | null> {
    const response = await fetch(`${this.config.authBaseUrl}/verify`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    const data = await response.json() as TokenInfo;

    if (!data.active) {
      return null;
    }

    return data;
  }

  /**
   * Get user info using an access token
   */
  async getUserInfo(accessToken: string): Promise<UserInfo> {
    const response = await fetch(`${this.config.authBaseUrl}/userinfo`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new GroveAuthError(
        data.error || 'userinfo_error',
        data.error_description || data.message || 'Failed to get user info',
        response.status
      );
    }

    return response.json() as Promise<UserInfo>;
  }

  // ===========================================================================
  // SUBSCRIPTION MANAGEMENT
  // ===========================================================================

  /**
   * Get the current user's subscription
   */
  async getSubscription(accessToken: string): Promise<SubscriptionResponse> {
    const response = await fetch(`${this.config.authBaseUrl}/subscription`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new GroveAuthError(
        data.error || 'subscription_error',
        data.message || 'Failed to get subscription',
        response.status
      );
    }

    return response.json() as Promise<SubscriptionResponse>;
  }

  /**
   * Get a specific user's subscription
   */
  async getUserSubscription(accessToken: string, userId: string): Promise<SubscriptionResponse> {
    validateUserId(userId);
    const response = await fetch(`${this.config.authBaseUrl}/subscription/${encodeURIComponent(userId)}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new GroveAuthError(
        data.error || 'subscription_error',
        data.message || 'Failed to get subscription',
        response.status
      );
    }

    return response.json() as Promise<SubscriptionResponse>;
  }

  /**
   * Check if a user can create a new post
   */
  async canUserCreatePost(accessToken: string, userId: string): Promise<CanPostResponse> {
    validateUserId(userId);
    const response = await fetch(`${this.config.authBaseUrl}/subscription/${encodeURIComponent(userId)}/can-post`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      const data = await response.json();
      throw new GroveAuthError(
        data.error || 'limit_check_error',
        data.message || 'Failed to check post limit',
        response.status
      );
    }

    return response.json() as Promise<CanPostResponse>;
  }

  /**
   * Increment post count after creating a post
   */
  async incrementPostCount(accessToken: string, userId: string): Promise<SubscriptionResponse> {
    validateUserId(userId);
    const response = await fetch(`${this.config.authBaseUrl}/subscription/${encodeURIComponent(userId)}/post-count`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'increment' }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new GroveAuthError(
        data.error || 'count_error',
        data.message || 'Failed to update post count',
        response.status
      );
    }

    return response.json() as Promise<SubscriptionResponse>;
  }

  /**
   * Decrement post count after deleting a post
   */
  async decrementPostCount(accessToken: string, userId: string): Promise<SubscriptionResponse> {
    validateUserId(userId);
    const response = await fetch(`${this.config.authBaseUrl}/subscription/${encodeURIComponent(userId)}/post-count`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ action: 'decrement' }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new GroveAuthError(
        data.error || 'count_error',
        data.message || 'Failed to update post count',
        response.status
      );
    }

    return response.json() as Promise<SubscriptionResponse>;
  }

  /**
   * Update post count to a specific value
   */
  async setPostCount(accessToken: string, userId: string, count: number): Promise<SubscriptionResponse> {
    validateUserId(userId);
    const response = await fetch(`${this.config.authBaseUrl}/subscription/${encodeURIComponent(userId)}/post-count`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ count }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new GroveAuthError(
        data.error || 'count_error',
        data.message || 'Failed to update post count',
        response.status
      );
    }

    return response.json() as Promise<SubscriptionResponse>;
  }

  /**
   * Update a user's subscription tier
   */
  async updateTier(accessToken: string, userId: string, tier: SubscriptionTier): Promise<SubscriptionResponse> {
    validateUserId(userId);
    const response = await fetch(`${this.config.authBaseUrl}/subscription/${encodeURIComponent(userId)}/tier`, {
      method: 'PUT',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ tier }),
    });

    if (!response.ok) {
      const data = await response.json();
      throw new GroveAuthError(
        data.error || 'tier_error',
        data.message || 'Failed to update tier',
        response.status
      );
    }

    return response.json() as Promise<SubscriptionResponse>;
  }
}

// =============================================================================
// FACTORY FUNCTION
// =============================================================================

/**
 * Create a GroveAuth client instance
 */
export function createGroveAuthClient(config: GroveAuthConfig): GroveAuthClient {
  return new GroveAuthClient(config);
}
