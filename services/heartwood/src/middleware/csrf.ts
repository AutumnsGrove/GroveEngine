/**
 * CSRF protection for state-changing routes authenticated by grove_session.
 *
 * grove_session is Domain=.grove.place with SameSite=Lax. SameSite blocks
 * cross-*site* requests, but every <tenant>.grove.place blog is same-site
 * with heartwood.grove.place — SameSite alone does not stop a same-site,
 * cross-origin request from a tenant page (which is user-controlled
 * content). Origin/Referer validation is the actual boundary here.
 */

/**
 * Check whether a request's Origin (or, if absent, Referer) header matches
 * the expected origin exactly. Fails closed: both headers missing is
 * treated as untrusted, since modern browsers always send Origin on
 * state-changing requests — missing both suggests header stripping
 * (privacy extensions, proxies, or an attack) rather than a legitimate
 * same-origin request.
 */
export function isRequestFromTrustedOrigin(request: Request, expectedOrigin: string): boolean {
	const origin = request.headers.get("Origin");
	if (origin) {
		return origin === expectedOrigin;
	}

	const referer = request.headers.get("Referer");
	if (referer) {
		// Exact origin comparison, not startsWith — startsWith would let
		// "https://auth.grove.place.evil.com" pass as a prefix match.
		try {
			return new URL(referer).origin === expectedOrigin;
		} catch {
			return false;
		}
	}

	return false;
}
