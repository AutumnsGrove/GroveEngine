<script lang="ts">
	// QueueList.svelte // accent-ok — theme moderation component uses color palette definitions
	// The scrollable list of items — desktop table + mobile card views

	import type { CommunityTheme, CommunityThemeStatus } from "../../types.js";
	import { validateThemeContrast } from "../../utils/contrast.js";
	import ThemeRating from "../ThemeRating.svelte";
	import QueueItem from "./QueueItem.svelte";

	interface Props {
		themes: CommunityTheme[];
		currentThemeIndex: number;
		selectedThemes: Set<string>;
		showCustomizations: string | null;
		wcagResults: Map<string, ReturnType<typeof validateThemeContrast>>;
		onToggleSelection: (themeId: string) => void;
		onToggleSelectAll: () => void;
		onPreview: (theme: CommunityTheme) => void;
		onToggleCustomizations: (themeId: string) => void;
		onRunWCAG: (theme: CommunityTheme) => void;
		onCloseWCAG: (themeId: string) => void;
		onStatusAction: (theme: CommunityTheme, status: CommunityThemeStatus) => void;
	}

	let {
		themes,
		currentThemeIndex,
		selectedThemes,
		showCustomizations,
		wcagResults,
		onToggleSelection,
		onToggleSelectAll,
		onPreview,
		onToggleCustomizations,
		onRunWCAG,
		onCloseWCAG,
		onStatusAction,
	}: Props = $props();

	// Status badge colors (for mobile view)
	function getStatusColor(status: CommunityThemeStatus): string {
		switch (status) {
			case "pending":
				return "#f59e0b";
			case "in_review":
				return "#3b82f6";
			case "approved":
				return "#16a34a"; /* accent-ok */
			case "featured":
				return "#9333ea";
			case "changes_requested":
				return "#ea580c";
			case "rejected":
				return "#dc2626";
			case "removed":
				return "#6b7280";
			case "draft":
				return "#9ca3af";
			default:
				return "#6b7280";
		}
	}

	function getAverageRating(theme: CommunityTheme): number {
		if (theme.ratingCount === 0) return 0;
		return theme.ratingSum / theme.ratingCount;
	}

	function formatDate(timestamp: number): string {
		return new Date(timestamp).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
		});
	}

	function shortenCreatorId(id: string): string {
		if (id.length <= 12) return id;
		return `${id.slice(0, 8)}...${id.slice(-4)}`;
	}
</script>

{#if themes.length === 0}
	<div class="no-results">
		<p>No themes found matching your filters.</p>
	</div>
{:else}
	<!-- Desktop: Table layout -->
	<div class="desktop-view">
		<table class="themes-table">
			<thead>
				<tr>
					<th class="checkbox-col">
						<input
							type="checkbox"
							checked={selectedThemes.size === themes.length && themes.length > 0}
							onchange={onToggleSelectAll}
							aria-label="Select all themes"
						/>
					</th>
					<th>Theme</th>
					<th>Creator</th>
					<th>Base</th>
					<th>Submitted</th>
					<th>Status</th>
					<th class="stats-col">Stats</th>
					<th class="actions-col">Actions</th>
				</tr>
			</thead>
			<tbody>
				{#each themes as theme, index (theme.id)}
					<QueueItem
						{theme}
						{index}
						isCurrent={index === currentThemeIndex}
						isSelected={selectedThemes.has(theme.id)}
						showCustomizations={showCustomizations === theme.id}
						wcagResult={wcagResults.get(theme.id)}
						{onToggleSelection}
						{onPreview}
						{onToggleCustomizations}
						{onRunWCAG}
						{onCloseWCAG}
						{onStatusAction}
					/>
				{/each}
			</tbody>
		</table>
	</div>

	<!-- Mobile: Card layout -->
	<div class="mobile-view">
		{#each themes as theme, index (theme.id)}
			{@const rating = getAverageRating(theme)}
			{@const isCurrent = index === currentThemeIndex}

			<div class="theme-card" class:current={isCurrent} data-theme-index={index}>
				<div class="card-header">
					<input
						type="checkbox"
						checked={selectedThemes.has(theme.id)}
						onchange={() => onToggleSelection(theme.id)}
						aria-label="Select {theme.name}"
					/>
					<h3>{theme.name}</h3>
					<span class="status-badge" style="background-color: {getStatusColor(theme.status)}">
						{theme.status.replace("_", " ")}
					</span>
				</div>

				{#if theme.description}
					<p class="description">{theme.description}</p>
				{/if}

				<div class="card-meta">
					<div class="meta-item">
						<strong>Creator:</strong>
						{shortenCreatorId(theme.creatorTenantId)}
					</div>
					<div class="meta-item">
						<strong>Base:</strong> <span class="base-theme-badge">{theme.baseTheme}</span>
					</div>
					<div class="meta-item">
						<strong>Submitted:</strong>
						{formatDate(theme.createdAt)}
					</div>
				</div>

				<div class="card-stats">
					<div class="rating-display">
						<ThemeRating {rating} readonly />
						<span class="rating-text">({theme.ratingCount})</span>
					</div>
					<div class="downloads">
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							aria-hidden="true"
						>
							<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
							<polyline points="7 10 12 15 17 10"></polyline>
							<line x1="12" y1="15" x2="12" y2="3"></line>
						</svg>
						{theme.downloads.toLocaleString()}
					</div>
				</div>

				{#if theme.tags && theme.tags.length > 0}
					<div class="tags">
						{#each theme.tags as tag}
							<span class="tag">{tag}</span>
						{/each}
					</div>
				{/if}

				<div class="card-actions">
					<button type="button" class="card-action-btn" onclick={() => onPreview(theme)}>
						Preview
					</button>
					<button
						type="button"
						class="card-action-btn"
						onclick={() => onToggleCustomizations(theme.id)}
					>
						Customizations
					</button>
					<button type="button" class="card-action-btn" onclick={() => onRunWCAG(theme)}>
						WCAG Check
					</button>
				</div>

				<div class="card-status-actions">
					<button
						type="button"
						class="status-action-btn approve"
						onclick={() => onStatusAction(theme, "approved")}
					>
						Approve
					</button>
					<button
						type="button"
						class="status-action-btn feature"
						onclick={() => onStatusAction(theme, "featured")}
					>
						Feature
					</button>
					<button
						type="button"
						class="status-action-btn changes"
						onclick={() => onStatusAction(theme, "changes_requested")}
					>
						Request Changes
					</button>
					<button
						type="button"
						class="status-action-btn reject"
						onclick={() => onStatusAction(theme, "rejected")}
					>
						Reject
					</button>
				</div>

				<!-- Customizations panel (mobile) -->
				{#if showCustomizations === theme.id}
					<div class="customizations-panel mobile">
						<h4>Customizations</h4>

						{#if theme.customColors}
							<div class="customization-section">
								<h5>Colors</h5>
								<div class="color-grid">
									{#each Object.entries(theme.customColors) as [key, value]}
										<div class="color-item">
											<div class="color-swatch" style="background-color: {value}"></div>
											<span class="color-label">{key}</span>
											<span class="color-value">{value}</span>
										</div>
									{/each}
								</div>
							</div>
						{/if}

						{#if theme.customTypography}
							<div class="customization-section">
								<h5>Typography</h5>
								<div class="typography-grid">
									{#each Object.entries(theme.customTypography) as [key, value]}
										<div class="typography-item">
											<span class="typography-label">{key}:</span>
											<span class="typography-value">{value}</span>
										</div>
									{/each}
								</div>
							</div>
						{/if}

						{#if theme.customLayout}
							<div class="customization-section">
								<h5>Layout</h5>
								<div class="layout-grid">
									{#each Object.entries(theme.customLayout) as [key, value]}
										<div class="layout-item">
											<span class="layout-label">{key}:</span>
											<span class="layout-value">{value}</span>
										</div>
									{/each}
								</div>
							</div>
						{/if}

						{#if theme.customCSS}
							<div class="customization-section">
								<h5>Custom CSS</h5>
								<pre class="custom-css">{theme.customCSS}</pre>
							</div>
						{/if}
					</div>
				{/if}

				<!-- WCAG results (mobile) -->
				{#if wcagResults.has(theme.id)}
					{@const result = wcagResults.get(theme.id)}
					<div class="wcag-panel mobile" class:valid={result?.valid} class:invalid={!result?.valid}>
						<h4>WCAG Validation</h4>

						{#if result?.valid}
							<div class="wcag-success">
								<svg
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									aria-hidden="true"
								>
									<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path>
									<polyline points="22 4 12 14.01 9 11.01"></polyline>
								</svg>
								<span>Passes WCAG AA</span>
							</div>

							{#if result.warnings && result.warnings.length > 0}
								<div class="wcag-warnings">
									<h5>Warnings:</h5>
									<ul>
										{#each result.warnings as warning}
											<li>{warning}</li>
										{/each}
									</ul>
								</div>
							{/if}
						{:else}
							<div class="wcag-error">
								<svg
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									aria-hidden="true"
								>
									<circle cx="12" cy="12" r="10"></circle>
									<line x1="15" y1="9" x2="9" y2="15"></line>
									<line x1="9" y1="9" x2="15" y2="15"></line>
								</svg>
								<span>{result?.error}</span>
							</div>
						{/if}

						<button type="button" class="close-wcag" onclick={() => onCloseWCAG(theme.id)}>
							Close
						</button>
					</div>
				{/if}
			</div>
		{/each}
	</div>
{/if}

<style>
	.no-results {
		text-align: center;
		padding: 3rem 1.5rem;
		color: var(--color-foreground-muted, #666);
	}

	/* Desktop view - Table */
	.mobile-view {
		display: none;
	}

	.themes-table {
		width: 100%;
		border-collapse: separate;
		border-spacing: 0;
		background: var(--color-surface, #fff);
		border: 2px solid var(--color-border, #e5e5e5);
		border-radius: 0.5rem;
		overflow: hidden;
	}

	.themes-table thead {
		background: var(--color-surface, #f5f5f5);
	}

	.themes-table th {
		padding: 0.75rem 1rem;
		text-align: left;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-foreground, #111);
		border-bottom: 2px solid var(--color-border, #e5e5e5);
	}

	.themes-table :global(td) {
		padding: 1rem;
		border-bottom: 1px solid var(--color-border, #e5e5e5);
		font-size: 0.875rem;
		color: var(--color-foreground, #111);
	}

	.checkbox-col {
		width: 3rem;
	}

	.stats-col {
		min-width: 150px;
	}

	.actions-col {
		min-width: 180px;
	}

	/* Mobile view styles */
	@media (max-width: 1024px) {
		.desktop-view {
			display: none;
		}

		.mobile-view {
			display: block;
		}

		.theme-card {
			background: var(--color-surface, #fff);
			border: 2px solid var(--color-border, #e5e5e5);
			border-radius: 0.75rem;
			padding: 1rem;
			margin-bottom: 1rem;
		}

		.theme-card.current {
			background: color-mix(in srgb, var(--color-accent, #16a34a) 10%, transparent); /* accent-ok */
		}

		.card-header {
			display: flex;
			align-items: start;
			gap: 0.75rem;
			margin-bottom: 0.75rem;
		}

		.card-header h3 {
			flex: 1;
			font-size: 1.125rem;
			font-weight: 600;
			margin: 0;
		}

		.card-header input[type="checkbox"] {
			margin-top: 0.25rem;
		}

		.status-badge {
			display: inline-block;
			padding: 0.25rem 0.75rem;
			border-radius: 0.375rem;
			font-size: 0.75rem;
			font-weight: 600;
			color: #fff;
			text-transform: capitalize;
		}

		.description {
			font-size: 0.875rem;
			color: var(--color-foreground-muted, #666);
			margin: 0 0 1rem 0;
			line-height: 1.5;
		}

		.card-meta {
			display: flex;
			flex-direction: column;
			gap: 0.5rem;
			margin-bottom: 1rem;
			font-size: 0.875rem;
		}

		.meta-item strong {
			font-weight: 600;
		}

		.base-theme-badge {
			padding: 0.125rem 0.5rem;
			background: var(--color-surface, #f5f5f5);
			border: 1px solid var(--color-border, #e5e5e5);
			border-radius: 0.25rem;
			font-size: 0.75rem;
			font-weight: 600;
		}

		.card-stats {
			display: flex;
			align-items: center;
			gap: 1rem;
			margin-bottom: 1rem;
		}

		.rating-display {
			display: flex;
			align-items: center;
			gap: 0.5rem;
		}

		.rating-text {
			font-size: 0.75rem;
			color: var(--color-foreground-muted, #666);
		}

		.downloads {
			display: flex;
			align-items: center;
			gap: 0.25rem;
			font-size: 0.75rem;
			color: var(--color-foreground-muted, #666);
		}

		.downloads svg {
			width: 1rem;
			height: 1rem;
		}

		.tags {
			display: flex;
			flex-wrap: wrap;
			gap: 0.25rem;
			margin-bottom: 1rem;
		}

		.tag {
			padding: 0.125rem 0.5rem;
			background: var(--color-surface, #f5f5f5);
			border: 1px solid var(--color-border, #e5e5e5);
			border-radius: 0.25rem;
			font-size: 0.6875rem;
		}

		.card-actions {
			display: grid;
			grid-template-columns: repeat(3, 1fr);
			gap: 0.5rem;
			margin-bottom: 0.75rem;
		}

		.card-action-btn {
			padding: 0.5rem;
			background: var(--color-accent, #16a34a); /* accent-ok */
			color: #fff;
			border: none;
			border-radius: 0.375rem;
			font-size: 0.875rem;
			font-weight: 600;
			cursor: pointer;
			transition: all 0.2s ease;
		}

		.card-action-btn:hover {
			background: color-mix(in srgb, var(--color-accent, #16a34a) 85%, black); /* accent-ok */
		}

		.card-status-actions {
			display: grid;
			grid-template-columns: repeat(2, 1fr);
			gap: 0.5rem;
		}

		.status-action-btn {
			padding: 0.5rem;
			border: 2px solid;
			border-radius: 0.375rem;
			font-size: 0.75rem;
			font-weight: 600;
			cursor: pointer;
			transition: all 0.2s ease;
		}

		.status-action-btn.approve {
			border-color: #16a34a; /* accent-ok */
			color: #16a34a; /* accent-ok */
			background: transparent;
		}

		.status-action-btn.approve:hover {
			background: #16a34a; /* accent-ok */
			color: #fff;
		}

		.status-action-btn.feature {
			border-color: #9333ea;
			color: #9333ea;
			background: transparent;
		}

		.status-action-btn.feature:hover {
			background: #9333ea;
			color: #fff;
		}

		.status-action-btn.changes {
			border-color: #ea580c;
			color: #ea580c;
			background: transparent;
		}

		.status-action-btn.changes:hover {
			background: #ea580c;
			color: #fff;
		}

		.status-action-btn.reject {
			border-color: #dc2626;
			color: #dc2626;
			background: transparent;
		}

		.status-action-btn.reject:hover {
			background: #dc2626;
			color: #fff;
		}

		.customizations-panel.mobile,
		.wcag-panel.mobile {
			margin-top: 1rem;
			padding: 1rem;
			background: var(--color-surface, #f9fafb);
			border-radius: 0.5rem;
			border: 2px solid var(--color-border, #e5e5e5);
		}

		.customizations-panel.mobile h4,
		.wcag-panel.mobile h4 {
			font-size: 1rem;
			font-weight: 600;
			margin: 0 0 1rem 0;
		}

		.customization-section {
			margin-bottom: 1.5rem;
		}

		.customization-section h5 {
			font-size: 0.875rem;
			font-weight: 600;
			margin: 0 0 0.75rem 0;
			color: var(--color-foreground-muted, #666);
			text-transform: uppercase;
			letter-spacing: 0.05em;
		}

		.color-grid {
			display: grid;
			grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
			gap: 0.75rem;
		}

		.color-item {
			display: flex;
			align-items: center;
			gap: 0.5rem;
		}

		.color-swatch {
			width: 2rem;
			height: 2rem;
			border-radius: 0.25rem;
			border: 2px solid var(--color-border, #e5e5e5);
		}

		.color-label {
			font-size: 0.8125rem;
			font-weight: 500;
		}

		.color-value {
			font-family: var(--font-mono, monospace);
			font-size: 0.75rem;
			color: var(--color-foreground-muted, #666);
		}

		.typography-grid,
		.layout-grid {
			display: grid;
			gap: 0.5rem;
		}

		.typography-item,
		.layout-item {
			font-size: 0.875rem;
		}

		.typography-label,
		.layout-label {
			font-weight: 600;
			margin-right: 0.5rem;
		}

		.typography-value,
		.layout-value {
			font-family: var(--font-mono, monospace);
			color: var(--color-foreground-muted, #666);
		}

		.custom-css {
			padding: 1rem;
			background: var(--color-background, #fff);
			border: 2px solid var(--color-border, #e5e5e5);
			border-radius: 0.375rem;
			font-family: var(--font-mono, monospace);
			font-size: 0.75rem;
			overflow-x: auto;
			max-height: 300px;
			overflow-y: auto;
		}

		.wcag-success,
		.wcag-error {
			display: flex;
			align-items: center;
			gap: 0.75rem;
			padding: 1rem;
			border-radius: 0.375rem;
			margin-bottom: 1rem;
		}

		.wcag-success {
			background: color-mix(in srgb, #16a34a 10%, transparent); /* accent-ok */
			color: #15803d; /* accent-ok */
		}

		.wcag-success svg {
			width: 1.5rem;
			height: 1.5rem;
		}

		.wcag-error {
			background: color-mix(in srgb, #dc2626 10%, transparent);
			color: #b91c1c;
		}

		.wcag-error svg {
			width: 1.5rem;
			height: 1.5rem;
		}

		.wcag-warnings {
			margin-top: 1rem;
		}

		.wcag-warnings h5 {
			font-size: 0.875rem;
			font-weight: 600;
			margin: 0 0 0.5rem 0;
		}

		.wcag-warnings ul {
			margin: 0;
			padding-left: 1.5rem;
			font-size: 0.875rem;
			color: var(--color-foreground-muted, #666);
		}

		.wcag-warnings li {
			margin-bottom: 0.25rem;
		}

		.close-wcag {
			padding: 0.5rem 1rem;
			background: transparent;
			border: 2px solid var(--color-border, #e5e5e5);
			border-radius: 0.375rem;
			font-size: 0.875rem;
			font-weight: 600;
			cursor: pointer;
			transition: all 0.2s ease;
		}

		.close-wcag:hover {
			background: var(--color-surface, #f5f5f5);
		}

		.wcag-panel.valid {
			border-color: #16a34a; /* accent-ok */
		}

		.wcag-panel.invalid {
			border-color: #dc2626;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		* {
			transition: none !important;
		}
	}

	@media (prefers-contrast: high) {
		.theme-card {
			border-width: 3px;
		}
	}
</style>
