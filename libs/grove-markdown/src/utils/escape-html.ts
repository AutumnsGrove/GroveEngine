/**
 * Escape HTML special characters in a string.
 *
 * Replaces `&`, `<`, `>`, `"`, and `'` with their HTML entity equivalents.
 * Returns empty string for null/undefined input.
 */
export function escapeHtml(unsafe: string | null | undefined): string {
	if (!unsafe) return "";
	return unsafe
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#039;");
}
