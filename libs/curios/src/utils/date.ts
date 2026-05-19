/**
 * Minimal date utility for curios.
 * Only includes formatRelativeTime (used by guestbook).
 */

type DateInput = string | Date | number;

function toDate(input: DateInput | null | undefined): Date | null {
	if (input == null) return null;
	if (input instanceof Date) return isNaN(input.getTime()) ? null : input;
	if (typeof input === "number") {
		const ms = input < 1e12 ? input * 1000 : input;
		const d = new Date(ms);
		return isNaN(d.getTime()) ? null : d;
	}
	if (typeof input === "string") {
		if (input === "") return null;
		const d = new Date(input);
		return isNaN(d.getTime()) ? null : d;
	}
	return null;
}

/**
 * Format a date as a compact relative time string.
 * "just now", "3m ago", "2h ago", "5d ago", "Jan 15", "Jan 15, 2024".
 */
export function formatRelativeTime(
	input: DateInput | null | undefined,
	fallback = "Unknown",
): string {
	const date = toDate(input);
	if (!date) return fallback;

	const now = new Date();
	const diffMs = now.getTime() - date.getTime();
	const diffMins = Math.floor(diffMs / 60_000);
	const diffHours = Math.floor(diffMs / 3_600_000);
	const diffDays = Math.floor(diffMs / 86_400_000);

	if (diffMins < 1) return "just now";
	if (diffMins < 60) return `${diffMins}m ago`;
	if (diffHours < 24) return `${diffHours}h ago`;
	if (diffDays < 30) return `${diffDays}d ago`;

	return date.toLocaleDateString("en-US", {
		month: "short",
		day: "numeric",
		year: date.getFullYear() !== now.getFullYear() ? "numeric" : undefined,
	});
}
