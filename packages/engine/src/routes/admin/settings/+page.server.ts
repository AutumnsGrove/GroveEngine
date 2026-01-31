import { fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";
import {
  getGreenhouseTenant,
  getTenantControllableGrafts,
  setTenantGraftOverride,
  resetTenantGraftOverrides,
} from "$lib/feature-flags";
import type { TenantGraftInfo } from "$lib/feature-flags/tenant-grafts";

// List of Wayfinder (platform owner) emails
// The Wayfinder has access to system health and other platform-wide features
const WAYFINDER_EMAILS = ["autumn@grove.place"];

function isWayfinder(email: string | undefined): boolean {
  if (!email) return false;
  return WAYFINDER_EMAILS.includes(email.toLowerCase());
}

export const load: PageServerLoad = async ({ locals, platform }) => {
  const env = platform?.env;

  // Check greenhouse status for this tenant
  let greenhouseStatus: {
    inGreenhouse: boolean;
    enrolledAt?: Date;
    notes?: string;
  } = { inGreenhouse: false };

  // Tenant-controllable grafts (only for greenhouse members)
  let tenantGrafts: TenantGraftInfo[] = [];

  if (env?.DB && env?.CACHE_KV && locals.tenantId) {
    try {
      const tenant = await getGreenhouseTenant(locals.tenantId, {
        DB: env.DB,
        FLAGS_KV: env.CACHE_KV,
      });

      if (tenant && tenant.enabled) {
        greenhouseStatus = {
          inGreenhouse: true,
          enrolledAt: tenant.enrolledAt,
          notes: tenant.notes,
        };

        // Load grafts this tenant can control
        tenantGrafts = await getTenantControllableGrafts(locals.tenantId, {
          DB: env.DB,
          FLAGS_KV: env.CACHE_KV,
        });
      }
    } catch (error) {
      console.error("Failed to check greenhouse status:", error);
    }
  }

  return {
    isWayfinder: isWayfinder(locals.user?.email),
    greenhouseStatus,
    tenantGrafts,
  };
};

export const actions: Actions = {
  /**
   * Toggle a graft on/off for the current tenant
   */
  toggleGraft: async ({ request, locals, platform }) => {
    const env = platform?.env;
    if (!env?.DB || !env?.CACHE_KV) {
      return fail(500, { error: "Database not available" });
    }

    if (!locals.tenantId) {
      return fail(403, { error: "Tenant context required" });
    }

    // Verify greenhouse membership
    const tenant = await getGreenhouseTenant(locals.tenantId, {
      DB: env.DB,
      FLAGS_KV: env.CACHE_KV,
    });

    if (!tenant?.enabled) {
      return fail(403, { error: "Greenhouse membership required" });
    }

    const formData = await request.formData();
    const graftId = formData.get("graftId")?.toString();
    const enabled = formData.get("enabled") === "true";

    if (!graftId) {
      return fail(400, { error: "Graft ID is required" });
    }

    const success = await setTenantGraftOverride(
      graftId,
      locals.tenantId,
      enabled,
      {
        DB: env.DB,
        FLAGS_KV: env.CACHE_KV,
      },
    );

    if (!success) {
      return fail(500, { error: "Failed to update graft preference" });
    }

    return {
      success: true,
      message: enabled
        ? `${graftId} enabled for your site`
        : `${graftId} disabled for your site`,
    };
  },

  /**
   * Reset all graft overrides to defaults
   */
  resetGrafts: async ({ locals, platform }) => {
    const env = platform?.env;
    if (!env?.DB || !env?.CACHE_KV) {
      return fail(500, { error: "Database not available" });
    }

    if (!locals.tenantId) {
      return fail(403, { error: "Tenant context required" });
    }

    // Verify greenhouse membership
    const tenant = await getGreenhouseTenant(locals.tenantId, {
      DB: env.DB,
      FLAGS_KV: env.CACHE_KV,
    });

    if (!tenant?.enabled) {
      return fail(403, { error: "Greenhouse membership required" });
    }

    const count = await resetTenantGraftOverrides(locals.tenantId, {
      DB: env.DB,
      FLAGS_KV: env.CACHE_KV,
    });

    return {
      success: true,
      message:
        count > 0
          ? `Reset ${count} graft preference${count === 1 ? "" : "s"} to defaults`
          : "No custom preferences to reset",
    };
  },
};
