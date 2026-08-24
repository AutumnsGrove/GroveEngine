/**
 * Client-side tenant URL builder
 *
 * A freshly onboarded tenant's site lives at `{subdomain}.grove.place` in
 * production, but in local dev there's no real *.grove.place DNS — wrangler
 * serves each app on its own fixed port, and Aspen simulates the subdomain
 * via a `?subdomain=` query param instead (see
 * apps/aspen/src/hooks.server.ts). Every post-signup page that links out to
 * the new tenant's blog or admin dashboard needs to branch on this, or the
 * link silently points at the live production site instead of the local
 * Aspen instance being tested.
 */

/** True when the current page is being viewed via localhost/127.0.0.1. */
export function isLocalDev(currentUrl: URL): boolean {
	return currentUrl.hostname === "localhost" || currentUrl.hostname === "127.0.0.1";
}

/** Aspen's fixed local dev port, per scripts/dev-stack.sh. */
const LOCAL_ASPEN_ORIGIN = "localhost:5173";

/** Public site URL for a tenant's blog. */
export function buildBlogUrl(subdomain: string, currentUrl: URL): string {
	if (isLocalDev(currentUrl)) {
		return `${currentUrl.protocol}//${LOCAL_ASPEN_ORIGIN}/?subdomain=${subdomain}`;
	}
	return `https://${subdomain}.grove.place`;
}

/**
 * Admin dashboard URL for a tenant's blog.
 * `queryParams` is appended verbatim (e.g. "welcome=true&tour=skipped") —
 * callers own the full query string since it varies by call site.
 */
export function buildAdminUrl(subdomain: string, currentUrl: URL, queryParams: string): string {
	const base = isLocalDev(currentUrl)
		? `${currentUrl.protocol}//${LOCAL_ASPEN_ORIGIN}/arbor?subdomain=${subdomain}`
		: `https://${subdomain}.grove.place/admin`;
	return queryParams ? `${base}${isLocalDev(currentUrl) ? "&" : "?"}${queryParams}` : base;
}
