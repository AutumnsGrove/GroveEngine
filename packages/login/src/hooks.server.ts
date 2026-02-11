import type { Handle } from "@sveltejs/kit";
import { error } from "@sveltejs/kit";

/**
 * Server hooks for the Login app
 *
 * Handles CSRF origin validation and security headers.
 * Lightweight — no session resolution (login doesn't have a DB binding).
 * Session presence is checked per-route where needed.
 */

/** Origins allowed to make state-changing requests */
const ALLOWED_ORIGINS = [
  "https://login.grove.place",
  "http://localhost:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5173",
];

export const handle: Handle = async ({ event, resolve }) => {
  // CSRF validation for state-changing methods
  if (["POST", "PUT", "DELETE", "PATCH"].includes(event.request.method)) {
    const origin = event.request.headers.get("origin");
    if (!origin || !ALLOWED_ORIGINS.includes(origin)) {
      console.error(
        `[CSRF] Blocked ${event.request.method} ${event.url.pathname}`,
        JSON.stringify({
          origin,
          host: event.request.headers.get("host"),
        }),
      );
      throw error(403, "Cross-site request blocked");
    }
  }

  const response = await resolve(event);

  // Security headers
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "geolocation=(), microphone=(), camera=()",
  );
  response.headers.set(
    "Strict-Transport-Security",
    "max-age=31536000; includeSubDomains; preload",
  );

  // CSP for auth hub — needs publickey-credentials for WebAuthn
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline'",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data:",
    "connect-src 'self' https://*.grove.place",
    "frame-ancestors 'none'",
    "upgrade-insecure-requests",
  ].join("; ");

  response.headers.set("Content-Security-Policy", csp);

  return response;
};
