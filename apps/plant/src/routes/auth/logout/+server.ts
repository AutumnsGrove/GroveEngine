/**
 * Logout — Clear Plant session cookies and redirect to home.
 *
 * Handles both GET (link clicks like "try with different account")
 * and POST (form submissions). Clears the onboarding session cookie,
 * the access token, and the Better Auth session cookies so the user
 * can start fresh.
 */

import { redirect } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";

const COOKIES_TO_CLEAR = [
	"onboarding_id",
	"access_token",
	"better-auth.session_token",
	"__Secure-better-auth.session_token",
];

function clearAndRedirect(cookies: Parameters<RequestHandler>[0]["cookies"]): never {
	for (const name of COOKIES_TO_CLEAR) {
		cookies.delete(name, { path: "/" });
	}
	redirect(302, "/");
}

export const GET: RequestHandler = async ({ cookies }) => {
	clearAndRedirect(cookies);
};

export const POST: RequestHandler = async ({ cookies }) => {
	clearAndRedirect(cookies);
};
