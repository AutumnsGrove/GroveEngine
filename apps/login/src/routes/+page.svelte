<script lang="ts">
	/**
	 * Sign-in Page — login.grove.place
	 *
	 * The unified auth entry point for all Grove properties.
	 * Supports Google OAuth only.
	 *
	 * Auth uses a SvelteKit form action — entirely server-side,
	 * no client JavaScript required.
	 *
	 * Reads ?redirect=URL to know where to send the user after auth.
	 * Defaults to grove.place when no redirect is specified.
	 */

	import { page } from "$app/state";
	import { enhance } from "$app/forms";
	import { validateRedirectUrl } from "$lib/redirect";
	import { Waystone } from "@autumnsgrove/lattice/ui";

	let { form } = $props();

	// Read redirect param from URL
	const redirectTo = $derived(validateRedirectUrl(page.url.searchParams.get("redirect")));

	// Friendly messages for known callback error codes (sent by /callback on failure)
	const CALLBACK_ERRORS: Record<string, string> = {
		no_session: "Your session wasn't created. Please try signing in again.",
	};

	// Read error from URL params — set by /callback when auth succeeds but
	// the session cookie is missing (e.g., proxy cookie handling issue). (#1315)
	const callbackError = $derived.by(() => {
		const error = page.url.searchParams.get("error");
		if (!error) return null;
		return CALLBACK_ERRORS[error] ?? error;
	});

	let googleSubmitting = $state(false);

	// Any in-flight submission disables all buttons to prevent double-submit
	const anyLoading = $derived(googleSubmitting);

	// All error sources funnel into one display slot.
	// Priority: form action errors > callback URL errors
	const displayError = $derived(form?.error ?? callbackError);

</script>

<svelte:head>
	<title>Sign In - Grove</title>
</svelte:head>

<div class="w-full max-w-sm animate-fade-in">
	<!-- Card -->
	<div class="glass-grove rounded-2xl border border-default p-8 shadow-lg">
		<!-- Header -->
		<div class="text-center mb-8">
			<h1 class="text-2xl font-serif text-foreground">Welcome back, Wanderer</h1>
			<p class="mt-2 text-sm text-foreground-muted">Sign in to continue to Grove</p>
		</div>

		<!-- Error -->
		{#if displayError}
			<div
				role="alert"
				class="mb-6 p-3 rounded-lg bg-error/10 dark:bg-error/10 border border-error/30 dark:border-error/30 text-sm text-error dark:text-error text-center"
			>
				{displayError}
			</div>
		{/if}

		<!-- Google — server-side form action, no JS required -->
		<form
			method="POST"
			action="?/google"
			use:enhance={() => {
				googleSubmitting = true;
				return async ({ update }) => {
					googleSubmitting = false;
					await update();
				};
			}}
		>
			<input type="hidden" name="redirect" value={redirectTo} />
			<button type="submit" disabled={anyLoading} class="btn-auth">
				{#if googleSubmitting}
					<div class="spinner"></div>
					<span>Redirecting...</span>
				{:else}
					<svg width="20" height="20" viewBox="0 0 24 24" fill="none" aria-hidden="true">
						<path
							d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
							fill="#4285F4"
						/>
						<path
							d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
							fill="#34A853"
						/>
						<path
							d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
							fill="#FBBC05"
						/>
						<path
							d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
							fill="#EA4335"
						/>
					</svg>
					<span>Continue with Google</span>
				{/if}
			</button>
		</form>

		<!-- Footer -->
		<p class="mt-6 text-center text-xs text-foreground-subtle">
			By signing in, you agree to Grove's
			<a
				href="https://grove.place/knowledge/legal/terms-of-service"
				class="underline hover:text-foreground-muted"
				target="_blank"
				rel="noopener noreferrer">Terms</a
			>
			and
			<a
				href="https://grove.place/knowledge/legal/privacy-policy"
				class="underline hover:text-foreground-muted"
				target="_blank"
				rel="noopener noreferrer">Privacy Policy</a
			>.
			<Waystone
				slug="understanding-your-privacy"
				label="How we protect your data"
				size="sm"
				inline
			/>
		</p>
	</div>
</div>
