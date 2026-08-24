import type { PageServerLoad } from "./$types";

/**
 * Surfaces the demo-mode sign-in URL when DEMO_MODE_SECRET is configured —
 * never true in production, so the dev-only button in +page.svelte is
 * inert there. See apps/plant/src/routes/auth/demo/+server.ts.
 */
export const load: PageServerLoad = async ({ platform }) => {
	const demoSecret = platform?.env?.DEMO_MODE_SECRET;
	return {
		demoModeUrl: demoSecret ? `/auth/demo?demo=${demoSecret}` : null,
	};
};
