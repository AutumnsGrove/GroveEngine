/**
 * OAuth Login - Start authentication flow via GroveAuth
 *
 * Uses LoginGraft from @autumnsgrove/groveengine for unified auth.
 * Redirects to GroveAuth with PKCE for secure authentication.
 */

import { createLoginHandler } from "@autumnsgrove/groveengine/grafts/login/server";

export const GET = createLoginHandler({
  clientId: "groveengine",
  authUrl: "https://auth.grove.place",
  defaultProvider: "google",
  defaultReturnTo: "https://admin.grove.place",
});
