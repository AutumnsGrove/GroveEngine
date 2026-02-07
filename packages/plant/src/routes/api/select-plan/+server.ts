/**
 * API: Select Plan
 *
 * POST /api/select-plan
 *
 * JSON API endpoint for plan selection during onboarding.
 * Mirrors the form action from /plans but returns JSON for client-side navigation.
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  transformAllTiers,
  type PricingTier,
} from "@autumnsgrove/groveengine/grafts/pricing";
import { PAID_TIERS, type PaidTierKey } from "@autumnsgrove/groveengine/config";
import { PLANT_ERRORS, logPlantError } from "$lib/errors";

// Valid billing cycles for database storage
const VALID_BILLING_CYCLES = ["monthly", "yearly"] as const;
type BillingCycle = (typeof VALID_BILLING_CYCLES)[number];

// Transform tiers once at module load (paid tiers only)
const tiers = transformAllTiers({ excludeTiers: ["free"] });

function isValidPlanId(id: string): id is PaidTierKey {
  return PAID_TIERS.includes(id as PaidTierKey);
}

function isPlanAvailable(id: string): boolean {
  const tier = tiers.find((t: PricingTier) => t.key === id);
  return tier?.status === "available";
}

function getTierByKey(id: string): PricingTier | undefined {
  return tiers.find((t: PricingTier) => t.key === id);
}

export const POST: RequestHandler = async ({ request, cookies, platform }) => {
  let body: {
    plan?: string;
    billingCycle?: string;
  };

  try {
    body = await request.json();
  } catch {
    return json({ error: "Invalid request" }, { status: 400 });
  }

  const plan = body.plan?.trim();
  const billingCycle = body.billingCycle || "monthly";

  // Validate plan
  if (!plan || !isValidPlanId(plan)) {
    return json({ error: "Please select a valid plan" }, { status: 400 });
  }

  // Check plan availability
  if (!isPlanAvailable(plan)) {
    const selectedTier = getTierByKey(plan);
    const statusMessage =
      selectedTier?.status === "coming_soon"
        ? "This plan is coming soon and not yet available."
        : "This plan is not currently available.";
    return json({ error: statusMessage }, { status: 400 });
  }

  if (!VALID_BILLING_CYCLES.includes(billingCycle as BillingCycle)) {
    return json({ error: "Invalid billing cycle" }, { status: 400 });
  }

  // Get onboarding ID from cookie
  const onboardingId = cookies.get("onboarding_id");
  if (!onboardingId) {
    logPlantError(PLANT_ERRORS.COOKIE_ERROR, {
      path: "/api/select-plan",
      detail: "Missing onboarding_id cookie",
    });
    return json(
      { error: "Session expired. Please sign in again." },
      { status: 401 },
    );
  }

  const db = platform?.env?.DB;
  if (!db) {
    logPlantError(PLANT_ERRORS.DB_UNAVAILABLE, { path: "/api/select-plan" });
    return json({ error: "Service temporarily unavailable" }, { status: 503 });
  }

  // Update onboarding record with selected plan
  try {
    await db
      .prepare(
        `UPDATE user_onboarding
         SET plan_selected = ?,
             plan_billing_cycle = ?,
             plan_selected_at = unixepoch(),
             updated_at = unixepoch()
         WHERE id = ?`,
      )
      .bind(plan, billingCycle, onboardingId)
      .run();
  } catch (err) {
    logPlantError(PLANT_ERRORS.ONBOARDING_UPDATE_FAILED, {
      path: "/api/select-plan",
      detail: `UPDATE user_onboarding plan for id=${onboardingId}`,
      cause: err,
    });
    return json(
      { error: "Unable to save selection. Please try again." },
      { status: 500 },
    );
  }

  console.log(
    `[Select Plan API] Saved plan=${plan} cycle=${billingCycle} for ${onboardingId.slice(0, 8)}...`,
  );

  return json({ success: true, redirect: "/checkout" });
};
