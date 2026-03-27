/**
 * Date formatting utilities for Clearing.
 *
 * Most date formatting is handled by the engine SSOT at
 * @autumnsgrove/lattice/utils/date. This file re-exports those
 * and adds Clearing-specific formatters.
 */

// Re-export engine SSOT date functions used by Clearing
export {
	formatDateFull,
	formatDateTime as formatTime,
	formatRelativeTime,
	formatDuration,
} from "@autumnsgrove/lattice/utils/date";

/**
 * Format a date for uptime bar tooltips.
 * Clearing-specific: includes weekday prefix (e.g., "Sun, Jan 5").
 * No engine equivalent — the weekday is specific to uptime display.
 */
export function formatDateShort(dateStr: string): string {
	const date = new Date(dateStr);
	if (isNaN(date.getTime())) return "Unknown";

	return date.toLocaleDateString("en-US", {
		weekday: "short",
		month: "short",
		day: "numeric",
	});
}
