<script lang="ts">
	/**
	 * ProviderButton - OAuth provider login button using GlassButton
	 *
	 * Renders a consistent, styled button for OAuth provider authentication.
	 * Uses GlassButton for the glassmorphism aesthetic.
	 *
	 * @example
	 * ```svelte
	 * <ProviderButton
	 *   provider="google"
	 *   href="/auth/login?provider=google"
	 * />
	 * ```
	 */

	import type { ProviderButtonProps } from "./types.js";
	import { getProviderName } from "./config.js";
	import GlassButton from "$lib/ui/components/ui/GlassButton.svelte";
	import ProviderIcon from "./ProviderIcon.svelte";

	let {
		provider,
		href,
		size = "lg",
		class: className = "",
	}: ProviderButtonProps = $props();

	const providerName = $derived(getProviderName(provider));
</script>

<GlassButton
	variant="default"
	{size}
	{href}
	class="w-full justify-start gap-3 {className}"
>
	<ProviderIcon {provider} size={20} />
	<span>Continue with {providerName}</span>
</GlassButton>
