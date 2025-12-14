/**
 * Logout - Clear all Heartwood session cookies
 */

import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

export const GET: RequestHandler = async ({ url, cookies }) => {
  // Determine if we're in production
  const isProduction =
    url.hostname !== "localhost" && url.hostname !== "127.0.0.1";

  // Cookie deletion options
  const cookieOptions = {
    path: "/",
    ...(isProduction ? { domain: ".grove.place" } : {}),
  };

  // Clear all auth cookies
  cookies.delete("access_token", cookieOptions);
  cookies.delete("refresh_token", cookieOptions);
  cookies.delete("session", cookieOptions);

  // Also clear the old session cookie if it exists (from magic code auth)
  cookies.delete("session_token", { path: "/" });

  redirect(302, "/auth/login");
};
