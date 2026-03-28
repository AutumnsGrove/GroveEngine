/**
 * Utility functions for the Account page components.
 * Extracted for reusability and testability.
 */

import { formatDateFull } from "@autumnsgrove/lattice/utils/date";

// Re-export from engine SSOT
export { sanitizeErrorMessage } from "@autumnsgrove/lattice/utils/errors";

/**
 * Format an ISO date string for display.
 * Delegates to the shared engine date utility.
 * @param isoString - ISO 8601 date string or null/undefined
 * @returns Formatted date string like "January 15, 2026" or "—" if invalid
 */
export function formatDate(isoString: string | null | undefined): string {
	return formatDateFull(isoString, "—");
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
 * Warning threshold for usage indicators (80%).
 */
export const USAGE_WARNING_THRESHOLD = 80;
