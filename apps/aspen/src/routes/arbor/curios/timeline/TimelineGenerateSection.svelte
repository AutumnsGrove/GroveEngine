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

<style>
	.generate-description {
		color: var(--color-text-muted);
		font-size: 0.9rem;
		line-height: 1.6;
		margin-bottom: 1.5rem;
	}

	.generate-fields {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 1rem;
		margin-bottom: 1rem;
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

	.field-input:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.field-help {
		font-size: 0.8rem;
		color: var(--color-text-muted);
		margin-top: 0.5rem;
		line-height: 1.5;
	}

	.generate-progress {
		margin: 1.5rem 0;
	}

	.progress-bar-container {
		width: 100%;
		height: 6px;
		background: var(--grove-overlay-8);
		border-radius: 3px;
		overflow: hidden;
		margin-bottom: 0.75rem;
	}

	.progress-bar-fill {
		height: 100%;
		background: var(--color-primary);
		border-radius: 3px;
		transition: width 0.3s ease;
	}

	.progress-details {
		display: flex;
		justify-content: space-between;
		align-items: center;
		flex-wrap: wrap;
		gap: 0.5rem;
	}

	.progress-current {
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}

	.progress-stats {
		display: flex;
		gap: 0.75rem;
		font-size: 0.8rem;
	}

	.stat-generated {
		color: var(--grove-accent);
	}

	.stat-skipped {
		color: var(--color-text-muted);
	}

	.stat-failed {
		color: hsl(var(--destructive));
	}

	.stat-cost {
		color: var(--color-primary);
		font-weight: 500;
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

	.generate-result-content {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.failed-details {
		font-size: 0.8rem;
		opacity: 0.9;
	}

	.failed-details summary {
		cursor: pointer;
		color: var(--color-text-muted);
	}

	.failed-list {
		margin: 0.5rem 0 0 0;
		padding-left: 1.25rem;
		list-style: disc;
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
	}

	.failed-list li {
		word-break: break-word;
	}

	.form-actions {
		display: flex;
		align-items: center;
		justify-content: flex-end;
		gap: 1rem;
		margin-top: 2rem;
	}

	@media (max-width: 640px) {
		.generate-fields {
			grid-template-columns: 1fr;
		}
	}
</style>
