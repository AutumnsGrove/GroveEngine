/**
 * CSRF Protection Utilities
 * Validates requests come from same origin
 */

/**
 * Generate cryptographically secure CSRF token
 */
export function generateCSRFToken(): string {
  return crypto.randomUUID();
}

/**
 * Validate CSRF token from request against session token
 */
export function validateCSRFToken(
  request: Request,
  sessionToken: string,
): boolean {
  if (!sessionToken) return false;

  const headerToken = request.headers.get("x-csrf-token");
  const bodyToken = request.headers.get("csrf-token"); // fallback

  if (!headerToken && !bodyToken) return false;

  return headerToken === sessionToken || bodyToken === sessionToken;
}

/**
 * Validate CSRF token from request headers (origin-based fallback)
 */
export function validateCSRF(request: Request, debug = false): boolean {
  // Handle edge cases
  if (!request || typeof request !== "object") {
    if (debug) console.log("[validateCSRF] Invalid request object");
    return false;
  }

  if (!request.headers || typeof request.headers.get !== "function") {
    if (debug) console.log("[validateCSRF] Invalid headers");
    return false;
  }

  const origin = request.headers.get("origin");
  // Check X-Forwarded-Host first (set by grove-router proxy), then fall back to host
  const host =
    request.headers.get("x-forwarded-host") || request.headers.get("host");

  if (debug) {
    console.log("[validateCSRF] Checking:", { origin, host });
  }

  // Allow same-origin requests
  if (origin) {
    try {
      const originUrl = new URL(origin);

      // Validate protocol (must be http or https)
      if (!["http:", "https:"].includes(originUrl.protocol)) {
        if (debug) console.log("[validateCSRF] Invalid protocol");
        return false;
      }

      const isLocalhost =
        originUrl.hostname === "localhost" ||
        originUrl.hostname === "127.0.0.1";

      // Require HTTPS for non-localhost
      if (!isLocalhost && originUrl.protocol !== "https:") {
        if (debug) console.log("[validateCSRF] Non-HTTPS for non-localhost");
        return false;
      }

      // STRICT: Require exact origin match (same-origin policy)
      // This prevents cross-tenant CSRF attacks where tenant1.grove.place
      // could make requests to tenant2.grove.place
      const hostUrl = host ? new URL(`https://${host}`) : null;
      const isSameHost = hostUrl && originUrl.hostname === hostUrl.hostname;

      // Check port match - same-origin policy requires protocol + host + port
      // Default ports: 443 for https, 80 for http (empty string in URL.port)
      const originPort =
        originUrl.port || (originUrl.protocol === "https:" ? "443" : "80");
      const hostPort = hostUrl?.port || "443"; // host header typically omits default port
      const isSamePort = originPort === hostPort;

      if (debug) {
        console.log("[validateCSRF] Host comparison:", {
          originHostname: originUrl.hostname,
          hostHostname: hostUrl?.hostname,
          isSameHost,
          originPort,
          hostPort,
          isSamePort,
        });
      }

      // Only allow same-host AND same-port, or localhost
      if (!isLocalhost && (!isSameHost || !isSamePort)) {
        if (debug) console.log("[validateCSRF] Host/port mismatch - REJECTING");
        return false;
      }
    } catch (e) {
      if (debug) console.log("[validateCSRF] Error:", e);
      return false;
    }
  }

  if (debug) console.log("[validateCSRF] PASSED");
  return true;
}
