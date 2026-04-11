<script lang="ts">
	import { featureIcons } from "@autumnsgrove/prism/icons";
	import GlassButton from "$lib/ui/components/ui/GlassButton.svelte";
	import { subscriptionsStore } from "$lib/ui/stores/subscriptions.svelte";

	interface Props {
		/** The tenant ID of the grove to subscribe to */
		tenantId: string;
		/** Display name of the grove owner */
		name: string;
	}

	let { tenantId, name }: Props = $props();

	let error = $state("");
	let isSub = $derived(subscriptionsStore.isSubscribed(tenantId));
	let isLoading = $derived(subscriptionsStore.isLoading(tenantId));

	// Check subscription status on mount
	$effect(() => {
		if (tenantId) {
			subscriptionsStore.checkAndCache(tenantId);
		}
	});

	// Clear error after a delay
	$effect(() => {
		if (!error) return;
		const timeout = setTimeout(() => (error = ""), 4000);
		return () => clearTimeout(timeout);
	});

	async function handleClick() {
		error = "";
		let success: boolean;
		if (isSub) {
			success = await subscriptionsStore.unsubscribe(tenantId);
		} else {
			success = await subscriptionsStore.subscribe(tenantId);
		}
		if (!success) {
			error = isSub ? "Could not unsubscribe. Try again." : "Could not subscribe. Try again.";
		}
	}

	let label = $derived(
		isLoading
			? "Loading..."
			: isSub
				? `Unsubscribe from ${name} emails`
				: `Subscribe to ${name} emails`,
	);
	let displayText = $derived(isSub ? "Subscribed" : "Subscribe");
	let variant = $derived<"accent" | "outline">(isSub ? "outline" : "accent");
</script>

<span class="subscribe-button-inline">
	<GlassButton
		{variant}
		size="sm"
		disabled={isLoading}
		onclick={handleClick}
		aria-label={label}
		aria-pressed={isSub}
		class="subscribe-pill"
	>
		{#if isLoading}
			<span class="subscribe-spinner" aria-hidden="true"></span>
		{:else}
			<featureIcons.mail size={16} aria-hidden="true" />
		{/if}
		<span class="subscribe-text">{displayText}</span>
	</GlassButton>

	{#if error}
		<span class="subscribe-error" role="alert" aria-live="assertive">
			{error}
		</span>
	{/if}
</span>

<style>
	.subscribe-button-inline {
		display: inline-flex;
		align-items: center;
		position: relative;
	}

	.subscribe-button-inline :global(.subscribe-pill) {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		min-height: 44px;
		min-width: 44px;
		padding: 0.5rem 1rem;
		border-radius: 9999px;
		font-size: 0.875rem;
		font-weight: 500;
		transition: all 0.2s ease;
		cursor: pointer;
	}

	.subscribe-text {
		line-height: 1;
	}

	.subscribe-spinner {
		width: 16px;
		height: 16px;
		border: 2px solid currentColor;
		border-top-color: transparent;
		border-radius: 50%;
		animation: subscribe-spin 0.6s linear infinite;
	}

	.subscribe-error {
		position: absolute;
		top: calc(100% + 0.5rem);
		left: 50%;
		transform: translateX(-50%);
		background: hsl(var(--destructive, 0 84% 60%));
		color: white;
		padding: 0.375rem 0.75rem;
		border-radius: 0.5rem;
		font-size: 0.8125rem;
		white-space: nowrap;
		box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
	}

	@keyframes subscribe-spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.subscribe-spinner {
			animation: subscribe-pulse 1s ease-in-out infinite;
		}

		@keyframes subscribe-pulse {
			0%,
			100% {
				opacity: 0.4;
			}
			50% {
				opacity: 1;
			}
		}

		.subscribe-button-inline :global(.subscribe-pill) {
			transition: none;
		}
	}
</style>
