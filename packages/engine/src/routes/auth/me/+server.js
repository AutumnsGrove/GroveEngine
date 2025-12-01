import { json } from "@sveltejs/kit";
import { parseSessionCookie, verifySession } from "$lib/auth/session.js";

export async function GET({ request, platform }) {
  const cookieHeader = request.headers.get("cookie");
  const sessionToken = parseSessionCookie(cookieHeader);

  if (!sessionToken) {
    return json({ authenticated: false }, { status: 401 });
  }

  const secret = platform?.env?.SESSION_SECRET;
  if (!secret) {
    return json(
      { authenticated: false, error: "Server configuration error" },
      { status: 500 },
    );
  }

  const user = await verifySession(sessionToken, secret);

  if (!user) {
    return json({ authenticated: false }, { status: 401 });
  }

  return json({
    authenticated: true,
    user: {
      email: user.email,
    },
  });
}
