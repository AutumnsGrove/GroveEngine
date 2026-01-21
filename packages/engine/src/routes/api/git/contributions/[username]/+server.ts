/**
 * Git Contributions API
 *
 * Fetch GitHub contribution calendar via GraphQL.
 * Requires a GitHub token for GraphQL API access.
 *
 * Token resolution (in order):
 * 1. Tenant-specific token from git_dashboard_config (encrypted)
 * 2. Global GITHUB_TOKEN env var (fallback)
 */

import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  fetchContributions,
  contributionsToActivity,
  isValidUsername,
  getCacheKey,
  DEFAULT_GIT_CONFIG,
} from "$lib/git";
import {
  checkRateLimit,
  rateLimitHeaders,
  buildRateLimitKey,
  getClientIP,
  type RateLimitResult,
} from "$lib/server/rate-limits/index.js";
import { safeDecryptToken } from "$lib/server/encryption";

// Rate limit: 60 requests per minute per IP
// Calls GitHub GraphQL API (5000 points/hour, each query ~1-2 points)
// This endpoint is expensive as it fetches full contribution calendar
// KV caching is essential here to avoid hitting GitHub limits
const RATE_LIMIT = { limit: 60, windowSeconds: 60 };

export const GET: RequestHandler = async ({
  params,
  platform,
  url,
  request,
  locals,
}) => {
  const { username } = params;
  const db = platform?.env?.DB;
  const kv = platform?.env?.CACHE_KV;
  const tenantId = locals.tenantId;

  if (!username || !isValidUsername(username)) {
    throw error(400, "Invalid username");
  }

  // Resolve token: tenant config first, then global env fallback
  let token: string | null = null;

  if (db && tenantId) {
    try {
      const config = await db
        .prepare(
          `SELECT github_token_encrypted FROM git_dashboard_config WHERE tenant_id = ?`,
        )
        .bind(tenantId)
        .first<{ github_token_encrypted: string | null }>();

      if (config?.github_token_encrypted) {
        const encryptionKey = platform?.env?.TOKEN_ENCRYPTION_KEY;
        token = await safeDecryptToken(
          config.github_token_encrypted,
          encryptionKey,
        );
      }
    } catch (err) {
      console.warn(
        "Failed to fetch tenant token, falling back to global:",
        err,
      );
    }
  }

  // Fallback to global GITHUB_TOKEN
  if (!token) {
    token = platform?.env?.GITHUB_TOKEN ?? null;
  }

  if (!token) {
    throw error(
      503,
      "GitHub token not configured. Please set up your GitHub token in the dashboard.",
    );
  }

  // Rate limiting by IP (public endpoint)
  let rateLimitResult: RateLimitResult | null = null;
  if (kv) {
    const clientIP = getClientIP(request);
    const { result, response } = await checkRateLimit({
      kv,
      key: buildRateLimitKey("git/contributions", clientIP),
      ...RATE_LIMIT,
    });
    if (response) return response;
    rateLimitResult = result;
  }

  // Check if client wants activity format (for heatmap)
  const format = url.searchParams.get("format") || "raw";

  // Helper to get response headers
  const getHeaders = () =>
    rateLimitResult
      ? rateLimitHeaders(rateLimitResult, RATE_LIMIT.limit)
      : undefined;

  // Check cache first
  const cacheKey = getCacheKey("contributions", username, { format });
  if (kv) {
    try {
      const cached = await kv.get(cacheKey, "json");
      if (cached) {
        return json({ ...cached, cached: true }, { headers: getHeaders() });
      }
    } catch (err) {
      console.warn(
        `[Git Contributions] Cache read failed for ${username}:`,
        err,
      );
    }
  }

  try {
    const contributions = await fetchContributions(username, token);

    let responseData;
    if (format === "activity") {
      // Transform to activity format for heatmap display
      const activity = contributionsToActivity(contributions);
      responseData = {
        activity,
        totalContributions: contributions.totalContributions,
      };
    } else {
      responseData = { contributions };
    }

    // Cache the result
    if (kv) {
      try {
        await kv.put(cacheKey, JSON.stringify(responseData), {
          expirationTtl: DEFAULT_GIT_CONFIG.cacheTtlSeconds,
        });
      } catch (err) {
        console.warn(
          `[Git Contributions] Cache write failed for ${username}:`,
          err,
        );
      }
    }

    return json({ ...responseData, cached: false }, { headers: getHeaders() });
  } catch (err) {
    console.error("Failed to fetch GitHub contributions:", err);
    throw error(502, "Unable to fetch contributions. Please try again later.");
  }
};
