/**
 * GroveAuth Client Types
 *
 * Type definitions for integrating with GroveAuth service.
 */

// =============================================================================
// CONFIGURATION
// =============================================================================

export interface GroveAuthConfig {
  /** Client ID registered with GroveAuth */
  clientId: string;
  /** Client secret for token exchange (keep secure!) */
  clientSecret: string;
  /** OAuth callback URL for this application */
  redirectUri: string;
  /** GroveAuth base URL (defaults to https://auth.grove.place) */
  authBaseUrl?: string;
}

// =============================================================================
// AUTHENTICATION TYPES
// =============================================================================

export interface TokenResponse {
  access_token: string;
  token_type: 'Bearer';
  expires_in: number;
  refresh_token: string;
  scope: string;
}

export interface TokenInfo {
  active: boolean;
  sub?: string;
  email?: string;
  name?: string;
  exp?: number;
  iat?: number;
  client_id?: string;
}

export interface UserInfo {
  sub: string;
  email: string;
  name: string | null;
  picture: string | null;
  provider: 'google' | 'github' | 'magic_code';
}

export interface LoginUrlResult {
  url: string;
  state: string;
  codeVerifier: string;
}

// =============================================================================
// SUBSCRIPTION TYPES
// =============================================================================

export type SubscriptionTier = 'starter' | 'professional' | 'business';

export interface UserSubscription {
  id: string;
  user_id: string;
  tier: SubscriptionTier;
  post_limit: number | null;
  post_count: number;
  grace_period_start: string | null;
  grace_period_days: number;
  stripe_customer_id: string | null;
  stripe_subscription_id: string | null;
  billing_period_start: string | null;
  billing_period_end: string | null;
  custom_domain: string | null;
  custom_domain_verified: number;
  created_at: string;
  updated_at: string;
}

export interface SubscriptionStatus {
  tier: SubscriptionTier;
  post_count: number;
  post_limit: number | null;
  posts_remaining: number | null;
  percentage_used: number | null;
  is_at_limit: boolean;
  is_in_grace_period: boolean;
  grace_period_days_remaining: number | null;
  can_create_post: boolean;
  upgrade_required: boolean;
}

export interface SubscriptionResponse {
  subscription: UserSubscription;
  status: SubscriptionStatus;
}

export interface CanPostResponse {
  allowed: boolean;
  status: SubscriptionStatus;
  subscription: UserSubscription;
}

// =============================================================================
// POST LIMIT CONSTANTS
// =============================================================================

export const TIER_POST_LIMITS: Record<SubscriptionTier, number | null> = {
  starter: 250,
  professional: 2000,
  business: null, // unlimited
};

export const TIER_NAMES: Record<SubscriptionTier, string> = {
  starter: 'Starter',
  professional: 'Professional',
  business: 'Business',
};

// =============================================================================
// ERROR TYPES
// =============================================================================

export interface AuthError {
  error: string;
  error_description?: string;
  message?: string;
}

export class GroveAuthError extends Error {
  public code: string;
  public statusCode: number;

  constructor(code: string, message: string, statusCode: number = 400) {
    super(message);
    this.name = 'GroveAuthError';
    this.code = code;
    this.statusCode = statusCode;
  }
}
