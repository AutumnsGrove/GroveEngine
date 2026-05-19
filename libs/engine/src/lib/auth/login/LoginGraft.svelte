<script lang="ts">
	/**
	 * LoginGraft - Login UI component for the Login Hub (login.grove.place)
	 *
	 * IMPORTANT: This component is intended for use ON login.grove.place only,
	 * where auth API calls are same-origin. Engine tenant sites (*.grove.place)
	 * should NOT render this component — they should redirect to login.grove.place
	 * via buildLoginUrl() instead.
	 *
	 * Uses Better Auth for Google OAuth.
	 * POSTs JSON to /api/auth/sign-in/social (same-origin on login.grove.place).
	 *
	 * Supports three variants:
	 * - default: Card with providers and optional header/footer
	 * - compact: Minimal button only (for embedding)
	 * - fullpage: Centered card with logo and branding
	 */

	import { browser } from "$app/environment";
	import type { LoginGraftProps, AuthProvider } from "./types.js";
	import {
		DEFAULT_PROVIDERS,
		GROVEAUTH_URLS,
		isProviderAvailable,
		getProviderName,
	} from "./config.js";
	import GlassCard from "$lib/ui/components/ui/GlassCard.svelte";
	import GroveTerm from "$lib/components/terminology/GroveTerm.svelte";
	import ProviderIcon from "./ProviderIcon.svelte";
	import GlassButton from "$lib/ui/components/ui/GlassButton.svelte";

	let {
		providers = DEFAULT_PROVIDERS,
		returnTo = "/arbor",
		clientId,
		variant = "default",
		header,
		footer,
		logo,
		class: className = "",
	}: LoginGraftProps = $props();

	const availableProviders = $derived(providers.filter((p) => isProviderAvailable(p)));

	let loadingProvider = $state<AuthProvider | null>(null);
	let error = $state<string | null>(null);

	function getCallbackUrl(): string {
		const origin = browser ? window.location.origin : "";
		return `${origin}/auth/callback?returnTo=${encodeURIComponent(returnTo)}`;
	}

	async function signInWithProvider(provider: AuthProvider) {
		if (!browser || loadingProvider) return;

		loadingProvider = provider;
		error = null;

		try {
			const response = await fetch(GROVEAUTH_URLS.socialSignIn, {
				method: "POST",
				credentials: "include",
				headers: {
					"Content-Type": "application/json",
				},
				body: JSON.stringify({
					provider,
					callbackURL: getCallbackUrl(),
				}),
			});

			if (!response.ok) {
				const data = (await response.json().catch(() => ({}))) as { message?: string };
				throw new Error(data.message || `Sign-in failed (${response.status})`);
			}

			const data = (await response.json()) as { url?: string };

			if (data.url) {
				window.location.href = data.url;
			} else {
				throw new Error("No redirect URL returned from auth server");
			}
		} catch (err) {
			error = err instanceof Error ? err.message : "Sign-in failed";
			loadingProvider = null;
		}
	}

	const primaryProvider = $derived(availableProviders[0]);
</script>

{#if variant === "compact"}
	<!-- Compact: Single button only -->
	{#if primaryProvider}
		<GlassButton
			variant="default"
			size="md"
			type="button"
			class={className}
			disabled={loadingProvider !== null}
			onclick={() => signInWithProvider(primaryProvider)}
		>
			<ProviderIcon provider={primaryProvider} size={18} />
			<span>
				{#if loadingProvider === primaryProvider}
					Redirecting...
				{:else}
					Sign in with {getProviderName(primaryProvider)}
				{/if}
			</span>
		</GlassButton>
	{/if}
{:else if variant === "fullpage"}
	<!-- Fullpage: Centered layout with logo and branding -->
	<div class="min-h-[60vh] flex flex-col items-center justify-center px-4 {className}">
		{#if logo}
			<div class="mb-8">
				{@render logo()}
			</div>
		{/if}

		<GlassCard variant="default" class="w-full max-w-sm">
			{#snippet children()}
				<div class="mb-6 text-center">
					{#if header}
						{@render header()}
					{:else}
						<h1 class="text-2xl font-semibold text-foreground">
							Welcome back<GroveTerm term="wanderer" standard="">, Wanderer</GroveTerm>
						</h1>
						<p class="mt-2 text-sm text-muted-foreground">Sign in to continue to Grove</p>
					{/if}
				</div>

				{#if error}
					<div class="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
						{error}
					</div>
				{/if}

				{#if availableProviders.length > 0}
					<div class="space-y-3">
						{#each availableProviders as provider}
							<GlassButton
								variant="default"
								size="lg"
								type="button"
								class="w-full justify-start gap-3"
								disabled={loadingProvider !== null}
								onclick={() => signInWithProvider(provider)}
							>
								<ProviderIcon {provider} size={20} />
								<span>
									{#if loadingProvider === provider}
										Redirecting...
									{:else}
										Continue with {getProviderName(provider)}
									{/if}
								</span>
							</GlassButton>
						{/each}
					</div>
				{:else}
					<p class="text-center text-muted-foreground">No login providers available</p>
				{/if}

				<div class="mt-6 text-center text-sm text-muted-foreground">
					{#if footer}
						{@render footer()}
					{:else}
						<p>Grove &bull; Better Auth</p>
					{/if}
				</div>
			{/snippet}
		</GlassCard>
	</div>
{:else}
	<!-- Default: Card with providers -->
	<GlassCard variant="default" class="max-w-sm mx-auto {className}">
		{#snippet children()}
			{#if header}
				<div class="mb-6 text-center">
					{@render header()}
				</div>
			{/if}

			{#if error}
				<div class="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm text-center">
					{error}
				</div>
			{/if}

			{#if availableProviders.length > 0}
				<div class="space-y-3">
					{#each availableProviders as provider}
						<GlassButton
							variant="default"
							size="lg"
							type="button"
							class="w-full justify-start gap-3"
							disabled={loadingProvider !== null}
							onclick={() => signInWithProvider(provider)}
						>
							<ProviderIcon {provider} size={20} />
							<span>
								{#if loadingProvider === provider}
									Redirecting...
								{:else}
									Continue with {getProviderName(provider)}
								{/if}
							</span>
						</GlassButton>
					{/each}
				</div>
			{:else}
				<p class="text-center text-muted-foreground">No login providers available</p>
			{/if}

			{#if footer}
				<div class="mt-6 text-center text-sm text-muted-foreground">
					{@render footer()}
				</div>
			{/if}
		{/snippet}
	</GlassCard>
{/if}
