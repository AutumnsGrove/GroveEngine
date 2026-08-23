<!--
  EditorRail — docked icon rail for the post editor canvas

  Sits at the right edge of the editor workspace. Two tabs — Details and
  Vines — toggle a single slide-in panel (mutually exclusive: opening one
  closes the other). Badges on the rail buttons surface state (filled
  field count, vine count, unanchored-vine warning) without requiring the
  panel to be open.

  Usage:
    <div style="display: flex; align-items: flex-start; gap: 1rem;">
      <div class="canvas">...editor...</div>
      <EditorRail bind:activeTab {detailsBadge} {vinesCount} {vinesWarning}>
        {#snippet detailsPanel()}...{/snippet}
        {#snippet vinesPanel()}...{/snippet}
      </EditorRail>
    </div>
-->
<script lang="ts">
	import { chromeIcons, featureIcons, stateIcons } from "@autumnsgrove/prism/icons";

	interface Props {
		activeTab?: "details" | "vines" | null;
		/** true if any detail field (cover, description, tags, etc.) is filled in */
		detailsBadge?: boolean;
		vinesCount?: number;
		/** true if any vine has no anchor set — shows a warning dot */
		vinesWarning?: boolean;
		detailsPanel?: import("svelte").Snippet;
		vinesPanel?: import("svelte").Snippet;
	}

	let {
		activeTab = $bindable(null),
		detailsBadge = false,
		vinesCount = 0,
		vinesWarning = false,
		detailsPanel,
		vinesPanel,
	}: Props = $props();

	function toggleTab(tab: "details" | "vines") {
		activeTab = activeTab === tab ? null : tab;
	}

	function closePanel() {
		activeTab = null;
	}

	const panelTitle = $derived(
		activeTab === "details" ? "Details" : activeTab === "vines" ? "Vines" : "",
	);
</script>

<div class="editor-rail">
	{#if activeTab}
		<div class="editor-rail-panel" role="region" aria-label="{panelTitle} panel">
			<div class="editor-rail-panel-header">
				<h2>{panelTitle}</h2>
				<button
					type="button"
					class="editor-rail-panel-close"
					onclick={closePanel}
					aria-label="Close {panelTitle} panel"
				>
					<stateIcons.x class="editor-rail-close-icon" />
				</button>
			</div>
			<div class="editor-rail-panel-body">
				{#if activeTab === "details"}
					{@render detailsPanel?.()}
				{:else if activeTab === "vines"}
					{@render vinesPanel?.()}
				{/if}
			</div>
		</div>
	{/if}

	<nav class="editor-rail-nav" aria-label="Editor panels">
		<button
			type="button"
			class="editor-rail-btn"
			class:active={activeTab === "details"}
			onclick={() => toggleTab("details")}
			aria-pressed={activeTab === "details"}
			title="Details"
		>
			<span class="editor-rail-icon-wrap">
				<chromeIcons.sliders class="editor-rail-icon" />
				{#if detailsBadge}
					<span
						class="editor-rail-badge-dot editor-rail-badge-dot-info"
						title="Some details are filled in"
						aria-hidden="true"
					></span>
				{/if}
			</span>
			<span class="editor-rail-label">Details</span>
			{#if detailsBadge}
				<span class="visually-hidden">Some details are filled in</span>
			{/if}
		</button>

		<button
			type="button"
			class="editor-rail-btn"
			class:active={activeTab === "vines"}
			onclick={() => toggleTab("vines")}
			aria-pressed={activeTab === "vines"}
			title="Vines"
		>
			<span class="editor-rail-icon-wrap">
				<featureIcons.gitBranch class="editor-rail-icon" />
				{#if vinesCount > 0}
					<span class="editor-rail-badge-count" aria-hidden="true">{vinesCount}</span>
				{/if}
				{#if vinesWarning}
					<span
						class="editor-rail-badge-dot editor-rail-badge-dot-warning"
						title="A vine needs an anchor"
						aria-hidden="true"
					></span>
				{/if}
			</span>
			<span class="editor-rail-label">Vines</span>
			{#if vinesCount > 0}
				<span class="visually-hidden">{vinesCount} vines</span>
			{/if}
			{#if vinesWarning}
				<span class="visually-hidden">A vine needs an anchor</span>
			{/if}
		</button>
	</nav>
</div>

<style>
	.editor-rail {
		position: relative;
		display: flex;
		flex-direction: row;
		align-items: flex-start;
		flex-shrink: 0;
	}

	/* ---------- rail ---------- */
	.editor-rail-nav {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
		padding: 0.6rem;
		background: var(--glass-bg);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid var(--grove-overlay-15);
		border-radius: var(--border-radius-standard);
		box-shadow: var(--shadow-md);
	}

	.editor-rail-btn {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		gap: 0.25rem;
		min-width: 44px;
		min-height: 44px;
		width: 56px;
		padding: 0.5rem 0.35rem;
		border: 1px solid transparent;
		border-radius: var(--border-radius-button);
		background: transparent;
		color: var(--color-text-muted);
		cursor: pointer;
		transition:
			background-color 0.15s ease,
			color 0.15s ease,
			border-color 0.15s ease;
	}

	:global(.dark) .editor-rail-btn {
		color: var(--grove-text-muted);
	}

	.editor-rail-btn:hover {
		background: var(--grove-overlay-10);
		color: var(--color-primary);
	}

	:global(.dark) .editor-rail-btn:hover {
		background: var(--grove-overlay-15);
		color: var(--grove-accent);
	}

	.editor-rail-btn:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	.editor-rail-btn:active {
		transform: translateY(1px);
	}

	.editor-rail-btn.active {
		background: var(--grove-accent-15);
		border-color: var(--grove-accent-40);
		color: var(--color-primary);
	}

	:global(.dark) .editor-rail-btn.active {
		color: var(--grove-accent);
	}

	.editor-rail-icon-wrap {
		position: relative;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	:global(.editor-rail-icon) {
		width: 1.15rem;
		height: 1.15rem;
	}

	:global(.editor-rail-close-icon) {
		width: 1rem;
		height: 1rem;
	}

	.editor-rail-label {
		font-size: 0.66rem;
		font-weight: 500;
		letter-spacing: 0.01em;
		line-height: 1;
	}

	.editor-rail-badge-count {
		position: absolute;
		top: -0.5rem;
		right: -0.65rem;
		min-width: 1rem;
		height: 1rem;
		padding: 0 0.25rem;
		display: flex;
		align-items: center;
		justify-content: center;
		font-size: 0.62rem;
		font-weight: 600;
		line-height: 1;
		border-radius: 999px;
		background: var(--color-primary);
		color: #fff;
	}

	.editor-rail-badge-dot {
		position: absolute;
		bottom: -0.15rem;
		right: -0.4rem;
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 50%;
		border: 1px solid var(--glass-bg);
	}
	.editor-rail-badge-dot-warning {
		background: hsl(var(--warning));
	}
	.editor-rail-badge-dot-info {
		background: var(--color-primary);
	}

	/* ---------- panel ----------
	   Overlays the editor canvas instead of sharing flex width with it —
	   opening/closing the panel must never change the editor's width or
	   push total row width past the viewport (a fixed-width flex sibling
	   did exactly that alongside Arbor's own nav sidebar on ordinary
	   laptop widths). */
	.editor-rail-panel {
		position: absolute;
		top: 0;
		right: calc(100% + 0.75rem);
		z-index: 20;
		width: 340px;
		max-width: min(340px, calc(100vw - 3rem));
		max-height: 100%;
		display: flex;
		flex-direction: column;
		background: var(--glass-bg);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		border: 1px solid var(--grove-overlay-15);
		border-radius: var(--border-radius-standard);
		box-shadow: var(--shadow-lg);
		overflow: hidden;
		animation: editor-rail-slide-in 0.2s ease;
	}

	@keyframes editor-rail-slide-in {
		from {
			opacity: 0;
			transform: translateX(12px);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.editor-rail-panel {
			animation: none;
		}
	}

	.editor-rail-panel-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 0.875rem 1rem;
		background: var(--grove-overlay-5);
		border-bottom: 1px solid var(--grove-border-subtle);
		flex-shrink: 0;
	}

	.editor-rail-panel-header h2 {
		margin: 0;
		font-size: 0.95rem;
		font-weight: 600;
		color: var(--color-primary);
	}

	:global(.dark) .editor-rail-panel-header h2 {
		color: var(--grove-accent);
	}

	.editor-rail-panel-close {
		display: flex;
		align-items: center;
		justify-content: center;
		min-width: 44px;
		min-height: 44px;
		background: transparent;
		border: none;
		color: var(--color-text-subtle);
		cursor: pointer;
		border-radius: var(--border-radius-button);
		transition:
			background-color 0.15s ease,
			color 0.15s ease;
	}

	:global(.dark) .editor-rail-panel-close {
		color: var(--grove-text-subtle);
	}

	.editor-rail-panel-close:hover {
		background: var(--grove-overlay-10);
		color: var(--color-primary);
	}

	:global(.dark) .editor-rail-panel-close:hover {
		background: var(--grove-overlay-15);
		color: var(--grove-accent);
	}

	.editor-rail-panel-close:focus-visible {
		outline: 2px solid var(--color-primary);
		outline-offset: 2px;
	}

	.editor-rail-panel-body {
		padding: 1rem;
		overflow-y: auto;
		max-height: calc(100vh - 220px);
	}

	/* ---------- responsive: bottom-sheet overlay below ~900px ---------- */
	@media (max-width: 900px) {
		.editor-rail {
			flex-direction: row-reverse;
			justify-content: flex-end;
		}

		.editor-rail-nav {
			flex-direction: row;
		}

		.editor-rail-panel {
			position: fixed;
			left: 0;
			right: 0;
			bottom: 0;
			top: auto;
			width: 100%;
			max-width: 100%;
			margin-right: 0;
			max-height: 70vh;
			border-radius: var(--border-radius-standard) var(--border-radius-standard) 0 0;
			z-index: 50;
			animation: editor-rail-slide-up 0.2s ease;
		}

		@keyframes editor-rail-slide-up {
			from {
				opacity: 0;
				transform: translateY(16px);
			}
			to {
				opacity: 1;
				transform: translateY(0);
			}
		}

		@media (prefers-reduced-motion: reduce) {
			.editor-rail-panel {
				animation: none;
			}
		}

		.editor-rail-panel-body {
			max-height: calc(70vh - 60px);
		}
	}

	/* ---------- screen-reader only ---------- */
	.visually-hidden {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border: 0;
	}
</style>
