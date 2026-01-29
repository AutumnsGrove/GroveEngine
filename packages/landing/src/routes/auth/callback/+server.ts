/**
 * OAuth Callback - Handle GroveAuth authentication response
 *
 * Uses LoginGraft from @autumnsgrove/groveengine for unified auth.
 * Exchanges authorization code for tokens and sets cross-subdomain cookies.
 */

import { createCallbackHandler } from "@autumnsgrove/groveengine/grafts/login/server";

export const GET = createCallbackHandler({
  clientId: "groveengine",
  clientSecretEnvVar: "GROVEAUTH_CLIENT_SECRET",
  authApiUrl: "https://auth-api.grove.place",
  defaultReturnTo: "https://admin.grove.place",
  cookieDomain: ".grove.place",
  rateLimitKvKey: "CACHE_KV",
});
