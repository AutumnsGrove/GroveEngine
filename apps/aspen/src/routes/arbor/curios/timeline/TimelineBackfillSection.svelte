<script lang="ts">
	import GlassCard from "@autumnsgrove/lattice/ui/components/ui/GlassCard.svelte";
	import GlassButton from "@autumnsgrove/lattice/ui/components/ui/GlassButton.svelte";
	import { stateIcons, metricIcons } from "@autumnsgrove/prism/icons";
	const CheckCircle2 = stateIcons.checkCircle2;
	const AlertCircle = stateIcons.alertCircle;
	const Loader2 = stateIcons.loader;
	const History = metricIcons.history;

	import { startBackfill as startBackfillApi, type BackfillResult } from "./timeline-api";

	let backfillStartDate = $state("");
	let backfillEndDate = $state("");
	let backfillRepoLimit = $state(10);
	let isBackfilling = $state(false);
	let backfillResult = $state<BackfillResult | null>(null);

	async function handleBackfill() {
		isBackfilling = true;
		backfillResult = null;
		backfillResult = await startBackfillApi(backfillStartDate, backfillEndDate, backfillRepoLimit);
		isBackfilling = false;
	}
</script>

<GlassCard class="config-section backfill-section">
	<div class="section-header">
		<History class="section-icon" />
		<h2>Historical Backfill</h2>
	</div>

	<p class="backfill-description">
		Pull historical commit data from GitHub to populate your Timeline. This uses the Commits API
		(no 90-day limit) to fetch your full history.
	</p>

	<div class="date-range-block">
		<span class="date-range-label">Date Range</span>
		<div class="date-range-fields">
			<div class="field-group">
				<label for="backfillStart" class="field-label">
					Start Date
					<span class="required">*</span>
				</label>
				<input
					type="date"
					id="backfillStart"
					bind:value={backfillStartDate}
					class="field-input"
					max={new Date().toISOString().split("T")[0]}
				/>
				<p class="field-help">How far back to fetch commits (e.g., your project start date).</p>
			</div>

			<div class="field-group">
				<label for="backfillEnd" class="field-label">End Date</label>
				<input
					type="date"
					id="backfillEnd"
					bind:value={backfillEndDate}
					class="field-input"
					max={new Date().toISOString().split("T")[0]}
				/>
				<p class="field-help">Defaults to today if left empty.</p>
			</div>
		</div>
	</div>

	<div class="backfill-fields">
		<div class="field-group">
			<label for="backfillRepoLimit" class="field-label">Repo Limit</label>
			<input
				type="number"
				id="backfillRepoLimit"
				bind:value={backfillRepoLimit}
				class="field-input"
				min="1"
				max="50"
			/>
			<p class="field-help">
				Max repos to process (rate-limited to 1/second). Higher = more data but slower.
			</p>
		</div>
	</div>

	{#if backfillResult}
		<div class="alert {backfillResult.success ? 'alert-success' : 'alert-error'}">
			{#if backfillResult.success}
				<CheckCircle2 class="alert-icon" />
			{:else}
				<AlertCircle class="alert-icon" />
			{/if}
			<div class="backfill-result-content">
				<span>{backfillResult.message}</span>
				{#if backfillResult.stats}
					<div class="backfill-stats">
						<span>{backfillResult.stats.totalCommits} commits</span>
						<span>·</span>
						<span>{backfillResult.stats.processedRepos} repos</span>
						<span>·</span>
						<span>{backfillResult.stats.datesWithActivity} days with activity</span>
					</div>
				{/if}
			</div>
		</div>
	{/if}

	<div class="form-actions">
		<GlassButton
			type="button"
			variant="accent"
			disabled={isBackfilling || !backfillStartDate}
			onclick={handleBackfill}
		>
			{#if isBackfilling}
				<Loader2 class="button-icon spinning" />
				Backfilling...
			{:else}
				<History class="button-icon" />
				Start Backfill
			{/if}
		</GlassButton>
	</div>
</GlassCard>

<style>
	.backfill-description {
		color: var(--color-text-muted);
		font-size: 0.9rem;
		line-height: 1.6;
		margin-bottom: 1.5rem;
	}

	.date-range-block {
		padding: 1.25rem;
		margin-bottom: 1.25rem;
		background: var(--grove-overlay-4);
		border: 1px solid var(--grove-overlay-8);
		border-radius: var(--border-radius-standard);
	}

	.date-range-label {
		display: block;
		font-size: 0.75rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.04em;
		color: var(--color-text-muted);
		margin-bottom: 1rem;
	}

	.date-range-fields {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
	}

	.date-range-fields .field-group {
		margin-bottom: 0;
	}

	.backfill-fields {
		display: grid;
		grid-template-columns: 1fr;
		max-width: 260px;
		gap: 1rem;
	}

	.field-group {
		margin-bottom: 1.25rem;
	}

	.field-group:last-child {
		margin-bottom: 0;
	}

	.field-label {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		font-weight: 500;
		color: var(--color-text);
		margin-bottom: 0.5rem;
	}

	.required {
		color: hsl(var(--destructive));
	}

	.field-input {
		width: 100%;
		padding: 0.75rem 1rem;
		background: var(--grove-overlay-4);
		border: 1px solid var(--grove-overlay-12);
		border-radius: var(--border-radius-standard);
		color: var(--color-text);
		font-size: 0.9rem;
		transition:
			border-color 0.15s,
			box-shadow 0.15s;
	}

	.field-input:focus {
		outline: none;
		border-color: var(--color-primary);
		box-shadow: 0 0 0 3px rgba(var(--color-primary-rgb), 0.15);
	}

	.field-help {
		font-size: 0.8rem;
		color: var(--color-text-muted);
		margin-top: 0.5rem;
		line-height: 1.5;
	}

	.alert {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		border-radius: var(--border-radius-standard);
		margin-bottom: 1.5rem;
	}

	.alert-error {
		background: hsl(var(--destructive) / 0.1);
		border: 1px solid hsl(var(--destructive) / 0.2);
		color: hsl(var(--destructive));
	}

	.alert-success {
		background: var(--grove-accent-10);
		border: 1px solid var(--grove-accent-30);
		color: var(--grove-accent);
	}

	.backfill-result-content {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.backfill-stats {
		display: flex;
		gap: 0.5rem;
		font-size: 0.8rem;
		opacity: 0.8;
	}

	.form-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 1rem;
		margin-top: 2rem;
	}

	@media (max-width: 640px) {
		.date-range-fields {
			grid-template-columns: 1fr;
		}

		.backfill-fields {
			max-width: none;
		}
	}
</style>
