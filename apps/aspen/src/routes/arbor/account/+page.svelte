<script lang="ts">
	import GlassCard from "@autumnsgrove/lattice/ui/components/ui/GlassCard.svelte";
	import { CONTACT } from "@autumnsgrove/lattice/platform/config/contact";
	import {
		buildPortalUrl,
		buildCancelUrl,
		buildResumeUrl,
		buildCheckoutUrl,
	} from "@autumnsgrove/lattice/platform/config/billing";
	import { page } from "$app/stores";

	// Garden status hero
	import { GardenStatus } from "@autumnsgrove/lattice/platform/upgrades";
	import type { FlourishState } from "@autumnsgrove/lattice/platform/upgrades";

	// Tier utilities
	import type { TierKey } from "@autumnsgrove/lattice/platform/config/tiers";
	import {
		getTier,
		getNextTier,
		formatStorage,
		formatLimit,
	} from "@autumnsgrove/lattice/platform/config/tiers";

	// Icons (direct imports — no barrels)
	import { metricIcons, featureIcons } from "@autumnsgrove/prism/icons";

	let { data } = $props();

	// Current page URL for redirect-back after billing hub actions
	const currentUrl = $derived($page.url.href);

	// Tier pricing lookup
	const tierPricing = $derived(getTier(data.currentPlan as TierKey).pricing);

	// ── Flourish state derivation ───────────────────────────────────────────
	function getFlourishState(): FlourishState {
		if (!data.billing) return "active";
		const status = data.billing.status;

		if (status === "past_due") return "past_due";
		if (data.billing.cancelAtPeriodEnd) return "resting";
		if (status === "canceled" || status === "unpaid") return "pruned";
		return "active";
	}

	let flourishState = $derived<FlourishState>(getFlourishState());

	// Get current period end as unix timestamp for GardenStatus
	function getPeriodEnd(): number | null {
		if (!data.billing?.currentPeriodEnd) return null;
		return new Date(data.billing.currentPeriodEnd).getTime() / 1000;
	}

	let currentPeriodEnd = $derived(getPeriodEnd());

	// ── Action handlers ─────────────────────────────────────────────────────

	/** Redirect to BillingHub portal (manage payment, invoices) */
	function handleTend(): void {
		window.location.href = buildPortalUrl(currentUrl);
	}

	/** Redirect to BillingHub checkout for the next tier up */
	function handleNurture(): void {
		const next = getNextTier(data.currentPlan as TierKey);
		if (!next) return;

		window.location.href = buildCheckoutUrl({
			tenantId: data.tenantId,
			tier: next,
			billingCycle: "monthly",
			redirect: currentUrl,
		});
	}

	/** Redirect to BillingHub cancel flow */
	function handleCancelClick(): void {
		window.location.href = buildCancelUrl(currentUrl);
	}

	/** Redirect to BillingHub resume flow */
	function handleResume(): void {
		window.location.href = buildResumeUrl(currentUrl);
	}
</script>

<div class="account-page">
	<header class="page-header">
		<h1>Account</h1>
		<p class="subtitle">Your membership, at a glance.</p>
	</header>

	<!-- Garden Status Hero — full width -->
	<GardenStatus
		currentStage={data.currentPlan as TierKey}
		{flourishState}
		{currentPeriodEnd}
		pruningScheduled={data.billing?.cancelAtPeriodEnd ?? false}
		paymentBrand={data.billing?.paymentMethod?.brand ?? ""}
		paymentLast4={data.billing?.paymentMethod?.last4 ?? ""}
		showDetails={true}
		onTend={handleTend}
		onNurture={handleNurture}
		onCancel={handleCancelClick}
		onResume={handleResume}
		class="mb-6"
	/>

	<!-- Summary cards grid -->
	<div class="account-grid">
		<!-- ── Payment ────────────────────────────────────────────────────── -->
		<GlassCard variant="frosted" hoverable flush>
			<div class="card-body">
				<div class="card-header">
					<metricIcons.creditCard class="card-icon" />
					<h2 class="card-title">Payment</h2>
				</div>
				<div class="card-content">
					{#if data.isComped}
						<p class="card-line">Complimentary account</p>
					{:else if data.billing?.paymentMethod}
						<p class="card-line">
							<span class="card-value">
								{data.billing.paymentMethod.brand ?? "Card"}
							</span>
							&ensp;&bull;&bull;&bull;&bull; {data.billing.paymentMethod.last4}
						</p>
					{:else}
						<p class="card-line muted">Payment on file with Stripe</p>
					{/if}
				</div>
				{#if !data.isComped}
					<button class="card-action" onclick={handleTend}>
						Manage &rarr;
					</button>
				{/if}
			</div>
		</GlassCard>

		<!-- ── Your Plan ──────────────────────────────────────────────────── -->
		<GlassCard variant="frosted" hoverable flush>
			<div class="card-body">
				<div class="card-header">
					<featureIcons.package class="card-icon" />
					<h2 class="card-title">Your Plan</h2>
				</div>
				<div class="card-content">
					<p class="card-line">
						<span class="card-value">{data.tierConfig?.name ?? "Unknown"}</span>
					</p>
					<p class="card-line muted">
						{#if data.isComped}
							complimentary
						{:else if tierPricing.monthlyPrice === 0}
							free
						{:else}
							${tierPricing.monthlyPrice} /month
						{/if}
					</p>
				</div>
				{#if !data.isComped && data.billing?.hasSubscription}
					<button class="card-action" onclick={handleNurture}>
						Change plan &rarr;
					</button>
				{/if}
			</div>
		</GlassCard>

		<!-- ── Usage ──────────────────────────────────────────────────────── -->
		<GlassCard variant="frosted" hoverable flush>
			<div class="card-body">
				<div class="card-header">
					<featureIcons.hardDrive class="card-icon" />
					<h2 class="card-title">Usage</h2>
				</div>
				<div class="card-content">
					{#if data.usageError}
						<p class="card-line muted">Unable to load usage data</p>
					{:else if data.usage}
						<p class="card-line">
							{formatStorage(data.usage.storageUsed)} / {formatStorage(data.usage.storageLimit)}
						</p>
						<p class="card-line muted">
							{data.usage.postCount} / {data.usage.postLimit ? formatLimit(data.usage.postLimit) : "Unlimited"} blooms
						</p>
					{:else}
						<p class="card-line muted">No usage data available</p>
					{/if}
				</div>
			</div>
		</GlassCard>

		<!-- ── Your Data ──────────────────────────────────────────────────── -->
		<GlassCard variant="frosted" hoverable flush>
			<div class="card-body">
				<div class="card-header">
					<featureIcons.archive class="card-icon" />
					<h2 class="card-title">Your Data</h2>
				</div>
				<div class="card-content">
					<p class="card-line">You own everything you create.</p>
					<p class="card-line muted">
						{data.exportCounts.posts} posts, {data.exportCounts.pages} pages, {data.exportCounts.media} media files
					</p>
				</div>
				<a href="/arbor/export" class="card-action">
					Go to Full Export &rarr;
				</a>
			</div>
		</GlassCard>

		<!-- ── Closing Your Grove ─────────────────────────────────────────── -->
		<div class="closing-wrapper">
			<GlassCard variant="default" flush>
				<div class="card-body closing-card">
					<h2 class="card-title">Closing Your Grove</h2>
					<p class="card-line">
						If you'd like to move on, we'll help you export your data first.
						Contact us at
						<a href="mailto:{CONTACT.supportEmail}" class="contact-link">
							{CONTACT.supportEmailDisplay}
						</a>
					</p>
					<p class="card-line refund-note">
						Full refund within 14 days of signup. After that, pro-rated for
						unused time in your current billing period.
					</p>
				</div>
			</GlassCard>
		</div>
	</div>
</div>

<style>
	/* ── Page layout ──────────────────────────────────────────────────────── */
	.account-page {
		max-width: 900px;
	}

	.page-header {
		margin-bottom: 2rem;
	}

	.page-header h1 {
		margin: 0 0 0.25rem 0;
		font-size: 2rem;
		color: var(--color-text);
	}

	.subtitle {
		margin: 0;
		color: var(--color-text-muted);
	}

	/* ── Grid ─────────────────────────────────────────────────────────────── */
	.account-grid {
		display: grid;
		grid-template-columns: repeat(auto-fit, minmax(320px, 1fr));
		gap: 1.5rem;
		margin-top: 1.5rem;
	}

	/* ── Card internals ───────────────────────────────────────────────────── */
	.card-body {
		display: flex;
		flex-direction: column;
		padding: 1rem 1.5rem;
		height: 100%;
	}

	.card-header {
		display: flex;
		align-items: center;
		gap: 0.625rem;
		margin-bottom: 1rem;
	}

	:global(.card-icon) {
		width: 1.25rem;
		height: 1.25rem;
		color: var(--user-accent, var(--color-primary));
		flex-shrink: 0;
	}

	.card-title {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--color-text);
	}

	.card-content {
		flex: 1;
	}

	.card-line {
		margin: 0 0 0.25rem 0;
		font-size: 0.9rem;
		color: var(--color-text);
		line-height: 1.5;
	}

	.card-line.muted {
		color: var(--color-text-muted);
		font-size: 0.85rem;
	}

	.card-value {
		font-weight: 600;
	}

	/* ── Card action (button or link) ─────────────────────────────────────── */
	.card-action {
		display: inline-block;
		margin-top: auto;
		padding-top: 1rem;
		font-size: 0.85rem;
		font-weight: 500;
		color: var(--user-accent, var(--color-primary));
		background: none;
		border: none;
		cursor: pointer;
		text-align: left;
		text-decoration: none;
		padding-left: 0;
		padding-right: 0;
		padding-bottom: 0;
	}

	.card-action:hover {
		opacity: 0.8;
	}

	a.card-action {
		display: inline-block;
	}

	/* ── Closing Your Grove ───────────────────────────────────────────────── */
	.closing-wrapper {
		grid-column: 1 / -1;
	}

	.closing-wrapper :global(.glass-card) {
		border-style: dashed;
		border-color: color-mix(in srgb, var(--color-text-muted) 20%, transparent);
	}

	.closing-card {
		max-width: 560px;
	}

	.closing-card .card-title {
		font-size: 1rem;
		color: var(--color-text-muted);
		margin-bottom: 0.75rem;
	}

	.contact-link {
		color: var(--user-accent, var(--color-primary));
		text-decoration: none;
	}

	.contact-link:hover {
		text-decoration: underline;
	}

	.refund-note {
		margin-top: 0.75rem;
		font-size: 0.8rem;
		color: var(--color-text-muted);
		opacity: 0.7;
		line-height: 1.5;
	}

	/* ── Responsive ───────────────────────────────────────────────────────── */
	@media (max-width: 700px) {
		.account-grid {
			grid-template-columns: 1fr;
		}
	}
</style>
