<script lang="ts">
	import GlassCard from "@autumnsgrove/lattice/ui/components/ui/GlassCard.svelte";
	import GlassButton from "@autumnsgrove/lattice/ui/components/ui/GlassButton.svelte";
	import { stateIcons, phaseIcons } from "@autumnsgrove/prism/icons";
	const CheckCircle2 = stateIcons.checkCircle2;
	const AlertCircle = stateIcons.alertCircle;
	const XCircle = stateIcons.xCircle;
	const Sparkles = phaseIcons.sparkles;

	import {
		generateSummaries as generateSummariesApi,
		type GenerateProgress,
		type GenerateResult,
	} from "./timeline-api";

	let { csrfToken }: { csrfToken: string } = $props();

	let generateStartDate = $state("");
	let generateEndDate = $state("");
	let isGenerating = $state(false);
	let generateCancelled = $state(false);
	let generateProgress = $state<GenerateProgress | null>(null);
	let generateResult = $state<GenerateResult | null>(null);

	async function handleGenerate() {
		isGenerating = true;
		generateCancelled = false;
		generateResult = null;

		generateResult = await generateSummariesApi(
			generateStartDate,
			generateEndDate,
			csrfToken,
			(progress) => {
				generateProgress = progress;
			},
			() => generateCancelled,
		);

		isGenerating = false;
	}

	function cancelGeneration() {
		generateCancelled = true;
	}
</script>

<GlassCard class="config-section generate-section">
	<div class="section-header">
		<Sparkles class="section-icon" />
		<h2>Generate Summaries</h2>
	</div>

	<p class="generate-description">
		Generate AI-powered timeline entries for dates with commit activity. Each day uses your
		OpenRouter key to create a brief summary, detailed timeline, and gutter comments. Days are
		processed sequentially so context builds across consecutive entries.
	</p>

	<div class="generate-fields">
		<div class="field-group">
			<label for="generateStart" class="field-label">
				Start Date
				<span class="required">*</span>
			</label>
			<input
				type="date"
				id="generateStart"
				bind:value={generateStartDate}
				class="field-input"
				max={new Date().toISOString().split("T")[0]}
				disabled={isGenerating}
			/>
			<p class="field-help">First date to generate a summary for.</p>
		</div>

		<div class="field-group">
			<label for="generateEnd" class="field-label">End Date</label>
			<input
				type="date"
				id="generateEnd"
				bind:value={generateEndDate}
				class="field-input"
				max={new Date().toISOString().split("T")[0]}
				disabled={isGenerating}
			/>
			<p class="field-help">Defaults to today if left empty.</p>
		</div>
	</div>

	{#if generateProgress}
		<div class="generate-progress">
			<div class="progress-bar-container">
				<div
					class="progress-bar-fill"
					style="width: {(generateProgress.current / generateProgress.total) * 100}%"
				></div>
			</div>
			<div class="progress-details">
				{#if isGenerating}
					<span class="progress-current">
						Generating {generateProgress.currentDate}... ({generateProgress.current}/{generateProgress.total})
					</span>
				{:else}
					<span class="progress-current">
						Complete ({generateProgress.current}/{generateProgress.total})
					</span>
				{/if}
				<div class="progress-stats">
					{#if generateProgress.completed.length > 0}
						<span class="stat-generated">{generateProgress.completed.length} generated</span>
					{/if}
					{#if generateProgress.skipped.length > 0}
						<span class="stat-skipped">{generateProgress.skipped.length} skipped</span>
					{/if}
					{#if generateProgress.failed.length > 0}
						<span
							class="stat-failed"
							title={generateProgress.failed.map((f) => `${f.date}: ${f.error}`).join("\n")}
							>{generateProgress.failed.length} failed</span
						>
					{/if}
					{#if generateProgress.totalCost > 0}
						<span class="stat-cost">${generateProgress.totalCost.toFixed(4)}</span>
					{/if}
				</div>
			</div>
		</div>
	{/if}

	{#if generateResult && !isGenerating}
		<div class="alert {generateResult.success ? 'alert-success' : 'alert-error'}">
			{#if generateResult.success}
				<CheckCircle2 class="alert-icon" />
			{:else}
				<AlertCircle class="alert-icon" />
			{/if}
			<div class="generate-result-content">
				<span>{generateResult.message}</span>
				{#if generateProgress && generateProgress.failed.length > 0 && generateProgress.failed.length <= 5}
					<details class="failed-details">
						<summary>Show failed dates</summary>
						<ul class="failed-list">
							{#each generateProgress.failed as failure}
								<li><strong>{failure.date}</strong>: {failure.error}</li>
							{/each}
						</ul>
					</details>
				{/if}
			</div>
		</div>
	{/if}

	<div class="form-actions">
		{#if isGenerating}
			<GlassButton type="button" variant="ghost" onclick={cancelGeneration}>
				<XCircle class="button-icon" />
				Cancel
			</GlassButton>
		{:else}
			<GlassButton
				type="button"
				variant="accent"
				disabled={!generateStartDate}
				onclick={handleGenerate}
			>
				<Sparkles class="button-icon" />
				Generate Summaries
			</GlassButton>
		{/if}
	</div>
</GlassCard>
