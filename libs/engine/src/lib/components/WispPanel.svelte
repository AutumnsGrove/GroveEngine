<script lang="ts">
	import { slide, fade } from "svelte/transition";
	import { Button } from "$lib/ui/components/primitives/button";
	import { MAX_CONTENT_LENGTH } from "$lib/config/wisp.js";
	import { api } from "$lib/utils/api";
	import WispGrammarTab from "./WispGrammarTab.svelte";
	import WispToneTab from "./WispToneTab.svelte";
	import WispReadabilityTab from "./WispReadabilityTab.svelte";

	interface GrammarSuggestion {
		original: string;
		suggestion: string;
		reason?: string;
		severity?: string;
	}

	interface WispResults {
		grammar?: { overallScore?: number; suggestions?: GrammarSuggestion[] };
		tone?: { analysis?: string; traits?: { trait: string; score: number }[]; suggestions?: string[] };
		readability?: {
			fleschKincaid?: number;
			readingTime?: string;
			wordCount?: number;
			sentenceCount?: number;
			sentenceStats?: { average: number; longest: number };
			suggestions?: string[];
		};
		meta?: { tokensUsed?: number; cost?: number };
	}

	interface Props {
		content?: string;
		enabled?: boolean;
		postTitle?: string;
		postSlug?: string;
		onApplyFix?: (original: string, suggestion: string) => void;
	}

	let {
		content = "",
		enabled = false,
		postTitle = "",
		postSlug = "",
		onApplyFix = (_original: string, _suggestion: string) => {},
	}: Props = $props();

	// Panel state
	let isOpen = $state(false);
	let isMinimized = $state(true);

	// Analysis state
	let isAnalyzing = $state(false);
	let analysisError = $state<string | null>(null);
	let results = $state<WispResults | null>(null);
	let activeTab = $state("grammar");
	let selectedMode = $state("quick");

	// ASCII art vibes
	const vibes = {
		idle: `
      .  *  .    .  *
   .    _    .      .
  .   /   \\    *  .
     / ~ ~ \\  .    .
    /       \\______
   ~~~~~~~~~~~~~~~~~~~`,
		analyzing: `
    . * . analyzing . *
      \\  |  /
    -- (o.o) --  thinking
      /  |  \\
   ~~~~~~~~~~~~~~~~~
     words flowing...`,
		success: `
              *
    .    *  /|\\   .
   *   .   / | \\    *
         /__|__\\
    ~~~~~/      \\~~~~
      all clear  `,
		grammarGood: `
        .-~~~-.
      .'       '.
     /  ^   ^   \\
    |  (o) (o)  |  nice!
     \\   <=>   /
      '-.___.-'`,
		toneWarm: `
       __/\\__
      \\      /
    <(  ~~~~  )>
      /      \\
     /   ^^   \\
    warm & cozy`,
		error: `
      .  x  .
        /|\\
       / | \\  oops
      /  |  \\
    _____|_____
    try again?`,
	};

	let currentVibe = $derived.by(() => {
		if (isAnalyzing) return vibes.analyzing;
		if (analysisError) return vibes.error;
		if ((results?.grammar?.overallScore ?? 0) >= 90) return vibes.grammarGood;
		if (results?.tone) return vibes.toneWarm;
		if (results) return vibes.success;
		return vibes.idle;
	});

	const seasonalVibes = [
		`
    .  *  .    .  *
  .    _    .      .
     /   \\    *  .
    / ~ ~ \\  .    .
   /       \\______
  ~~~~~~~~~~~~~~~~~~~`,
		`
  *  .  * .  *  .  *
    .  *    *  .
        _/\\_     *
   .   /    \\  .
   ___/      \\___
  ~~~~~~  ~~~~~~~~~`,
		`
        /\\
    .  /  \\  .  *
      /    \\    .
   * /  /\\  \\  .
  __/  /  \\  \\__
  ~~~~~~~~~~~~~~~~`,
		`
   . * . * . * . * .
     ~  ~  ~  ~  ~
    ,  ,  ,  ,  ,  ,
   v v v v v v v v v
   | | | | | | | | |
  ==================`,
		`
  * . . * . . * . *
     .    *    .
      \\  | /
   --- (._.) ---
      /  |  \\
  ~~~quiet night~~~`,
	];

	let vibeIndex = $state(0);
	let panelRef = $state<HTMLElement | null>(null);

	let contentLengthStatus = $derived.by(() => {
		const len = content.length;
		const pct = Math.round((len / MAX_CONTENT_LENGTH) * 100);
		if (len > MAX_CONTENT_LENGTH) return { status: "over", pct: 100, len };
		if (pct > 80) return { status: "warn", pct, len };
		return { status: "ok", pct, len };
	});

	$effect(() => {
		if (!isOpen || isAnalyzing || results) return;

		const interval = setInterval(() => {
			vibeIndex = (vibeIndex + 1) % seasonalVibes.length;
		}, 8000);

		return () => clearInterval(interval);
	});

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === "Escape" && isOpen) {
			e.preventDefault();
			minimize();
		}
	}

	let displayVibe = $derived.by(() => {
		if (isAnalyzing) return vibes.analyzing;
		if (analysisError) return vibes.error;
		if (results) return currentVibe;
		return seasonalVibes[vibeIndex];
	});

	async function runAnalysis(action = "all") {
		if (!content.trim()) {
			analysisError = "Write something first!";
			return;
		}

		if (content.length > MAX_CONTENT_LENGTH) {
			analysisError = `Content too long (${content.length.toLocaleString()} chars). Max ${MAX_CONTENT_LENGTH.toLocaleString()}.`;
			return;
		}

		isAnalyzing = true;
		analysisError = null;

		try {
			const data = await api.post("/api/grove/wisp", {
				content,
				action,
				mode: selectedMode,
				context: { title: postTitle, slug: postSlug },
			});

			if (data) {
				results = data as WispResults;
				if (action === "grammar") activeTab = "grammar";
				else if (action === "tone") activeTab = "tone";
				else if (action === "readability") activeTab = "readability";
			} else {
				analysisError = "Analysis failed";
			}
		} catch (err) {
			analysisError = "Could not connect to Wisp";
		} finally {
			isAnalyzing = false;
		}
	}

	function applyFix(suggestion: GrammarSuggestion) {
		onApplyFix(suggestion.original, suggestion.suggestion);
		if (results?.grammar?.suggestions) {
			results.grammar.suggestions = results.grammar.suggestions.filter(
				(s) => s.original !== suggestion.original,
			);
		}
	}

	function clearResults() {
		results = null;
		analysisError = null;
	}

	function togglePanel() {
		if (isMinimized) {
			isMinimized = false;
			isOpen = true;
		} else {
			isOpen = !isOpen;
		}
	}

	function minimize() {
		isMinimized = true;
		isOpen = false;
	}

	function formatScore(score: number | null | undefined) {
		if (score === null || score === undefined) return "░░░░░░░░░░";
		const filled = Math.round(score / 10);
		const empty = 10 - filled;
		return "█".repeat(filled) + "░".repeat(empty);
	}
</script>

<svelte:window onkeydown={handleKeydown} />

{#if enabled}
	{#if isMinimized}
		<button
			class="wisp-tab"
			onclick={togglePanel}
			title="Open Wisp"
			aria-label="Open Wisp writing assistant"
			transition:fade={{ duration: 150 }}
		>
			<span class="tab-icon" aria-hidden="true">~</span>
			<span class="tab-text">wisp</span>
		</button>
	{/if}

	{#if isOpen && !isMinimized}
		<aside
			class="wisp-panel"
			aria-label="Wisp writing assistant"
			bind:this={panelRef}
			transition:slide={{ axis: "x", duration: 200 }}
		>
			<header class="panel-header">
				<h3>wisp</h3>
				<div class="header-actions">
					<button class="icon-btn" onclick={minimize} title="Minimize" aria-label="Minimize panel">
						<span aria-hidden="true">−</span>
					</button>
					<button
						class="icon-btn"
						onclick={() => (isOpen = false)}
						title="Close (Esc)"
						aria-label="Close panel"
					>
						<span aria-hidden="true">×</span>
					</button>
				</div>
			</header>

			<div
				class="content-length"
				class:warn={contentLengthStatus.status === "warn"}
				class:over={contentLengthStatus.status === "over"}
				aria-live="polite"
			>
				<span class="length-text">
					{contentLengthStatus.len.toLocaleString()} / {MAX_CONTENT_LENGTH.toLocaleString()}
				</span>
				<div class="length-bar">
					<div class="length-fill" style="width: {contentLengthStatus.pct}%"></div>
				</div>
			</div>

			<div class="vibes-section">
				<pre class="ascii-vibe" aria-hidden="true">{displayVibe}</pre>
			</div>

			<div class="mode-selector">
				<label>
					<input type="radio" bind:group={selectedMode} value="quick" />
					<span>quick</span>
				</label>
				<label>
					<input type="radio" bind:group={selectedMode} value="thorough" />
					<span>thorough</span>
				</label>
			</div>

			<div class="actions" role="group" aria-label="Analysis actions">
				<button
					class="action-btn"
					onclick={() => runAnalysis("grammar")}
					disabled={isAnalyzing || contentLengthStatus.status === "over"}
					aria-busy={isAnalyzing}
				>
					grammar
				</button>
				<button
					class="action-btn"
					onclick={() => runAnalysis("tone")}
					disabled={isAnalyzing || contentLengthStatus.status === "over"}
					aria-busy={isAnalyzing}
				>
					tone
				</button>
				<button
					class="action-btn"
					onclick={() => runAnalysis("readability")}
					disabled={isAnalyzing}
					aria-busy={isAnalyzing}
				>
					reading
				</button>
				<button
					class="action-btn action-full"
					onclick={() => runAnalysis("all")}
					disabled={isAnalyzing || contentLengthStatus.status === "over"}
					aria-busy={isAnalyzing}
				>
					{isAnalyzing ? "thinking..." : "full check"}
				</button>
			</div>

			{#if analysisError}
				<div class="error-message" transition:slide>
					<p>{analysisError}</p>
					<button onclick={() => (analysisError = null)}>dismiss</button>
				</div>
			{/if}

			{#if results}
				<div class="results" transition:slide>
					<div class="tabs">
						{#if results.grammar}
							<button
								class="tab"
								class:active={activeTab === "grammar"}
								onclick={() => (activeTab = "grammar")}
							>
								grammar
							</button>
						{/if}
						{#if results.tone}
							<button
								class="tab"
								class:active={activeTab === "tone"}
								onclick={() => (activeTab = "tone")}
							>
								tone
							</button>
						{/if}
						{#if results.readability}
							<button
								class="tab"
								class:active={activeTab === "readability"}
								onclick={() => (activeTab = "readability")}
							>
								reading
							</button>
						{/if}
					</div>

					{#if activeTab === "grammar" && results.grammar}
						<WispGrammarTab
							overallScore={results.grammar.overallScore}
							suggestions={results.grammar.suggestions}
							onApplyFix={applyFix}
							{formatScore}
						/>
					{/if}

					{#if activeTab === "tone" && results.tone}
						<WispToneTab
							analysis={results.tone.analysis}
							traits={results.tone.traits}
							suggestions={results.tone.suggestions}
						/>
					{/if}

					{#if activeTab === "readability" && results.readability}
						<WispReadabilityTab
							fleschKincaid={results.readability.fleschKincaid}
							readingTime={results.readability.readingTime}
							wordCount={results.readability.wordCount}
							sentenceCount={results.readability.sentenceCount}
							sentenceStats={results.readability.sentenceStats}
							suggestions={results.readability.suggestions}
						/>
					{/if}

					<div class="usage-info">
						{#if results.meta?.tokensUsed}
							<span>tokens: {results.meta.tokensUsed}</span>
							<span>cost: ${results.meta.cost?.toFixed(4) || "0.0000"}</span>
						{/if}
						<button class="clear-btn" onclick={clearResults}>clear</button>
					</div>
				</div>
			{/if}

			<footer
				class="panel-footer"
				aria-label="Wisp philosophy: analyzes your writing but never generates content"
			>
				<p>a helper, not a writer</p>
			</footer>
		</aside>
	{/if}
{/if}

<style>
	.wisp-tab {
		position: fixed;
		right: 0;
		top: 50%;
		transform: translateY(-50%);
		background: var(--color-surface, #2a2a2a);
		border: 1px solid var(--color-border, #3a3a3a);
		border-right: none;
		border-radius: 8px 0 0 8px;
		padding: 0.75rem 0.5rem;
		cursor: pointer;
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		z-index: 100;
		transition:
			background-color 0.2s,
			transform 0.2s;
	}

	.wisp-tab:hover {
		background: var(--color-primary, #2d5a2d);
		transform: translateY(-50%) translateX(-2px);
	}

	.tab-icon {
		font-family: monospace;
		font-size: 1.2rem;
		color: var(--color-accent, #8bc48b);
	}

	.tab-text {
		font-size: 0.6rem;
		text-transform: lowercase;
		letter-spacing: 0.1em;
		color: var(--color-muted-foreground, #888);
		writing-mode: vertical-rl;
		text-orientation: mixed;
	}

	.wisp-panel {
		position: fixed;
		right: 0;
		top: 0;
		bottom: 0;
		width: 280px;
		background: var(--color-background, #1e1e1e);
		border-left: 1px solid var(--color-border, #3a3a3a);
		display: flex;
		flex-direction: column;
		z-index: 100;
		font-size: 0.85rem;
		overflow: hidden;
	}

	.panel-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		border-bottom: 1px solid var(--color-border, #3a3a3a);
	}

	.panel-header h3 {
		margin: 0;
		font-size: 0.9rem;
		font-weight: 500;
		color: var(--color-accent, #8bc48b);
		letter-spacing: 0.05em;
	}

	.header-actions {
		display: flex;
		gap: 0.25rem;
	}

	.icon-btn {
		background: none;
		border: none;
		color: var(--color-muted-foreground, #888);
		cursor: pointer;
		padding: 0.25rem 0.5rem;
		font-size: 1rem;
		line-height: 1;
		border-radius: 4px;
		transition:
			background-color 0.15s,
			color 0.15s;
	}

	.icon-btn:hover {
		background: var(--color-surface, #2a2a2a);
		color: var(--color-foreground, #d4d4d4);
	}

	.content-length {
		padding: 0.25rem 0.75rem;
		border-bottom: 1px solid var(--color-border, #3a3a3a);
		font-size: 0.65rem;
		color: var(--color-muted-foreground, #888);
	}

	.content-length.warn {
		background: hsl(var(--warning-bg));
	}

	.content-length.warn .length-text {
		color: hsl(var(--warning));
	}

	.content-length.over {
		background: var(--color-error-bg);
	}

	.content-length.over .length-text {
		color: var(--color-error);
	}

	.length-text {
		display: block;
		margin-bottom: 0.25rem;
	}

	.length-bar {
		height: 2px;
		background: var(--color-border, #3a3a3a);
		border-radius: 1px;
		overflow: hidden;
	}

	.length-fill {
		height: 100%;
		background: var(--color-accent, #8bc48b);
		transition: width 0.2s ease;
	}

	.content-length.warn .length-fill {
		background: hsl(var(--warning));
	}

	.content-length.over .length-fill {
		background: var(--color-error);
	}

	.vibes-section {
		padding: 0.5rem;
		text-align: center;
		border-bottom: 1px solid var(--color-border, #3a3a3a);
		background: var(--color-surface, #2a2a2a);
	}

	.ascii-vibe {
		margin: 0;
		font-family: monospace;
		font-size: 0.6rem;
		line-height: 1.2;
		color: var(--color-accent, #8bc48b);
		opacity: 0.8;
		white-space: pre;
		user-select: none;
	}

	.mode-selector {
		display: flex;
		gap: 1rem;
		padding: 0.5rem 1rem;
		border-bottom: 1px solid var(--color-border, #3a3a3a);
		font-size: 0.75rem;
	}

	.mode-selector label {
		display: flex;
		align-items: center;
		gap: 0.25rem;
		cursor: pointer;
		color: var(--color-muted-foreground, #888);
	}

	.mode-selector input[type="radio"] {
		accent-color: var(--grove-accent);
	}

	.actions {
		display: grid;
		grid-template-columns: 1fr 1fr;
		gap: 0.5rem;
		padding: 0.75rem;
	}

	.action-btn {
		background: var(--color-surface, #2a2a2a);
		border: 1px solid var(--color-border, #3a3a3a);
		border-radius: 4px;
		padding: 0.5rem;
		color: var(--color-foreground, #d4d4d4);
		cursor: pointer;
		font-size: 0.75rem;
		transition:
			background-color 0.15s,
			border-color 0.15s;
	}

	.action-btn:hover:not(:disabled) {
		background: var(--color-primary, #2d5a2d);
		border-color: var(--color-accent, #8bc48b);
	}

	.action-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.action-full {
		grid-column: 1 / -1;
		background: var(--color-primary, #2d5a2d);
		border-color: var(--color-accent, #8bc48b);
	}

	.error-message {
		margin: 0.5rem;
		padding: 0.5rem;
		background: var(--color-error-bg);
		border: 1px solid var(--color-error-border);
		border-radius: 4px;
		color: var(--color-error);
		font-size: 0.75rem;
	}

	.error-message button {
		background: none;
		border: none;
		color: inherit;
		text-decoration: underline;
		cursor: pointer;
		padding: 0;
		margin-top: 0.25rem;
	}

	.results {
		flex: 1;
		overflow-y: auto;
		display: flex;
		flex-direction: column;
	}

	.tabs {
		display: flex;
		border-bottom: 1px solid var(--color-border, #3a3a3a);
	}

	.tab {
		flex: 1;
		background: none;
		border: none;
		padding: 0.5rem;
		color: var(--color-muted-foreground, #888);
		cursor: pointer;
		font-size: 0.7rem;
		text-transform: lowercase;
		border-bottom: 2px solid transparent;
		transition:
			color 0.15s,
			border-color 0.15s;
	}

	.tab:hover {
		color: var(--color-foreground, #d4d4d4);
	}

	.tab.active {
		color: var(--color-accent, #8bc48b);
		border-bottom-color: var(--color-accent, #8bc48b);
	}

	.usage-info {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.5rem 0.75rem;
		border-top: 1px solid var(--color-border, #3a3a3a);
		font-size: 0.65rem;
		color: var(--color-muted-foreground, #888);
	}

	.clear-btn {
		background: none;
		border: none;
		color: var(--color-muted-foreground, #888);
		cursor: pointer;
		text-decoration: underline;
		font-size: inherit;
	}

	.clear-btn:hover {
		color: var(--color-foreground, #d4d4d4);
	}

	.panel-footer {
		padding: 0.5rem;
		text-align: center;
		border-top: 1px solid var(--color-border, #3a3a3a);
		background: var(--color-surface, #2a2a2a);
	}

	.panel-footer p {
		margin: 0;
		font-size: 0.6rem;
		color: var(--color-muted-foreground, #888);
		font-style: italic;
		letter-spacing: 0.05em;
	}

	.results::-webkit-scrollbar {
		width: 4px;
	}

	.results::-webkit-scrollbar-track {
		background: transparent;
	}

	.results::-webkit-scrollbar-thumb {
		background: var(--color-border, #3a3a3a);
		border-radius: 2px;
	}

	@media (max-width: 768px) {
		.wisp-panel {
			width: 100%;
			max-width: 320px;
		}
	}
</style>
