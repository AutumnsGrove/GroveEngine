<script lang="ts">
	interface ToneTrait {
		trait: string;
		score: number;
	}

	interface Props {
		analysis?: string;
		traits?: ToneTrait[];
		suggestions?: string[];
	}

	let { analysis, traits = [], suggestions = [] }: Props = $props();
</script>

<div class="tab-content">
	<p class="tone-analysis">{analysis}</p>

	{#if (traits?.length ?? 0) > 0}
		<div class="traits">
			{#each traits as trait}
				<div class="trait">
					<span class="trait-name">{trait.trait}</span>
					<div class="trait-bar-container">
						<div class="trait-bar" style="width: {trait.score}%"></div>
					</div>
					<span class="trait-score">{trait.score}</span>
				</div>
			{/each}
		</div>
	{/if}

	{#if (suggestions?.length ?? 0) > 0}
		<div class="tone-suggestions">
			{#each suggestions as sug}
				<p class="tone-sug">• {sug}</p>
			{/each}
		</div>
	{/if}
</div>

<style>
	.tab-content {
		flex: 1;
		overflow-y: auto;
		padding: 0.75rem;
	}

	.tone-analysis {
		color: var(--color-foreground, #d4d4d4);
		margin-bottom: 0.75rem;
		line-height: 1.4;
	}

	.traits {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.trait {
		display: grid;
		grid-template-columns: 80px 1fr 30px;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.7rem;
	}

	.trait-name {
		color: var(--color-muted-foreground, #888);
		text-transform: lowercase;
	}

	.trait-bar-container {
		background: var(--color-surface, #2a2a2a);
		height: 6px;
		border-radius: 3px;
		overflow: hidden;
	}

	.trait-bar {
		height: 100%;
		background: var(--color-accent, #8bc48b);
		border-radius: 3px;
		transition: width 0.3s ease;
	}

	.trait-score {
		text-align: right;
		color: var(--color-muted-foreground, #888);
	}

	.tone-suggestions {
		border-top: 1px solid var(--color-border, #3a3a3a);
		padding-top: 0.5rem;
	}

	.tone-sug {
		color: var(--color-muted-foreground, #888);
		font-size: 0.7rem;
		margin: 0.25rem 0;
	}
</style>
