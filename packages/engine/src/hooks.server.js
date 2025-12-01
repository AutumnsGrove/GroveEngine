import crypto from 'crypto';
import { parseSessionCookie, verifySession } from "$lib/auth/session.js";
import { generateCSRFToken, validateCSRFToken } from "$lib/utils/csrf.js";
import { error } from "@sveltejs/kit";

export async function handle({ event, resolve }) {
  // Initialize user as null
  event.locals.user = null;

  // Parse session cookie
  const cookieHeader = event.request.headers.get("cookie");
  const sessionToken = parseSessionCookie(cookieHeader);

  if (sessionToken && event.platform?.env?.SESSION_SECRET) {
    const user = await verifySession(
      sessionToken,
      event.platform.env.SESSION_SECRET,
    );
    if (user) {
      event.locals.user = user;
    }
  }

  // Parse or generate CSRF token from cookie
  let csrfToken = null;
  if (cookieHeader) {
    const match = cookieHeader.match(/csrf_token=([^;]+)/);
    if (match) {
      csrfToken = match[1];
    }
  }

  if (!csrfToken) {
    csrfToken = generateCSRFToken();
  }

  event.locals.csrfToken = csrfToken;

  // Auto-validate CSRF on state-changing methods
  if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(event.request.method)) {
    // Skip CSRF validation for login endpoint (it has its own protection)
    if (!event.url.pathname.includes('/auth/')) {
      if (!validateCSRFToken(event.request, csrfToken)) {
        throw error(403, 'Invalid CSRF token');
      }
    }
  }

  const response = await resolve(event);

  // Set CSRF token cookie if it was just generated
  if (!cookieHeader || !cookieHeader.includes('csrf_token=')) {
    const isProduction = event.url.hostname !== 'localhost' && event.url.hostname !== '127.0.0.1';
    const cookieParts = [
      `csrf_token=${csrfToken}`,
      'Path=/',
      'Max-Age=604800', // 7 days
      'SameSite=Lax'
    ];

    if (isProduction) {
      cookieParts.push('Secure');
    }

    response.headers.append('Set-Cookie', cookieParts.join('; '));
  }

  // Add security headers
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'geolocation=(), microphone=(), camera=()');

  // Content-Security-Policy
  // Note: 'unsafe-eval' is required for Mermaid diagram rendering
  // Note: 'unsafe-inline' is used for the theme script in app.html (required for prerendering)
  const csp = [
    "default-src 'self'",
    "script-src 'self' 'unsafe-inline' 'unsafe-eval' https://cdn.jsdelivr.net",
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' https://cdn.autumnsgrove.com data:",
    "font-src 'self'",
    "connect-src 'self' https://api.github.com https://autumnsgrove-sync-posts.m7jv4v7npb.workers.dev https://autumnsgrove-daily-summary.m7jv4v7npb.workers.dev",
    "frame-ancestors 'none'"
  ].join('; ');

  response.headers.set('Content-Security-Policy', csp);

  return response;
}
