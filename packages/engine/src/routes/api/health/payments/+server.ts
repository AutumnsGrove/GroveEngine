import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types.js";

/**
 * Health check response format
 * Standardized across all Grove services for Sentinel monitoring
 */
interface HealthCheckResponse {
  /** Overall health status */
  status: "healthy" | "degraded" | "unhealthy";
  /** Service identifier */
  service: string;
  /** Individual check results */
  checks: {
    name: string;
    status: "pass" | "fail";
    error?: string;
  }[];
  /** ISO timestamp of check */
  timestamp: string;
}

/**
 * GET /api/health/payments - Payment subsystem health check
 *
 * Shallow health check that verifies:
 * - Stripe API key is configured
 * - Stripe webhook secret is configured
 *
 * Does NOT make external API calls to Stripe.
 * Used by Sentinel for automated monitoring.
 * Unauthenticated - monitoring systems need access.
 */
export const GET: RequestHandler = async ({ platform }) => {
  const checks: HealthCheckResponse["checks"] = [];

  // Check Stripe API key configuration
  const hasStripeKey = !!platform?.env?.STRIPE_SECRET_KEY;
  checks.push({
    name: "stripe_api_key",
    status: hasStripeKey ? "pass" : "fail",
    ...(hasStripeKey ? {} : { error: "Stripe API key not configured" }),
  });

  // Check Stripe webhook secret configuration
  const hasWebhookSecret = !!platform?.env?.STRIPE_WEBHOOK_SECRET;
  checks.push({
    name: "stripe_webhook_secret",
    status: hasWebhookSecret ? "pass" : "fail",
    ...(hasWebhookSecret
      ? {}
      : { error: "Stripe webhook secret not configured" }),
  });

  // Check Stripe publishable key configuration
  const hasPublishableKey = !!platform?.env?.STRIPE_PUBLISHABLE_KEY;
  checks.push({
    name: "stripe_publishable_key",
    status: hasPublishableKey ? "pass" : "fail",
    ...(hasPublishableKey
      ? {}
      : { error: "Stripe publishable key not configured" }),
  });

  // Determine overall status
  const failedChecks = checks.filter((c) => c.status === "fail");
  let status: HealthCheckResponse["status"] = "healthy";

  if (failedChecks.length === checks.length) {
    status = "unhealthy";
  } else if (failedChecks.length > 0) {
    status = "degraded";
  }

  const response: HealthCheckResponse = {
    status,
    service: "grove-payments",
    checks,
    timestamp: new Date().toISOString(),
  };

  // Return appropriate HTTP status based on health
  const httpStatus = status === "unhealthy" ? 503 : 200;

  return json(response, {
    status: httpStatus,
    headers: {
      // No caching - always fresh health data
      "Cache-Control": "no-cache, no-store, must-revalidate",
    },
  });
};
