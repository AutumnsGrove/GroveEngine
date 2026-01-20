/**
 * Pricing Graft Configuration Tests
 *
 * Tests for tier transformation and display helpers.
 */

import { describe, it, expect, beforeEach } from "vitest";
import {
  calculateAnnualSavings,
  transformTier,
  transformAllTiers,
  getDisplayPrice,
  getPriceSuffix,
  formatAnnualAsMonthly,
  DEFAULT_TIER_ORDER,
  DEFAULT_ANNUAL_SAVINGS,
} from "./config.js";
import { TIERS, type TierKey } from "../../config/tiers.js";
import type { PricingTier } from "./types.js";

describe("Pricing Graft Configuration", () => {
  describe("Constants", () => {
    it("exports default tier order matching TIER_ORDER", () => {
      expect(DEFAULT_TIER_ORDER).toEqual([
        "free",
        "seedling",
        "sapling",
        "oak",
        "evergreen",
      ]);
    });

    it("exports default annual savings of 15%", () => {
      expect(DEFAULT_ANNUAL_SAVINGS).toBe(15);
    });
  });

  describe("calculateAnnualSavings", () => {
    it("returns 0 for free tier (monthly price 0)", () => {
      expect(calculateAnnualSavings(0, 0)).toBe(0);
    });

    it("returns 0 for negative monthly price", () => {
      expect(calculateAnnualSavings(-5, 100)).toBe(0);
    });

    it("calculates 15% savings correctly", () => {
      // Monthly $10, Annual $102 (equivalent to $8.50/mo = 15% off)
      const savings = calculateAnnualSavings(10, 102);
      expect(savings).toBe(15);
    });

    it("calculates exact savings for seedling tier", () => {
      const seedling = TIERS.seedling;
      const savings = calculateAnnualSavings(
        seedling.pricing.monthlyPrice,
        seedling.pricing.yearlyPrice,
      );
      // Seedling: $8/mo, $81.60/yr → 15% savings
      expect(savings).toBe(15);
    });

    it("handles 0% savings (same price)", () => {
      expect(calculateAnnualSavings(10, 120)).toBe(0);
    });

    it("handles scenarios where annual is more expensive", () => {
      // If annual divided by 12 is MORE than monthly, savings would be negative
      // But we round, so let's test it
      const savings = calculateAnnualSavings(10, 130);
      expect(savings).toBeLessThan(0);
    });
  });

  describe("transformTier", () => {
    it("transforms free tier correctly", () => {
      const tier = transformTier("free", TIERS.free);

      expect(tier.key).toBe("free");
      expect(tier.name).toBe("Free");
      expect(tier.monthlyPrice).toBe(0);
      expect(tier.annualPrice).toBe(0);
      expect(tier.annualSavings).toBe(0);
      expect(tier.limits.posts).toBe("—");
      expect(tier.limits.storage).toBe("—");
    });

    it("transforms seedling tier with correct limits", () => {
      const tier = transformTier("seedling", TIERS.seedling);

      expect(tier.key).toBe("seedling");
      expect(tier.name).toBe("Seedling");
      expect(tier.monthlyPrice).toBe(8);
      expect(tier.annualSavings).toBe(15);
      expect(tier.limits.posts).toBe("50");
    });

    it("transforms oak tier with unlimited posts", () => {
      const tier = transformTier("oak", TIERS.oak);

      expect(tier.limits.posts).toBe("Unlimited");
    });

    it("includes checkout URLs when provided", () => {
      const tier = transformTier("seedling", TIERS.seedling, {
        monthly: "https://checkout.example.com/monthly",
        annual: "https://checkout.example.com/annual",
      });

      expect(tier.checkoutUrls.monthly).toBe(
        "https://checkout.example.com/monthly",
      );
      expect(tier.checkoutUrls.annual).toBe(
        "https://checkout.example.com/annual",
      );
    });

    it("sets highlight and badge from options", () => {
      const tier = transformTier(
        "seedling",
        TIERS.seedling,
        {},
        { highlight: true, badge: "Most Popular" },
      );

      expect(tier.highlight).toBe(true);
      expect(tier.badge).toBe("Most Popular");
    });

    it("includes tier status", () => {
      const seedling = transformTier("seedling", TIERS.seedling);
      expect(seedling.status).toBe("available");
    });

    it("includes icon from display config", () => {
      const seedling = transformTier("seedling", TIERS.seedling);
      expect(seedling.icon).toBe("sprout");
    });

    it("includes feature availability", () => {
      const seedling = transformTier("seedling", TIERS.seedling);
      expect(seedling.features.blog).toBe(true);
      expect(seedling.features.customDomain).toBe(false);
    });

    it("includes feature strings for display", () => {
      const seedling = transformTier("seedling", TIERS.seedling);
      expect(seedling.featureStrings).toBeDefined();
      expect(Array.isArray(seedling.featureStrings)).toBe(true);
    });

    it("includes support level string", () => {
      const seedling = transformTier("seedling", TIERS.seedling);
      expect(seedling.supportLevel).toBeDefined();
      expect(typeof seedling.supportLevel).toBe("string");
    });
  });

  describe("transformAllTiers", () => {
    it("transforms all tiers in default order", () => {
      const tiers = transformAllTiers();

      expect(tiers).toHaveLength(5);
      expect(tiers[0].key).toBe("free");
      expect(tiers[1].key).toBe("seedling");
      expect(tiers[2].key).toBe("sapling");
      expect(tiers[3].key).toBe("oak");
      expect(tiers[4].key).toBe("evergreen");
    });

    it("applies highlightTier option", () => {
      const tiers = transformAllTiers({ highlightTier: "seedling" });

      const highlighted = tiers.filter((t) => t.highlight);
      expect(highlighted).toHaveLength(1);
      expect(highlighted[0].key).toBe("seedling");
    });

    it("applies badges option", () => {
      const tiers = transformAllTiers({
        badges: {
          seedling: "Start Here",
          oak: "Best Value",
        },
      });

      expect(tiers.find((t) => t.key === "seedling")?.badge).toBe("Start Here");
      expect(tiers.find((t) => t.key === "oak")?.badge).toBe("Best Value");
      expect(tiers.find((t) => t.key === "sapling")?.badge).toBeUndefined();
    });

    it("applies checkoutUrls option", () => {
      const tiers = transformAllTiers({
        checkoutUrls: {
          seedling: {
            monthly: "https://checkout.example.com/seedling-monthly",
          },
          sapling: { annual: "https://checkout.example.com/sapling-annual" },
        } as Record<TierKey, { monthly?: string; annual?: string }>,
      });

      expect(
        tiers.find((t) => t.key === "seedling")?.checkoutUrls.monthly,
      ).toBe("https://checkout.example.com/seedling-monthly");
      expect(tiers.find((t) => t.key === "sapling")?.checkoutUrls.annual).toBe(
        "https://checkout.example.com/sapling-annual",
      );
    });

    it("respects custom tierOrder", () => {
      const tiers = transformAllTiers({
        tierOrder: ["evergreen", "oak", "seedling"],
      });

      expect(tiers).toHaveLength(3);
      expect(tiers[0].key).toBe("evergreen");
      expect(tiers[1].key).toBe("oak");
      expect(tiers[2].key).toBe("seedling");
    });

    it("filters with includeTiers", () => {
      const tiers = transformAllTiers({
        includeTiers: ["seedling", "oak"],
      });

      expect(tiers).toHaveLength(2);
      expect(tiers.map((t) => t.key)).toEqual(["seedling", "oak"]);
    });

    it("filters with excludeTiers", () => {
      const tiers = transformAllTiers({
        excludeTiers: ["free", "evergreen"],
      });

      expect(tiers).toHaveLength(3);
      expect(tiers.map((t) => t.key)).toEqual(["seedling", "sapling", "oak"]);
    });

    it("combines includeTiers and excludeTiers", () => {
      const tiers = transformAllTiers({
        includeTiers: ["seedling", "sapling", "oak"],
        excludeTiers: ["sapling"],
      });

      expect(tiers).toHaveLength(2);
      expect(tiers.map((t) => t.key)).toEqual(["seedling", "oak"]);
    });
  });

  describe("Display Helpers", () => {
    let seedlingTier: PricingTier;
    let freeTier: PricingTier;

    beforeEach(() => {
      seedlingTier = transformTier("seedling", TIERS.seedling);
      freeTier = transformTier("free", TIERS.free);
    });

    describe("getDisplayPrice", () => {
      it("returns 'Free' for free tier", () => {
        expect(getDisplayPrice(freeTier, "monthly")).toBe("Free");
        expect(getDisplayPrice(freeTier, "annual")).toBe("Free");
      });

      it("returns monthly price for monthly period", () => {
        expect(getDisplayPrice(seedlingTier, "monthly")).toBe("$8");
      });

      it("returns rounded annual price for annual period", () => {
        const price = getDisplayPrice(seedlingTier, "annual");
        expect(price).toMatch(/^\$\d+$/);
      });
    });

    describe("getPriceSuffix", () => {
      it("returns '/mo' for monthly", () => {
        expect(getPriceSuffix("monthly")).toBe("/mo");
      });

      it("returns '/yr' for annual", () => {
        expect(getPriceSuffix("annual")).toBe("/yr");
      });
    });

    describe("formatAnnualAsMonthly", () => {
      it("formats annual price as monthly equivalent", () => {
        // $120/year = $10/month
        expect(formatAnnualAsMonthly(120)).toBe("$10.00/mo");
      });

      it("handles decimal results", () => {
        // $100/year = $8.33/month
        expect(formatAnnualAsMonthly(100)).toBe("$8.33/mo");
      });

      it("handles 0", () => {
        expect(formatAnnualAsMonthly(0)).toBe("$0.00/mo");
      });
    });
  });
});
