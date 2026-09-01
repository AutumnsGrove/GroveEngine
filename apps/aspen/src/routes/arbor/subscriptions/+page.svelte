<script lang="ts">
	import GlassCard from "@autumnsgrove/lattice/ui/components/ui/GlassCard.svelte";
	import Button from "@autumnsgrove/lattice/ui/components/ui/Button.svelte";
	import { featureIcons, stateIcons } from "@autumnsgrove/prism/icons";
	import { enhance } from "$app/forms";

	let { data, form } = $props();

	const subscriptions = $derived(data.subscriptions ?? []);

	// Generate hour options for the dropdown
	const hours = Array.from({ length: 24 }, (_, i) => {
		const label =
			i === 0 ? "12:00 AM" : i < 12 ? `${i}:00 AM` : i === 12 ? "12:00 PM" : `${i - 12}:00 PM`;
		return { value: i, label };
	});

	// Get common timezones for the dropdown — computed once, never reassigned
	const timezones: string[] = (() => {
		try {
			return Intl.supportedValuesOf("timeZone");
		} catch {
			return [
				"America/New_York",
				"America/Chicago",
				"America/Denver",
				"America/Los_Angeles",
				"Europe/London",
				"Europe/Paris",
				"Asia/Tokyo",
				"Australia/Sydney",
			];
		}
	})();
</script>

<svelte:head>
	<title>Email Subscriptions — Arbor</title>
</svelte:head>

<div class="settings-page">
	<header class="page-header">
		<h1>
			<featureIcons.mail class="inline-icon" />
			Email Subscriptions
		</h1>
		<p class="subtitle">Manage email notifications from groves you follow.</p>
	</header>

	{#if form?.success}
		<div class="notice success" role="status">
			<stateIcons.check class="notice-icon" />
			{form.action === "unsubscribed" ? "Unsubscribed successfully." : "Preferences updated."}
		</div>
	{/if}

	{#if subscriptions.length === 0}
		<GlassCard variant="frosted" hoverable={false}>
			<div class="empty-state">
				<featureIcons.mail class="empty-icon" />
				<h2>No subscriptions yet</h2>
				<p>
					When you subscribe to email updates from other groves, they'll appear here. Visit another
					grove and click "Subscribe" to get started.
				</p>
			</div>
		</GlassCard>
	{:else}
		<div class="subscriptions-list">
			{#each subscriptions as sub}
				<GlassCard variant="frosted" hoverable={false} class="subscription-card">
					<div class="sub-header">
						<div class="sub-grove-info">
							<a href="https://{sub.groveSubdomain}.grove.place" class="sub-grove-name">
								{sub.groveName || sub.groveSubdomain}
							</a>
							<span class="sub-grove-url">{sub.groveSubdomain}.grove.place</span>
						</div>
						<form method="POST" action="?/unsubscribe" use:enhance>
							<input type="hidden" name="tenantId" value={sub.targetTenantId} />
							<Button type="submit" variant="outline" size="sm">Unsubscribe</Button>
						</form>
					</div>

					<form method="POST" action="?/updatePreferences" use:enhance class="sub-prefs">
						<input type="hidden" name="tenantId" value={sub.targetTenantId} />

						<div class="pref-row">
							<label for="hour-{sub.id}" class="pref-label">Send at</label>
							<select
								id="hour-{sub.id}"
								name="preferredHour"
								class="pref-select"
								value={sub.preferredHour}
							>
								{#each hours as hour}
									<option value={hour.value} selected={hour.value === sub.preferredHour}>
										{hour.label}
									</option>
								{/each}
							</select>
						</div>

						<div class="pref-row">
							<label for="tz-{sub.id}" class="pref-label">Timezone</label>
							<select
								id="tz-{sub.id}"
								name="timezone"
								class="pref-select tz-select"
								value={sub.timezone}
							>
								{#each timezones as tz}
									<option value={tz} selected={tz === sub.timezone}>{tz.replace(/_/g, " ")}</option>
								{/each}
							</select>
						</div>

						<Button type="submit" variant="outline" size="sm">Save</Button>
					</form>
				</GlassCard>
			{/each}
		</div>
	{/if}
</div>

<style>
	.settings-page {
		max-width: 48rem;
		margin: 0 auto;
		padding: 2rem 1rem;
	}

	.page-header {
		margin-bottom: 2rem;
	}

	.page-header h1 {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 1.5rem;
		font-weight: 600;
		color: hsl(var(--foreground));
	}

	.page-header .subtitle {
		margin-top: 0.5rem;
		color: hsl(var(--foreground-muted));
		font-size: 0.875rem;
	}

	:global(.inline-icon) {
		width: 1.25rem;
		height: 1.25rem;
	}

	.notice {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		padding: 0.75rem 1rem;
		border-radius: 0.5rem;
		margin-bottom: 1.5rem;
		font-size: 0.875rem;
	}

	.notice.success {
		background: var(--grove-accent-6, hsl(142 71% 45% / 0.1));
		color: var(--grove-accent, hsl(142 71% 45%));
		border: 1px solid var(--grove-accent-15, hsl(142 71% 45% / 0.2));
	}

	:global(.notice-icon) {
		width: 1rem;
		height: 1rem;
		flex-shrink: 0;
	}

	.empty-state {
		text-align: center;
		padding: 2rem;
	}

	:global(.empty-icon) {
		width: 2.5rem;
		height: 2.5rem;
		color: hsl(var(--foreground-muted));
		margin: 0 auto 1rem;
	}

	.empty-state h2 {
		font-size: 1.125rem;
		font-weight: 600;
		color: hsl(var(--foreground));
		margin-bottom: 0.5rem;
	}

	.empty-state p {
		color: hsl(var(--foreground-muted));
		font-size: 0.875rem;
		max-width: 24rem;
		margin: 0 auto;
	}

	.subscriptions-list {
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.sub-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		margin-bottom: 1rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid hsl(var(--foreground) / 0.1);
	}

	.sub-grove-info {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.sub-grove-name {
		font-weight: 600;
		color: hsl(var(--foreground));
		text-decoration: none;
	}

	.sub-grove-name:hover {
		text-decoration: underline;
	}

	.sub-grove-url {
		font-size: 0.75rem;
		color: hsl(var(--foreground-muted));
	}

	.sub-prefs {
		display: flex;
		align-items: flex-end;
		gap: 1rem;
		flex-wrap: wrap;
	}

	.pref-row {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.pref-label {
		font-size: 0.75rem;
		font-weight: 500;
		color: hsl(var(--foreground-muted));
	}

	.pref-select {
		padding: 0.375rem 0.5rem;
		border-radius: 0.375rem;
		border: 1px solid hsl(var(--foreground) / 0.15);
		background: hsl(var(--background));
		color: hsl(var(--foreground));
		font-size: 0.8125rem;
		min-height: 36px;
	}

	.tz-select {
		max-width: 16rem;
	}
</style>
