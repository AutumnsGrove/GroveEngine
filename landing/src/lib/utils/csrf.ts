/**
 * CSRF Protection Utilities
 * Validates requests come from same origin
 */

/**
 * Validate CSRF by checking origin matches host
 * Uses origin-based validation (no token required for public endpoints)
 */
export function validateCSRF(request: Request): boolean {
  // Handle edge cases
  if (!request || typeof request !== "object") {
    return false;
  }

  if (!request.headers || typeof request.headers.get !== "function") {
    return false;
  }

  const origin = request.headers.get("origin");
  // Check X-Forwarded-Host first (set by grove-router proxy), then fall back to host
  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host");

  // Allow same-origin requests
  if (origin) {
    try {
      const originUrl = new URL(origin);

      // Validate protocol (must be http or https)
      if (!["http:", "https:"].includes(originUrl.protocol)) {
        return false;
      }

      const isLocalhost =
        originUrl.hostname === "localhost" ||
        originUrl.hostname === "127.0.0.1";

      // Require HTTPS for non-localhost
      if (!isLocalhost && originUrl.protocol !== "https:") {
        return false;
      }

      // STRICT: Require exact hostname match (same-origin)
      const hostUrl = host ? new URL(`https://${host}`) : null;
      const isSameHost = hostUrl && originUrl.hostname === hostUrl.hostname;

      // Only allow same-host or localhost
      if (!isLocalhost && !isSameHost) {
        return false;
      }
    } catch {
      return false;
    }
  }

  return true;
}
