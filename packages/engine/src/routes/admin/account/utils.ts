/**
 * Utility functions for the Account page components.
 * Extracted for reusability and testability.
 */

/**
 * Format an ISO date string for display.
 * @param isoString - ISO 8601 date string or null/undefined
 * @returns Formatted date string like "January 15, 2026" or "—" if invalid
 */
export function formatDate(isoString: string | null | undefined): string {
  if (!isoString) return "—";
  try {
    const date = new Date(isoString);
    // Check for Invalid Date
    if (isNaN(date.getTime())) return "—";
    return date.toLocaleDateString(undefined, {
      year: "numeric",
      month: "long",
      day: "numeric",
    });
  } catch {
    return "—";
  }
}

/**
 * Calculate days remaining until a given date.
 * @param endDateIso - ISO 8601 date string for the end date
 * @returns Number of days remaining, or null if invalid
 */
export function daysRemaining(endDateIso: string | null | undefined): number | null {
  if (!endDateIso) return null;
  try {
    const end = new Date(endDateIso);
    // Check for Invalid Date
    if (isNaN(end.getTime())) return null;
    const now = new Date();
    const diff = Math.ceil((end.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    return diff > 0 ? diff : 0;
  } catch {
    return null;
  }
}

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

  // Filter out messages containing provider-specific details
  if (msg.includes("stripe_") || msg.includes("sk_") || msg.includes("pk_")) {
    return fallback;
  }

  // Filter out internal error codes
  if (msg.includes("INTERNAL") || msg.includes("500")) {
    return fallback;
  }

  return msg || fallback;
}

/**
 * Warning threshold for usage indicators (80%).
 */
export const USAGE_WARNING_THRESHOLD = 80;
