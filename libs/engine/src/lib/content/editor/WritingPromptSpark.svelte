<script lang="ts">
	import { featureIcons, actionIcons, stateIcons } from "@autumnsgrove/prism/icons";
	import { WRITING_PROMPTS, type WritingPrompt } from "./writing-prompts.js";

	// Icon components must be aliased to a capitalized local before use as a
	// tag — a bare dotted member expression like <featureIcons.pencilSparkles />
	// doesn't resolve as a Svelte component (matches the {@const Icon = ...}
	// pattern used in FormattingToolbar.svelte).
	const SparklesIcon = featureIcons.pencilSparkles;
	const RefreshIcon = actionIcons.refresh;
	const PinIcon = actionIcons.pin;
	const DismissIcon = stateIcons.x;

	interface Props {
		onDismiss?: () => void;
		/** Explicit "yes, I want to write from this one" commit action. */
		onPin?: () => void;
		/**
		 * Fires whenever the displayed prompt changes (mount + each "another
		 * spark"). Lets the parent page track which prompt is currently on
		 * screen so it can be referenced or pinned later.
		 */
		onPromptChange?: (prompt: WritingPrompt) => void;
	}

	let { onDismiss, onPin, onPromptChange }: Props = $props();

	let currentIndex = $state(Math.floor(Math.random() * WRITING_PROMPTS.length));
	let current = $derived(WRITING_PROMPTS[currentIndex]);

	$effect(() => {
		onPromptChange?.(current);
	});

	function anotherSpark() {
		if (WRITING_PROMPTS.length <= 1) return;
		let next = currentIndex;
		while (next === currentIndex) {
			next = Math.floor(Math.random() * WRITING_PROMPTS.length);
		}
		currentIndex = next;
	}
</script>

<div class="spark-card">
	<div class="spark-icon">
		<SparklesIcon class="w-4 h-4" />
	</div>

	<div class="spark-body">
		<p class="spark-text">{current.text}</p>
		<span class="spark-tag">{current.mood} · {current.length}</span>
	</div>

	<div class="spark-actions">
		<button type="button" class="spark-btn spark-btn-ghost" onclick={anotherSpark} title="Get another prompt">
			<RefreshIcon class="w-3.5 h-3.5" />
			Another spark
		</button>
		{#if onPin}
			<button type="button" class="spark-btn spark-btn-pin" onclick={onPin} title="Write from this prompt">
				<PinIcon class="w-3.5 h-3.5" />
				Use this
			</button>
		{/if}
		{#if onDismiss}
			<button
				type="button"
				class="spark-btn spark-btn-dismiss"
				onclick={onDismiss}
				title="Minimize (find it again via the Spark pill)"
			>
				<DismissIcon class="w-3.5 h-3.5" />
			</button>
		{/if}
	</div>
</div>

<style>
	.spark-card {
		display: flex;
		align-items: flex-start;
		gap: 0.75rem;
		padding: 0.85rem 1rem;
		margin: 0.5rem 0 1rem;
		background: color-mix(in srgb, var(--color-primary) 6%, transparent);
		border: 1px solid color-mix(in srgb, var(--color-primary) 20%, transparent);
		border-radius: var(--border-radius-button, 10px);
	}

	.spark-icon {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 1.75rem;
		flex-shrink: 0;
		border-radius: 999px;
		background: color-mix(in srgb, var(--color-primary) 15%, transparent);
		color: var(--color-primary);
	}

	.spark-body {
		flex: 1;
		min-width: 0;
	}

	.spark-text {
		margin: 0;
		font-size: 0.95rem;
		color: var(--color-text);
		line-height: 1.4;
	}

	.spark-tag {
		display: inline-block;
		margin-top: 0.35rem;
		font-size: 0.75rem;
		color: var(--color-text-subtle);
		text-transform: capitalize;
	}

	.spark-actions {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		flex-shrink: 0;
	}

	.spark-btn {
		display: flex;
		align-items: center;
		gap: 0.35rem;
		padding: 0.35rem 0.6rem;
		background: transparent;
		border: 1px solid transparent;
		border-radius: var(--border-radius-small, 6px);
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--color-primary);
		cursor: pointer;
		white-space: nowrap;
		transition:
			background-color 0.15s ease,
			border-color 0.15s ease;
	}

	.spark-btn-ghost:hover {
		background: color-mix(in srgb, var(--color-primary) 10%, transparent);
		border-color: color-mix(in srgb, var(--color-primary) 25%, transparent);
	}

	.spark-btn-pin {
		background: color-mix(in srgb, var(--color-primary) 12%, transparent);
		border-color: color-mix(in srgb, var(--color-primary) 30%, transparent);
	}

	.spark-btn-pin:hover {
		background: color-mix(in srgb, var(--color-primary) 20%, transparent);
		border-color: color-mix(in srgb, var(--color-primary) 45%, transparent);
	}

	.spark-btn-dismiss {
		padding: 0.35rem;
		color: var(--color-text-subtle);
	}

	.spark-btn-dismiss:hover {
		background: var(--color-bg-secondary);
		color: var(--color-text);
	}

	@media (max-width: 600px) {
		.spark-card {
			flex-wrap: wrap;
		}
		.spark-actions {
			width: 100%;
			justify-content: flex-end;
		}
	}
</style>
