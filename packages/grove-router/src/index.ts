/**
 * Grove Router Worker
 *
 * Proxies wildcard subdomain requests (*.grove.place) to the groveengine Pages project.
 * This is needed because Cloudflare Pages doesn't support wildcard custom domains.
 *
 * The Worker:
 * 1. Catches all *.grove.place requests
 * 2. Excludes subdomains that have their own Pages/Workers
 * 3. Proxies to groveengine.pages.dev with X-Forwarded-Host header
 */

export interface Env {
  // No bindings needed - pure proxy worker
}

/**
 * Subdomains that should NOT be proxied.
 * These have their own Cloudflare Pages custom domains or Workers.
 */
const EXCLUDED_SUBDOMAINS = new Set([
  "auth", // groveauth-frontend Pages
  "admin", // groveauth-frontend Pages
  "login", // groveauth-frontend Pages
  "domains", // grove-domains Pages
  "cdn", // grove-landing Pages (R2)
  "music", // grovemusic Pages
  "scout", // scout Worker
  "auth-api", // groveauth Worker
  "www", // Redirect handled in hooks
]);

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const host = url.hostname;

    // Extract subdomain from hostname
    const parts = host.split(".");

    // Check if this is a *.grove.place request
    if (!host.endsWith(".grove.place") || parts.length < 3) {
      // Not a subdomain request or wrong domain - this shouldn't happen
      // if routes are configured correctly
      return new Response("Invalid request", { status: 400 });
    }

    const subdomain = parts[0];

    // Skip excluded subdomains - they have their own routes
    // This is a safety net; HTTP Routes should prevent these from reaching this worker
    if (EXCLUDED_SUBDOMAINS.has(subdomain)) {
      return new Response("This subdomain is handled by another service", {
        status: 404,
      });
    }

    // Proxy to groveengine Pages
    const targetUrl = new URL(request.url);
    targetUrl.hostname = "groveengine.pages.dev";

    // Create new headers, preserving original headers
    const headers = new Headers(request.headers);

    // Add X-Forwarded-Host so the Pages app knows the original hostname
    headers.set("X-Forwarded-Host", host);

    // Create the proxy request
    const proxyRequest = new Request(targetUrl.toString(), {
      method: request.method,
      headers: headers,
      body: request.body,
      redirect: "manual", // Don't follow redirects, pass them through
    });

    try {
      const response = await fetch(proxyRequest);

      // Return response as-is (preserving headers, status, etc.)
      return new Response(response.body, {
        status: response.status,
        statusText: response.statusText,
        headers: response.headers,
      });
    } catch (error) {
      console.error("Proxy error:", error);
      return new Response("Proxy error", { status: 502 });
    }
  },
};
