/**
 * GroveAuth Validation Utilities
 *
 * Shared validation functions for authentication flows.
 * These are used both server-side for security and can be tested independently.
 */

// ==========================================================================
// Constants
// ==========================================================================

/** Length of TOTP codes (Time-based One-Time Password) */
export const TOTP_CODE_LENGTH = 6;

/** Regex pattern for valid TOTP codes (6 digits only) */
export const TOTP_CODE_REGEX = /^\d{6}$/;

// ==========================================================================
// TOTP Validation
// ==========================================================================

/**
 * Validate a TOTP (Time-based One-Time Password) code.
 *
 * Checks that the code is exactly 6 digits (no letters or special characters).
 *
 * @param code - The code to validate
 * @returns True if code is a valid 6-digit string
 *
 * @example
 * ```ts
 * isValidTotpCode("123456") // true
 * isValidTotpCode("12345")  // false (too short)
 * isValidTotpCode("1234567") // false (too long)
 * isValidTotpCode("12345a") // false (contains letter)
 * isValidTotpCode(undefined) // false
 * ```
 */
export function isValidTotpCode(code: string | undefined): code is string {
	return typeof code === "string" && TOTP_CODE_REGEX.test(code);
}

// ==========================================================================
// Environment Variable Validation
// ==========================================================================

/**
 * Get a required environment variable, throwing if not set.
 *
 * @param env - The environment object (from platform.env)
 * @param key - The environment variable key
 * @param fallback - Optional fallback value (for development only)
 * @returns The environment variable value
 * @throws Error if the variable is not set and no fallback provided
 *
 * @example
 * ```ts
 * const authBaseUrl = getRequiredEnv(platform?.env, 'AUTH_BASE_URL');
 * ```
 */
export function getRequiredEnv(
	env: Record<string, string> | undefined,
	key: string,
	fallback?: string,
): string {
	const value = env?.[key] ?? fallback;
	if (!value) {
		throw new Error(`Missing required environment variable: ${key}`);
	}
	return value;
}
