/**
 * Heartwood Module
 *
 * Shared types, constants, and utilities for Heartwood auth integration.
 * The legacy GroveAuthClient has been removed — all auth flows now go
 * through Better Auth via login.grove.place.
 */

// Types
export type {
	GroveAuthConfig,
	TokenResponse,
	TokenInfo,
	UserInfo,
	LoginUrlResult,
	UserSubscription,
	SubscriptionStatus,
	SubscriptionResponse,
	CanPostResponse,
	SubscriptionTier,
	AuthError,
	// OAuth types
	OAuthProvider,
	// Passkey types
	Passkey,
	PasskeyRegisterOptions,
	PasskeyAuthOptions,
	// 2FA types
	TwoFactorStatus,
	TwoFactorEnableResponse,
	TwoFactorVerifyResponse,
	// Linked accounts
	LinkedAccount,
} from "./types.js";

export { GroveAuthError, TIER_POST_LIMITS, TIER_NAMES } from "./types.js";

// Post limit helpers
export {
	getQuotaDescription,
	getQuotaUrgency,
	getSuggestedActions,
	getUpgradeRecommendation,
	getQuotaWidgetData,
	getPreSubmitCheck,
} from "./limits.js";

export type { QuotaWidgetData, PreSubmitCheckResult } from "./limits.js";

// Color utilities
export {
	STATUS_COLORS,
	ALERT_VARIANTS,
	getStatusColorFromPercentage,
	getAlertVariantFromColor,
} from "./colors.js";

export type { StatusColor, AlertVariant } from "./colors.js";

// Rate limiting
export { RateLimiter, RateLimitError, withRateLimit, DEFAULT_RATE_LIMITS } from "./rate-limit.js";

// Validation utilities
export {
	isValidTotpCode,
	isValidCredential,
	getRequiredEnv,
	TOTP_CODE_LENGTH,
	TOTP_CODE_REGEX,
} from "./validation.js";

export type { PasskeyCredential } from "./validation.js";

// Auth error system
export {
	AUTH_ERRORS,
	getAuthError,
	getAuthErrorByCode,
	logAuthError,
	buildErrorParams,
} from "./errors.js";

export type { ErrorCategory, AuthErrorDef, AuthErrorKey } from "./errors.js";
