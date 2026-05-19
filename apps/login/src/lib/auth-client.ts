/**
 * Better Auth Client — Same-Origin Configuration
 *
 * Because this client runs on login.grove.place and the auth proxy
 * is at /api/auth/* on the same origin, we use baseURL: "" (empty string).
 *
 * This means:
 * - authClient.signIn.social() → POST /api/auth/sign-in/social → proxied to Heartwood
 * - All cookies (session) are same-origin → no CORS, no SameSite issues
 */

import { createAuthClient } from "better-auth/client";

export const authClient = createAuthClient({
	baseURL: "", // same-origin — all requests go to /api/auth/* proxy
});
