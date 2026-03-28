<script lang="ts">
	interface Props {
		fleschKincaid?: number;
		readingTime?: string;
		wordCount?: number;
		sentenceCount?: number;
		sentenceStats?: { average: number; longest: number };
		suggestions?: string[];
	}

	let {
		fleschKincaid,
		readingTime,
		wordCount,
		sentenceCount,
		sentenceStats,
		suggestions = [],
	}: Props = $props();
</script>

<div class="tab-content">
	<div class="readability-stats">
		<div class="stat">
			<span class="stat-label">grade level</span>
			<span class="stat-value">{fleschKincaid}</span>
		</div>
		<div class="stat">
			<span class="stat-label">reading time</span>
			<span class="stat-value">{readingTime}</span>
		</div>
		<div class="stat">
			<span class="stat-label">words</span>
			<span class="stat-value">{wordCount}</span>
		</div>
		<div class="stat">
			<span class="stat-label">sentences</span>
			<span class="stat-value">{sentenceCount}</span>
		</div>
		{#if sentenceStats}
			<div class="stat">
				<span class="stat-label">avg sentence</span>
				<span class="stat-value">{sentenceStats.average} words</span>
			</div>
			<div class="stat">
				<span class="stat-label">longest</span>
				<span class="stat-value">{sentenceStats.longest} words</span>
			</div>
		{/if}
	</div>

	{#if (suggestions?.length ?? 0) > 0}
		<div class="readability-suggestions">
			{#each suggestions as sug}
				<p class="read-sug">• {sug}</p>
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

	.readability-stats {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
	}

	.stat {
		background: var(--color-surface, #2a2a2a);
		padding: 0.5rem;
		border-radius: 4px;
	}

	.stat-label {
		display: block;
		font-size: 0.65rem;
		color: var(--color-muted-foreground, #888);
		text-transform: lowercase;
		margin-bottom: 0.25rem;
	}

	.stat-value {
		font-size: 0.9rem;
		color: var(--color-foreground, #d4d4d4);
		font-weight: 500;
	}

	.readability-suggestions {
		border-top: 1px solid var(--color-border, #3a3a3a);
		padding-top: 0.5rem;
	}

	.read-sug {
		color: var(--color-muted-foreground, #888);
		font-size: 0.7rem;
		margin: 0.25rem 0;
	}
</style>
