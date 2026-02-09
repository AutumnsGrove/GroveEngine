/**
 * UpgradesGraft: Cultivation & Garden Management
 *
 * Unified module for growth stages, plan upgrades, and billing portal.
 *
 * @example
 * ```typescript
 * import { CurrentStageBadge, GardenStatus } from '@autumnsgrove/groveengine/grafts/upgrades';
 * import type { FlourishState, GrowthStatus } from '@autumnsgrove/groveengine/grafts/upgrades';
 * ```
 */

export * from "./types";
export { createUpgradeConfig, getPlantingUrl, canCultivateTo } from "./config";

// Client Components
export * from "./components/index.js";
