import { redirect } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

/**
 * Success Page Server Load
 *
 * Handles the post-checkout success page for Stripe onboarding.
 * Verifies the user's onboarding state and renders the success view.
 */
export const load: PageServerLoad = async ({ parent }) => {
	const { user, onboarding } = await parent();

	// Redirect if not authenticated
	if (!user) {
		redirect(302, "/");
	}

	// Redirect if profile not completed
	if (!onboarding?.profileCompleted) {
		redirect(302, "/profile");
	}

	// Redirect if no plan selected
	if (!onboarding?.planSelected) {
		redirect(302, "/plans");
	}

	return {
		user,
		onboarding,
	};
};
