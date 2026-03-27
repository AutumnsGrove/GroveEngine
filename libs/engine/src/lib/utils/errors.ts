/**
 * Error handling utilities.
 *
 * SSOT for error sanitization and user-facing error message preparation.
 */

/**
 * Patterns that indicate sensitive or unhelpful error information.
 * These should be filtered out and replaced with user-friendly messages.
 */
const SENSITIVE_PATTERNS = [
	// Stripe identifiers
	"stripe_",
	"sk_",
	"pk_",
	"cus_",
	"sub_",
	"pi_",
	"pm_",
	"ch_",
	"in_",
	// Stripe error types
	"api_error",
	"card_error",
	"invalid_request_error",
	"authentication_error",
	"rate_limit_error",
	"idempotency_error",
	// Internal indicators
	"INTERNAL",
	"500",
	"502",
	"503",
	"504",
	// Technical details users shouldn't see
	"ECONNREFUSED",
	"ETIMEDOUT",
	"ENOTFOUND",
	"fetch failed",
	"network error",
];

/**
 * Sanitize error messages to avoid exposing sensitive provider details.
 * Filters out Stripe-specific error codes and internal error indicators.
 *
 * @param error - The error object to sanitize
 * @param fallback - Fallback message to use if error contains sensitive info
 * @returns Safe error message for display to users
 */
export function sanitizeErrorMessage(error: unknown, fallback: string): string {
	if (!(error instanceof Error)) return fallback;

	const msg = error.message;
	const msgLower = msg.toLowerCase();

	// Filter out messages containing sensitive patterns
	for (const pattern of SENSITIVE_PATTERNS) {
		if (msgLower.includes(pattern.toLowerCase())) {
			return fallback;
		}
	}

	return msg || fallback;
}
