<script lang="ts">
	interface GrammarSuggestion {
		original: string;
		suggestion: string;
		reason?: string;
		severity?: string;
	}

	interface Props {
		overallScore?: number;
		suggestions?: GrammarSuggestion[];
		onApplyFix: (suggestion: GrammarSuggestion) => void;
		formatScore: (score: number | null | undefined) => string;
	}

	let { overallScore, suggestions = [], onApplyFix, formatScore }: Props = $props();

	function getSeverityClass(severity: string | undefined) {
		switch (severity) {
			case "error":
				return "severity-error";
			case "warning":
				return "severity-warning";
			default:
				return "severity-style";
		}
	}
</script>

<div class="tab-content">
	<div class="score-display">
		<span class="score-label">clarity</span>
		<span class="score-bar">{formatScore(overallScore)}</span>
		<span class="score-num">{overallScore ?? "—"}</span>
	</div>

	{#if (suggestions?.length ?? 0) > 0}
		<div class="suggestions">
			{#each suggestions as suggestion}
				<div class="suggestion {getSeverityClass(suggestion.severity)}">
					<div class="suggestion-original">
						<span class="strike">{suggestion.original}</span>
					</div>
					<div class="suggestion-fix">
						<span class="arrow">→</span>
						<span class="fix-text">{suggestion.suggestion}</span>
					</div>
					<div class="suggestion-reason">{suggestion.reason}</div>
					<button class="apply-btn" onclick={() => onApplyFix(suggestion)}>
						apply
					</button>
				</div>
			{/each}
		</div>
	{:else}
		<p class="no-issues">looking good!</p>
	{/if}
</div>

<style>
	.tab-content {
		flex: 1;
		overflow-y: auto;
		padding: 0.75rem;
	}

	.score-display {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.75rem;
		font-size: 0.75rem;
	}

	.score-label {
		color: var(--color-muted-foreground, #888);
	}

	.score-bar {
		font-family: monospace;
		color: var(--color-accent, #8bc48b);
		letter-spacing: -0.05em;
	}

	.score-num {
		color: var(--color-foreground, #d4d4d4);
		font-weight: 600;
	}

	.suggestions {
		display: flex;
		flex-direction: column;
		gap: 0.75rem;
	}

	.suggestion {
		background: var(--color-surface, #2a2a2a);
		border-radius: 4px;
		padding: 0.5rem;
		border-left: 3px solid var(--color-border, #3a3a3a);
	}

	.suggestion.severity-error {
		border-left-color: var(--color-error);
	}

	.suggestion.severity-warning {
		border-left-color: hsl(var(--warning));
	}

	.suggestion.severity-style {
		border-left-color: var(--color-accent, #8bc48b);
	}

	.suggestion-original {
		margin-bottom: 0.25rem;
	}

	.strike {
		text-decoration: line-through;
		color: var(--color-muted-foreground, #888);
		font-style: italic;
	}

	.suggestion-fix {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		margin-bottom: 0.25rem;
	}

	.arrow {
		color: var(--color-accent, #8bc48b);
	}

	.fix-text {
		color: var(--color-accent, #8bc48b);
	}

	.suggestion-reason {
		font-size: 0.7rem;
		color: var(--color-muted-foreground, #888);
		margin-bottom: 0.5rem;
	}

	.apply-btn {
		background: var(--color-primary, #2d5a2d);
		border: none;
		border-radius: 3px;
		padding: 0.25rem 0.5rem;
		color: white;
		cursor: pointer;
		font-size: 0.65rem;
		transition: background-color 0.15s;
	}

	.apply-btn:hover {
		background: var(--color-accent, #8bc48b);
	}

	.no-issues {
		color: var(--color-accent, #8bc48b);
		font-style: italic;
		text-align: center;
		padding: 1rem;
	}
</style>
