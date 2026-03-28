/**
 * Shared formatting utilities.
 *
 * SSOT for byte formatting and other display-oriented formatters
 * used across Grove apps and workers.
 */

/**
 * Format bytes to human-readable string.
 *
 * @example
 * formatBytes(0)          // "0 B"
 * formatBytes(1024)       // "1 KB"
 * formatBytes(1536000)    // "1.46 MB"
 */
export function formatBytes(bytes: number): string {
	if (bytes === 0) return "0 B";
	const k = 1024;
	const sizes = ["B", "KB", "MB", "GB", "TB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
}
