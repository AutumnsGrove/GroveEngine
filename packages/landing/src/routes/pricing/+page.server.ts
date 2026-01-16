/**
 * Pricing Page Server Load
 *
 * Loads tier data from unified config for the pricing table.
 */

import {
  TIERS,
  TIER_ORDER,
  formatStorage,
  formatLimit,
  type TierKey,
  type TierConfig,
} from "@autumnsgrove/groveengine/config";

/**
 * Simplified tier data for the pricing page.
 * Extracts only what's needed for display.
 */
interface PricingTier {
  id: TierKey;
  name: string;
  monthlyPrice: number;
  yearlyPrice: number;
  bestFor: string;
  support: string;
  limits: {
    posts: string;
    storage: string;
    themes: string;
    navPages: string;
    commentsPerWeek: string;
  };
  features: {
    blog: boolean;
    meadow: boolean;
    emailForwarding: boolean;
    fullEmail: boolean;
    customDomain: boolean;
    byod: boolean;
    centennial: boolean;
  };
}

function formatThemes(tier: TierConfig): string {
  const themes = tier.limits.themes;
  const hasCustomizer = tier.features.themeCustomizer;
  const hasCustomFonts = tier.features.customFonts;

  if (themes === 0) return "—";
  if (hasCustomFonts) return "Customizer + Community + Fonts";
  if (hasCustomizer) return "Customizer + Community";
  return `${themes} + accent`;
}

function transformTier(config: TierConfig): PricingTier {
  return {
    id: config.id,
    name: config.display.name,
    monthlyPrice: config.pricing.monthlyPrice,
    yearlyPrice: Math.round(config.pricing.yearlyPrice),
    bestFor: config.display.bestFor,
    support: config.support.displayString,
    limits: {
      posts: formatLimit(config.limits.posts),
      storage: formatStorage(config.limits.storage),
      themes: formatThemes(config),
      navPages: formatLimit(config.limits.navPages),
      commentsPerWeek:
        config.limits.commentsPerWeek === Infinity
          ? "Unlimited"
          : `${config.limits.commentsPerWeek}/week`,
    },
    features: {
      blog: config.features.blog,
      meadow: config.features.meadow,
      emailForwarding: config.features.emailForwarding,
      fullEmail: config.features.fullEmail,
      customDomain: config.features.customDomain,
      byod: config.features.byod,
      centennial: config.features.centennial,
    },
  };
}

export function load() {
  const tiers = TIER_ORDER.map((key) => transformTier(TIERS[key]));

  return {
    tiers,
    // Convenience accessors for the template
    free: tiers[0],
    seedling: tiers[1],
    sapling: tiers[2],
    oak: tiers[3],
    evergreen: tiers[4],
  };
}
