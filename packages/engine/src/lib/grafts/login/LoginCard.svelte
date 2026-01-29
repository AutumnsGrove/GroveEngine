<script lang="ts">
	/**
	 * LoginCard - Glass-styled container for login UI
	 *
	 * Wraps provider buttons in a GlassCard with optional header and footer
	 * customization via Svelte 5 snippets.
	 *
	 * @example Basic usage
	 * ```svelte
	 * <LoginCard providers={['google']} loginUrl="/auth/login" />
	 * ```
	 *
	 * @example With custom header
	 * ```svelte
	 * <LoginCard providers={['google']} loginUrl="/auth/login">
	 *   {#snippet header()}
	 *     <h2 class="text-xl font-semibold">Welcome back, Wanderer</h2>
	 *   {/snippet}
	 * </LoginCard>
	 * ```
	 */

	import type { LoginCardProps, AuthProvider } from "./types.js";
	import { DEFAULT_PROVIDERS, DEFAULT_LOGIN_URL, isProviderAvailable } from "./config.js";
	import GlassCard from "$lib/ui/components/ui/GlassCard.svelte";
	import ProviderButton from "./ProviderButton.svelte";

	let {
		providers = DEFAULT_PROVIDERS,
		loginUrl = DEFAULT_LOGIN_URL,
		returnTo,
		header,
		footer,
		class: className = "",
	}: LoginCardProps = $props();

	// Filter to only available providers
	const availableProviders = $derived(
		providers.filter((p) => isProviderAvailable(p))
	);

	// Build the login URL for a provider
	function getLoginUrl(provider: AuthProvider): string {
		const params = new URLSearchParams();
		params.set("provider", provider);
		if (returnTo) {
			params.set("return_to", returnTo);
		}
		return `${loginUrl}?${params.toString()}`;
	}
</script>

<GlassCard
	variant="default"
	class="max-w-sm mx-auto {className}"
>
	{#snippet children()}
		<!-- Header slot -->
		{#if header}
			<div class="mb-6 text-center">
				{@render header()}
			</div>
		{/if}

		<!-- Provider buttons -->
		{#if availableProviders.length > 0}
			<div class="space-y-3">
				{#each availableProviders as provider}
					<ProviderButton
						{provider}
						href={getLoginUrl(provider)}
					/>
				{/each}
			</div>
		{:else}
			<p class="text-center text-muted-foreground">
				No login providers available
			</p>
		{/if}

		<!-- Footer slot -->
		{#if footer}
			<div class="mt-6 text-center text-sm text-muted-foreground">
				{@render footer()}
			</div>
		{/if}
	{/snippet}
</GlassCard>
