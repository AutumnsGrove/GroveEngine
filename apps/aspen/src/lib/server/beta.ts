/**
 * Whether this request is being served by Aspen's beta deployment.
 *
 * Two distinct signals, unified so nothing has to hand-roll this check:
 *
 * - Remote: `locals.isBeta`, set in hooks.server.ts by stripBetaLabel() when
 *   the hostname is `<tenant>-beta.grove.place` (routed to the separate
 *   grove-aspen-beta Worker — see docs/plans/planned/beta-environment-architecture.md).
 * - Local: there's no real "-beta.grove.place" hostname to check against on
 *   localhost, but the git branch checked out IS what's actually running, so
 *   we treat being on the beta branch locally as equivalent to the real beta
 *   deployment. __GIT_BRANCH__ is baked in at build time (see vite.config.ts);
 *   gating on "localhost" keeps this from ever mattering on a real deployment.
 *
 * Note: this is unrelated to arbor/+layout.server.ts's own `isBeta` field,
 * which tracks comped beta-invite enrollment for a tenant — a different
 * concept that happens to share the name. Anything reading `data.isBeta`
 * under /arbor/** is getting that one, not this one.
 */
export function isBetaDeployment(locals: App.Locals, url: URL): boolean {
	const isLocalBetaBranch = url.hostname === "localhost" && __GIT_BRANCH__ === "beta";
	return (locals.isBeta ?? false) || isLocalBetaBranch;
}
