/**
 * GroveAuth Login Redirect
 *
 * Uses LoginGraft from @autumnsgrove/groveengine for unified auth.
 * Initiates the OAuth flow by redirecting to GroveAuth with PKCE.
 */

import { createLoginHandler } from "@autumnsgrove/groveengine/grafts/login/server";

export const GET = createLoginHandler({
  clientId: "groveengine",
  authUrl: "https://auth.grove.place",
  defaultProvider: "google",
  defaultReturnTo: "/admin",
});
