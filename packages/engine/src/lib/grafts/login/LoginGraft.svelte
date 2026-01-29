<script lang="ts">
	/**
	 * LoginGraft - Unified login component for all Grove properties
	 *
	 * Main orchestrator component that provides consistent login UI.
	 * Supports three variants:
	 * - default: Card with providers and optional header/footer
	 * - compact: Minimal button only (for embedding)
	 * - fullpage: Centered card with logo and branding
	 *
	 * @example Default variant with header
	 * ```svelte
	 * <LoginGraft providers={['google']} returnTo="/dashboard">
	 *   {#snippet header()}
	 *     <h1 class="text-2xl font-bold">Welcome back, Wanderer</h1>
	 *   {/snippet}
	 * </LoginGraft>
	 * ```
	 *
	 * @example Compact variant for embedding
	 * ```svelte
	 * <LoginGraft variant="compact" providers={['google']} />
	 * ```
	 *
	 * @example Fullpage variant with logo
	 * ```svelte
	 * <LoginGraft variant="fullpage" providers={['google']}>
	 *   {#snippet logo()}
	 *     <GroveLogo class="w-16 h-16" />
	 *   {/snippet}
	 * </LoginGraft>
	 * ```
	 */

	import type { LoginGraftProps, AuthProvider } from "./types.js";
	import {
		DEFAULT_PROVIDERS,
		DEFAULT_LOGIN_URL,
		isProviderAvailable,
		getProviderName,
	} from "./config.js";
	import GlassCard from "$lib/ui/components/ui/GlassCard.svelte";
	import ProviderButton from "./ProviderButton.svelte";
	import PasskeyButton from "./PasskeyButton.svelte";
	import ProviderIcon from "./ProviderIcon.svelte";
	import GlassButton from "$lib/ui/components/ui/GlassButton.svelte";

	let {
		providers = DEFAULT_PROVIDERS,
		returnTo,
		clientId,
		variant = "default",
		loginUrl = DEFAULT_LOGIN_URL,
		header,
		footer,
		logo,
		class: className = "",
	}: LoginGraftProps = $props();

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
		if (clientId) {
			params.set("client_id", clientId);
		}
		return `${loginUrl}?${params.toString()}`;
	}

	// For compact variant, use first available provider
	const primaryProvider = $derived(availableProviders[0]);
</script>

{#if variant === "compact"}
	<!-- Compact: Single button only -->
	{#if primaryProvider}
		{#if primaryProvider === "passkey"}
			<!-- Passkey uses its own button with WebAuthn ceremony -->
			<PasskeyButton {returnTo} size="md" class={className} />
		{:else}
			<GlassButton
				variant="default"
				size="md"
				href={getLoginUrl(primaryProvider)}
				class={className}
			>
				<ProviderIcon provider={primaryProvider} size={18} />
				<span>Sign in with {getProviderName(primaryProvider)}</span>
			</GlassButton>
		{/if}
	{/if}
{:else if variant === "fullpage"}
	<!-- Fullpage: Centered layout with logo and branding -->
	<div class="min-h-[60vh] flex flex-col items-center justify-center px-4 {className}">
		<!-- Logo area -->
		{#if logo}
			<div class="mb-8">
				{@render logo()}
			</div>
		{/if}

		<!-- Login card -->
		<GlassCard variant="default" class="w-full max-w-sm">
			{#snippet children()}
				<!-- Header slot or default -->
				<div class="mb-6 text-center">
					{#if header}
						{@render header()}
					{:else}
						<h1 class="text-2xl font-semibold text-foreground">
							Welcome back, Wanderer
						</h1>
						<p class="mt-2 text-sm text-muted-foreground">
							Sign in to continue to Grove
						</p>
					{/if}
				</div>

				<!-- Provider buttons -->
				{#if availableProviders.length > 0}
					<div class="space-y-3">
						{#each availableProviders as provider}
							{#if provider === "passkey"}
								<!-- Passkey uses its own button with WebAuthn ceremony -->
								<PasskeyButton {returnTo} />
							{:else}
								<ProviderButton
									{provider}
									href={getLoginUrl(provider)}
								/>
							{/if}
						{/each}
					</div>
				{:else}
					<p class="text-center text-muted-foreground">
						No login providers available
					</p>
				{/if}

				<!-- Footer slot or default -->
				<div class="mt-6 text-center text-sm text-muted-foreground">
					{#if footer}
						{@render footer()}
					{:else}
						<p>Grove • Heartwood Auth</p>
					{/if}
				</div>
			{/snippet}
		</GlassCard>
	</div>
{:else}
	<!-- Default: Card with providers -->
	<GlassCard variant="default" class="max-w-sm mx-auto {className}">
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
						{#if provider === "passkey"}
							<!-- Passkey uses its own button with WebAuthn ceremony -->
							<PasskeyButton {returnTo} />
						{:else}
							<ProviderButton
								{provider}
								href={getLoginUrl(provider)}
							/>
						{/if}
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
{/if}
