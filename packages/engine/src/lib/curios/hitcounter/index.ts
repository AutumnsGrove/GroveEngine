/**
 * Hit Counter Curio
 *
 * Nostalgic page view counter. Privacy-first — no visitor tracking, just a number.
 * Zero complexity, maximum nostalgia.
 *
 * Features:
 * - 4 display styles: Classic, Odometer, Minimal, LCD
 * - CSS-only animations (respects prefers-reduced-motion)
 * - Atomic increment on page load
 * - Optional "since" date label
 * - Per-page counters (Oak+ tier)
 * - Vine-native (no dedicated page needed)
 */

// =============================================================================
// Types
// =============================================================================

/**
 * Hit counter display style options
 */
export type HitCounterStyle = "classic" | "odometer" | "minimal" | "lcd";

/**
 * Hit counter configuration stored in the database
 */
export interface HitCounterConfig {
  id: string;
  tenantId: string;
  pagePath: string;
  count: number;
  style: HitCounterStyle;
  label: string;
  showSinceDate: boolean;
  startedAt: string;
}

/**
 * Hit counter display data for frontend rendering
 */
export interface HitCounterDisplay {
  count: number;
  formattedCount: string;
  digits: string[];
  style: HitCounterStyle;
  label: string;
  showSinceDate: boolean;
  startedAt: string;
}

// =============================================================================
// Constants
// =============================================================================

/**
 * Display style options with labels and descriptions
 */
export const HIT_COUNTER_STYLE_OPTIONS: {
  value: HitCounterStyle;
  label: string;
  description: string;
}[] = [
  {
    value: "classic",
    label: "Classic",
    description: "Green digits on black — the OG web counter",
  },
  {
    value: "odometer",
    label: "Odometer",
    description: "Flip-style mechanical counter",
  },
  {
    value: "minimal",
    label: "Minimal",
    description: "Plain text — clean and simple",
  },
  {
    value: "lcd",
    label: "LCD",
    description: "Calculator/digital display aesthetic",
  },
];

/**
 * Default configuration for new hit counters
 */
export const DEFAULT_HIT_COUNTER_CONFIG: Omit<
  HitCounterConfig,
  "id" | "tenantId" | "startedAt"
> = {
  pagePath: "/",
  count: 0,
  style: "classic",
  label: "You are visitor",
  showSinceDate: true,
};

/**
 * Default counter label
 */
export const DEFAULT_LABEL = "You are visitor";

/**
 * Maximum label length
 */
export const MAX_LABEL_LENGTH = 100;

/**
 * Minimum digits to display (zero-padded)
 */
export const MIN_DISPLAY_DIGITS = 6;

// =============================================================================
// Utility Functions
// =============================================================================

import { stripHtml } from "../sanitize";

/**
 * Generate a unique ID for hit counter records
 */
export function generateHitCounterId(): string {
  return `hc_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Format a count with commas (e.g., 1247 -> "1,247")
 */
export function formatCount(count: number): string {
  return count.toLocaleString("en-US");
}

/**
 * Split a count into individual digit strings for display.
 * Zero-pads to at least MIN_DISPLAY_DIGITS.
 */
export function toDigits(count: number): string[] {
  const str = String(Math.max(0, Math.floor(count)));
  const padded = str.padStart(MIN_DISPLAY_DIGITS, "0");
  return padded.split("");
}

/**
 * Sanitize a label — trim, limit length, default if empty
 */
export function sanitizeLabel(label: string | null | undefined): string {
  if (!label) return DEFAULT_LABEL;
  const cleaned = stripHtml(label).trim();
  if (cleaned.length === 0) return DEFAULT_LABEL;
  if (cleaned.length > MAX_LABEL_LENGTH)
    return cleaned.slice(0, MAX_LABEL_LENGTH);
  return cleaned;
}

/**
 * Format a "since" date for display (e.g., "since Jan 15, 2026")
 */
export function formatSinceDate(dateString: string): string {
  const date = new Date(dateString);
  return `since ${date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

/**
 * Transform DB row to display data
 */
export function toDisplayCounter(config: HitCounterConfig): HitCounterDisplay {
  return {
    count: config.count,
    formattedCount: formatCount(config.count),
    digits: toDigits(config.count),
    style: config.style,
    label: config.label,
    showSinceDate: config.showSinceDate,
    startedAt: config.startedAt,
  };
}
