/**
 * Shared Utilities
 *
 * Common constants and helpers used across the Clearing Monitor.
 */

import { generateId } from "@autumnsgrove/lattice/utils/id";

/** Component status levels (eliminates magic strings) */
export const ComponentStatus = {
	OPERATIONAL: "operational",
	DEGRADED: "degraded",
	PARTIAL_OUTAGE: "partial_outage",
	MAJOR_OUTAGE: "major_outage",
	MAINTENANCE: "maintenance",
} as const;
export type ComponentStatus = (typeof ComponentStatus)[keyof typeof ComponentStatus];

/** Generate a UUID v4 using the engine SSOT */
export function generateUUID(): string {
	return generateId();
}
