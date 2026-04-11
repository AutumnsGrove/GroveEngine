<script lang="ts">
	import { authIcons, featureIcons } from "@autumnsgrove/prism/icons";
	import { friendsStore } from "$lib/ui/stores/friends.svelte";
	import { subscriptionsStore } from "$lib/ui/stores/subscriptions.svelte";
	import { api } from "$lib/utils/api";
	import type { VisitingGrove } from "./types";

	interface Props {
		grove: VisitingGrove;
	}

	let { grove }: Props = $props();
	let adding = $state(false);
	let status = $state<"idle" | "added" | "error">("idle");

	let isSubLoading = $derived(subscriptionsStore.isLoading(grove.tenantId));
	let isSub = $derived(subscriptionsStore.isSubscribed(grove.tenantId));

	// Check subscription status on mount
	$effect(() => {
		if (grove.tenantId) {
			subscriptionsStore.checkAndCache(grove.tenantId);
		}
	});

	async function addFriend() {
		if (adding) return;
		adding = true;
		status = "idle";

		try {
			const result = await api.post<{
				friend: { tenantId: string; name: string; subdomain: string; source: string };
			}>("/api/friends", { friendSubdomain: grove.subdomain });
			if (result?.friend) {
				friendsStore.addFriend(result.friend);
				status = "added";
			}
		} catch {
			status = "error";
		} finally {
			adding = false;
		}
	}

	async function toggleSubscription() {
		if (isSub) {
			await subscriptionsStore.unsubscribe(grove.tenantId);
		} else {
			await subscriptionsStore.subscribe(grove.tenantId);
		}
	}
</script>

<div class="visiting-card">
	<div class="visiting-info">
		<span class="visiting-label">You're visiting</span>
		<span class="visiting-name">{grove.name}</span>
	</div>
	<div class="visiting-actions">
		<button
			type="button"
			class="visiting-add"
			disabled={adding}
			onclick={addFriend}
			aria-label={adding ? `Adding ${grove.name}…` : `Add ${grove.name} as a friend`}
			aria-busy={adding}
		>
			{#if adding}
				<span class="visiting-spinner" aria-hidden="true"></span>
			{:else}
				<authIcons.userPlus size={14} aria-hidden="true" />
			{/if}
			<span>Add Friend</span>
		</button>
		<button
			type="button"
			class="visiting-subscribe"
			class:subscribed={isSub}
			disabled={isSubLoading}
			onclick={toggleSubscription}
			aria-label={isSub
				? `Unsubscribe from ${grove.name} emails`
				: `Get email updates from ${grove.name}`}
			aria-pressed={isSub}
			aria-busy={isSubLoading}
		>
			{#if isSubLoading}
				<span class="visiting-spinner" aria-hidden="true"></span>
			{:else}
				<featureIcons.mail size={14} aria-hidden="true" />
			{/if}
			<span>{isSub ? "Subscribed" : "Email updates"}</span>
		</button>
	</div>
	<span class="sr-only" role="status" aria-live="polite">
		{#if status === "added"}
			{grove.name} added as a friend.
		{:else if status === "error"}
			Could not add {grove.name}. Try again.
		{/if}
	</span>
</div>

<style>
	.visiting-card {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.5rem 0.625rem;
		border-radius: 0.5rem;
		background: var(--grove-accent-6);
		border: 1px solid var(--grove-accent-15);
	}

	.visiting-info {
		flex: 1;
		min-width: 0;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.visiting-label {
		font-size: 0.75rem;
		color: hsl(var(--foreground-muted));
		line-height: 1;
	}

	.visiting-name {
		font-size: 0.8125rem;
		font-weight: 600;
		color: hsl(var(--foreground));
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	.visiting-actions {
		flex-shrink: 0;
		display: flex;
		gap: 0.25rem;
	}

	.visiting-add,
	.visiting-subscribe {
		display: inline-flex;
		align-items: center;
		gap: 0.25rem;
		padding: 0.375rem 0.625rem;
		border: none;
		border-radius: 0.375rem;
		background: var(--grove-accent);
		color: white;
		font-size: 0.75rem;
		font-weight: 500;
		cursor: pointer;
		transition: opacity 0.15s ease;
		min-height: 44px;
	}

	.visiting-subscribe {
		background: var(--grove-accent-25, var(--grove-accent));
	}

	.visiting-subscribe.subscribed {
		background: var(--grove-accent-15);
		color: hsl(var(--foreground));
		border: 1px solid var(--grove-accent-25);
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}

	.visiting-add:hover:not(:disabled),
	.visiting-subscribe:hover:not(:disabled) {
		opacity: 0.9;
	}

	.visiting-add:focus-visible,
	.visiting-subscribe:focus-visible {
		outline: 2px solid var(--grove-accent);
		outline-offset: 2px;
	}

	.visiting-add:disabled,
	.visiting-subscribe:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.visiting-spinner {
		width: 14px;
		height: 14px;
		border: 2px solid currentColor;
		border-top-color: transparent;
		border-radius: 50%;
		animation: visiting-spin 0.6s linear infinite;
	}

	@keyframes visiting-spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.visiting-add {
			transition: none;
		}

		.visiting-spinner {
			animation: visiting-pulse 1s ease-in-out infinite;
		}

		@keyframes visiting-pulse {
			0%,
			100% {
				opacity: 0.4;
			}
			50% {
				opacity: 1;
			}
		}
	}
</style>
