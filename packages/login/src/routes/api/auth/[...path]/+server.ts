/**
 * Auth API Proxy — Heartwood Service Binding
 *
 * Catch-all route that proxies all /api/auth/* requests to Heartwood
 * via Cloudflare service binding (Worker-to-Worker, no public internet).
 *
 * CRITICAL: This proxy forwards ALL response headers from Heartwood,
 * including Set-Cookie. This is what makes passkey registration work —
 * the challenge cookie (better-auth-passkey) must reach the browser.
 *
 * By running on login.grove.place (same origin as the auth UI pages),
 * all cookies are first-party and WebAuthn origin matches automatically.
 */

import type { RequestHandler } from "./$types";

const DEFAULT_AUTH_URL = "https://auth-api.grove.place";

/** Headers to skip when proxying (hop-by-hop or set by the platform) */
const SKIP_REQUEST_HEADERS = new Set([
  "host",
  "connection",
  "transfer-encoding",
  "keep-alive",
  "upgrade",
]);

/** Response headers that should NOT be forwarded to the client */
const SKIP_RESPONSE_HEADERS = new Set(["transfer-encoding", "connection"]);

/**
 * Proxy a request to Heartwood and return the full response,
 * including all headers (especially Set-Cookie).
 *
 * CSRF note: State-changing methods (POST, PUT, DELETE, PATCH) are protected
 * by origin validation in hooks.server.ts, which runs for every request before
 * this handler. SvelteKit hooks cannot be bypassed — they are the entry point.
 */
async function proxyToHeartwood({
  request,
  params,
  cookies,
  platform,
}: Parameters<RequestHandler>[0]): Promise<Response> {
  if (!platform?.env?.AUTH) {
    return new Response(JSON.stringify({ error: "Auth service unavailable" }), {
      status: 503,
      headers: { "Content-Type": "application/json" },
    });
  }

  // Validate path: strict allowlist of characters permitted in better-auth routes.
  // Only letters, digits, hyphens, and slashes — rejects encoded traversals (%2e),
  // null bytes, dots, and anything else that could escape /api/auth/ boundaries.
  // Defense-in-depth: SvelteKit normalizes URL encoding and the service binding
  // is internal (Worker-to-Worker), but we don't rely on either assumption.
  const path = params.path || "";
  if (!path || !/^[a-zA-Z0-9\-/]+$/.test(path)) {
    return new Response(JSON.stringify({ error: "Invalid path" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }

  const authBaseUrl = platform.env.GROVEAUTH_URL || DEFAULT_AUTH_URL;
  const targetUrl = `${authBaseUrl}/api/auth/${path}`;

  // Forward cookies for session identification.
  // Reconstructed as simple name=value pairs — security attributes (HttpOnly,
  // Secure, SameSite) are intentionally omitted because this is a server-to-server
  // request via Cloudflare service binding (Worker-to-Worker, never public internet).
  // Heartwood only needs the cookie values for session lookup.
  const cookieHeader = cookies
    .getAll()
    .map((c) => `${c.name}=${c.value}`)
    .join("; ");

  // Build proxied request headers
  const proxyHeaders = new Headers();
  proxyHeaders.set("Cookie", cookieHeader);

  // Forward relevant request headers
  for (const [key, value] of request.headers.entries()) {
    if (!SKIP_REQUEST_HEADERS.has(key.toLowerCase())) {
      proxyHeaders.set(key, value);
    }
  }

  // Perform the service binding fetch
  const response = await platform.env.AUTH.fetch(targetUrl, {
    method: request.method,
    headers: proxyHeaders,
    body: ["GET", "HEAD"].includes(request.method)
      ? undefined
      : await request.arrayBuffer(),
  });

  // Forward ALL response headers, including Set-Cookie (critical for passkey challenge)
  // Skip hop-by-hop headers that shouldn't be forwarded
  const responseHeaders = new Headers();
  response.headers.forEach((value, key) => {
    if (!SKIP_RESPONSE_HEADERS.has(key.toLowerCase())) {
      responseHeaders.append(key, value);
    }
  });

  return new Response(response.body, {
    status: response.status,
    statusText: response.statusText,
    headers: responseHeaders,
  });
}

export const GET: RequestHandler = proxyToHeartwood;
export const POST: RequestHandler = proxyToHeartwood;
export const PUT: RequestHandler = proxyToHeartwood;
export const DELETE: RequestHandler = proxyToHeartwood;
export const PATCH: RequestHandler = proxyToHeartwood;
