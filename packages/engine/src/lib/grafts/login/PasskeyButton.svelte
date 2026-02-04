<script lang="ts">
	/**
	 * PasskeyButton - WebAuthn passkey login button
	 *
	 * Handles the complete passkey authentication flow:
	 * - Triggers WebAuthn ceremony on click
	 * - Shows loading state during authentication
	 * - Displays inline errors for retry
	 * - Redirects on success
	 *
	 * @example
	 * ```svelte
	 * <PasskeyButton returnTo="/dashboard" />
	 * ```
	 *
	 * @example With callbacks
	 * ```svelte
	 * <PasskeyButton
	 *   returnTo="/dashboard"
	 *   onSuccess={(result) => console.log('Authenticated!', result)}
	 *   onError={(error) => console.error('Failed:', error)}
	 * />
	 * ```
	 */

	import type { PasskeyButtonProps, PasskeyAuthResult } from "./types.js";
	import { authenticateWithPasskey } from "./passkey-authenticate.js";
	import GlassButton from "$lib/ui/components/ui/GlassButton.svelte";
	import ProviderIcon from "./ProviderIcon.svelte";

	let {
		returnTo = "/arbor",
		onSuccess,
		onError,
		size = "lg",
		class: className = "",
	}: PasskeyButtonProps = $props();

	let isLoading = $state(false);
	let errorMessage = $state<string | null>(null);

	async function handleClick() {
		if (isLoading) return;

		isLoading = true;
		errorMessage = null;

		try {
			const result = await authenticateWithPasskey({ returnTo });

			if (result.success) {
				// Call success callback if provided
				onSuccess?.(result);

				// Redirect to destination
				if (result.redirectTo) {
					window.location.href = result.redirectTo;
				}
			} else {
				// Show error inline
				errorMessage = result.error || "Passkey sign-in failed";
				onError?.(errorMessage);
			}
		} catch (err) {
			const message =
				err instanceof Error ? err.message : "An unexpected error occurred";
			errorMessage = message;
			onError?.(message);
		} finally {
			isLoading = false;
		}
	}
</script>

<div class="passkey-button-wrapper {className}">
	<GlassButton
		variant="default"
		{size}
		onclick={handleClick}
		disabled={isLoading}
		class="w-full justify-start gap-3"
	>
		{#if isLoading}
			<!-- Loading spinner -->
			<svg
				class="animate-spin h-5 w-5"
				xmlns="http://www.w3.org/2000/svg"
				fill="none"
				viewBox="0 0 24 24"
				aria-hidden="true"
			>
				<circle
					class="opacity-25"
					cx="12"
					cy="12"
					r="10"
					stroke="currentColor"
					stroke-width="4"
				/>
				<path
					class="opacity-75"
					fill="currentColor"
					d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
				/>
			</svg>
			<span>Signing in...</span>
		{:else}
			<ProviderIcon provider="passkey" size={20} />
			<span>Continue with Passkey</span>
		{/if}
	</GlassButton>

	<!-- Inline error message -->
	{#if errorMessage}
		<p
			class="mt-2 text-sm text-red-600 dark:text-red-400 text-center"
			role="alert"
		>
			{errorMessage}
		</p>
	{/if}
</div>
