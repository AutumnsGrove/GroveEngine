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

	<div class="backfill-fields">
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
