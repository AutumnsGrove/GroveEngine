/**
 * Shared plan data for Grove Plant onboarding.
 * Derives from unified tier config for consistency.
 */

import {
  Sprout,
  TreeDeciduous,
  Trees,
  Crown,
} from "@autumnsgrove/groveengine/ui/icons";
import {
  TIERS,
  PAID_TIERS,
  type PaidTierKey,
  type TierStatus as ConfigTierStatus,
} from "@autumnsgrove/groveengine/config";

// ============================================================================
// TYPES
// ============================================================================

/** Tier availability status (re-export from config) */
export type TierStatus = ConfigTierStatus;

/** Icon keys matching plan IDs */
export type TierIconKey = PaidTierKey;

/** Full plan definition with all details */
export interface Plan {
  id: TierIconKey;
  name: string;
  tagline: string;
  description: string;
  monthlyPrice: number;
  features: string[];
  status: TierStatus;
  icon: TierIconKey;
}

/** Abbreviated plan info for preview cards */
export interface PlanPreview {
  id: TierIconKey;
  name: string;
  tagline: string;
  monthlyPrice: number;
  highlights: string[];
  status: TierStatus;
}

// ============================================================================
// ICON MAPPING
// ============================================================================

/** Map plan icon keys to Lucide icon components */
export const tierIcons: Record<TierIconKey, typeof Sprout> = {
  seedling: Sprout,
  sapling: TreeDeciduous,
  oak: Trees,
  evergreen: Crown,
};

// ============================================================================
// PLAN DATA (derived from unified config)
// ============================================================================

/** Complete plan definitions derived from unified tier config */
export const plans: Plan[] = PAID_TIERS.map((key) => {
  const tier = TIERS[key];
  return {
    id: key,
    name: tier.display.name,
    tagline: tier.display.tagline,
    description: tier.display.description,
    monthlyPrice: tier.pricing.monthlyPrice,
    features: tier.display.featureStrings,
    status: tier.status,
    icon: key,
  };
});

/** Valid plan IDs for form validation */
export const validPlanIds: TierIconKey[] = plans.map((p) => p.id);

/** Currently available plans (for selection) */
export const availablePlans = plans.filter((p) => p.status === "available");

// ============================================================================
// HELPERS
// ============================================================================

/** Get a plan by ID */
export function getPlanById(id: string): Plan | undefined {
  return plans.find((p) => p.id === id);
}

/** Check if a plan ID is valid */
export function isValidPlanId(id: string): id is TierIconKey {
  return validPlanIds.includes(id as TierIconKey);
}

/** Check if a plan is available for selection */
export function isPlanAvailable(id: string): boolean {
  const plan = getPlanById(id);
  return plan?.status === "available";
}

/** Default number of feature highlights to show in previews */
const DEFAULT_HIGHLIGHT_COUNT = 3;

/**
 * Get plan previews for landing page cards.
 * @param highlightCount - Number of features to include (default: 3)
 */
export function getPlanPreviews(
  highlightCount = DEFAULT_HIGHLIGHT_COUNT,
): PlanPreview[] {
  return plans.map((plan) => ({
    id: plan.id,
    name: plan.name,
    tagline: plan.tagline,
    monthlyPrice: plan.monthlyPrice,
    highlights: plan.features.slice(0, highlightCount),
    status: plan.status,
  }));
}
