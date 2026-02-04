import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";

/**
 * Health check response format
 * Standardized across all Grove services for Sentinel monitoring
 */
interface HealthCheckResponse {
  /** Overall health status */
  status: "healthy" | "degraded" | "unhealthy" | "maintenance";
  /** Service identifier */
  service: string;
  /** Reason for current status (optional) */
  reason?: string;
  /** Individual check results */
  checks: {
    name: string;
    status: "pass" | "fail" | "skip";
    error?: string;
  }[];
  /** ISO timestamp of check */
  timestamp: string;
}

interface Check {
  name: string;
  status: "pass" | "fail" | "skip";
  error?: string;
}

/**
 * GET /api/health/payments - Payment subsystem health check
 *
 * Checks Stripe connectivity and configuration:
 * 1. STRIPE_SECRET_KEY is configured
 * 2. Stripe API is reachable (GET /v1/balance - lightweight, read-only)
 * 3. STRIPE_WEBHOOK_SECRET is configured
 *
 * Returns:
 * - HTTP 200 (healthy): All checks pass
 * - HTTP 200 (degraded): API works but missing webhook secret
 * - HTTP 503 (unhealthy): Stripe API unreachable or no secret key
 *
 * Used by Clearing Monitor for automated monitoring.
 * Unauthenticated - monitoring systems need access.
 */
export const GET: RequestHandler = async ({ platform }) => {
  const checks: Check[] = [];
  const env = platform?.env;

  // Check 1: STRIPE_SECRET_KEY exists
  const stripeSecretKey = env?.STRIPE_SECRET_KEY;
  if (!stripeSecretKey) {
    checks.push({
      name: "stripe_secret_key",
      status: "fail",
      error: "STRIPE_SECRET_KEY not configured",
    });
  } else {
    checks.push({ name: "stripe_secret_key", status: "pass" });

    // Check 2: Test Stripe API connectivity (only if we have a key)
    // GET /v1/balance is lightweight, read-only, and fast (~100-200ms)
    try {
      const response = await fetch("https://api.stripe.com/v1/balance", {
        headers: {
          Authorization: `Bearer ${stripeSecretKey}`,
          "Stripe-Version": "2024-11-20.acacia",
        },
      });

      if (response.ok) {
        checks.push({ name: "stripe_api", status: "pass" });
      } else {
        checks.push({
          name: "stripe_api",
          status: "fail",
          error: `HTTP ${response.status}: ${response.statusText}`,
        });
      }
    } catch (e) {
      checks.push({
        name: "stripe_api",
        status: "fail",
        error: e instanceof Error ? e.message : "Unreachable",
      });
    }
  }

  // Check 3: STRIPE_WEBHOOK_SECRET exists
  const webhookSecret = env?.STRIPE_WEBHOOK_SECRET;
  if (webhookSecret) {
    checks.push({ name: "stripe_webhook_secret", status: "pass" });
  } else {
    checks.push({
      name: "stripe_webhook_secret",
      status: "fail",
      error: "STRIPE_WEBHOOK_SECRET not configured",
    });
  }

  // Determine overall status
  const allPass = checks.every((c) => c.status === "pass");
  const apiCheck = checks.find((c) => c.name === "stripe_api");
  const apiPass = apiCheck?.status === "pass";
  const secretKeyPass =
    checks.find((c) => c.name === "stripe_secret_key")?.status === "pass";

  let status: HealthCheckResponse["status"];
  let reason: string | undefined;
  let httpStatus: number;

  if (allPass) {
    status = "healthy";
    httpStatus = 200;
  } else if (apiPass) {
    // API works but missing webhook secret - degraded but functional
    status = "degraded";
    reason = "Stripe API reachable but webhook secret missing";
    httpStatus = 200;
  } else if (!secretKeyPass) {
    status = "unhealthy";
    reason = "Stripe secret key not configured";
    httpStatus = 503;
  } else {
    status = "unhealthy";
    reason = "Stripe API unreachable";
    httpStatus = 503;
  }

  const response: HealthCheckResponse = {
    status,
    service: "grove-payments",
    ...(reason && { reason }),
    checks,
    timestamp: new Date().toISOString(),
  };

  return json(response, {
    status: httpStatus,
    headers: {
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
};
