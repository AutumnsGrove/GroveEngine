<script lang="ts">
	// QueueFilters.svelte // accent-ok — theme moderation component uses color palette definitions
	// Filter controls, search, status toggles, and bulk actions for the moderation queue

	import type { CommunityThemeStatus } from "../../types.js";

	interface Props {
		searchQuery: string;
		statusFilter: CommunityThemeStatus | "all";
		sortBy: "newest" | "oldest" | "popular";
		filteredCount: number;
		selectedCount: number;
		onSearchChange: (value: string) => void;
		onStatusFilterChange: (value: CommunityThemeStatus | "all") => void;
		onSortChange: (value: "newest" | "oldest" | "popular") => void;
		onBulkApprove: () => void;
		onBulkReject: () => void;
		onClearSelection: () => void;
	}

	let {
		searchQuery,
		statusFilter,
		sortBy,
		filteredCount,
		selectedCount,
		onSearchChange,
		onStatusFilterChange,
		onSortChange,
		onBulkApprove,
		onBulkReject,
		onClearSelection,
	}: Props = $props();

	// Status options
	const statusOptions: { value: CommunityThemeStatus | "all"; label: string }[] = [
		{ value: "all", label: "All Statuses" },
		{ value: "pending", label: "Pending" },
		{ value: "in_review", label: "In Review" },
		{ value: "approved", label: "Approved" },
		{ value: "featured", label: "Featured" },
		{ value: "changes_requested", label: "Changes Requested" },
		{ value: "rejected", label: "Rejected" },
		{ value: "removed", label: "Removed" },
	];
</script>

<!-- Controls -->
<div class="controls">
	<div class="search-bar">
		<svg
			class="search-icon"
			viewBox="0 0 24 24"
			fill="none"
			stroke="currentColor"
			stroke-width="2"
			aria-hidden="true"
		>
			<circle cx="11" cy="11" r="8"></circle>
			<path d="m21 21-4.35-4.35"></path>
		</svg>
		<input
			type="text"
			value={searchQuery}
			oninput={(e) => onSearchChange(e.currentTarget.value)}
			placeholder="Search by name, description, creator, or tags..."
			class="search-input"
			aria-label="Search themes"
		/>
	</div>

	<div class="filters">
		<select
			value={statusFilter}
			onchange={(e) => onStatusFilterChange(e.currentTarget.value as CommunityThemeStatus | "all")}
			class="filter-select"
			aria-label="Filter by status"
		>
			{#each statusOptions as option}
				<option value={option.value}>{option.label}</option>
			{/each}
		</select>

		<select
			value={sortBy}
			onchange={(e) => onSortChange(e.currentTarget.value as "newest" | "oldest" | "popular")}
			class="filter-select"
			aria-label="Sort themes"
		>
			<option value="newest">Newest First</option>
			<option value="oldest">Oldest First</option>
			<option value="popular">Most Popular</option>
		</select>

		<div class="results-count">
			{filteredCount}
			{filteredCount === 1 ? "theme" : "themes"}
		</div>
	</div>

	{#if selectedCount > 0}
		<div class="bulk-actions">
			<span class="selected-count">{selectedCount} selected</span>
			<button type="button" class="bulk-action-btn approve" onclick={onBulkApprove}>
				Bulk Approve
			</button>
			<button type="button" class="bulk-action-btn reject" onclick={onBulkReject}>
				Bulk Reject
			</button>
			<button type="button" class="bulk-action-btn clear" onclick={onClearSelection}>
				Clear Selection
			</button>
		</div>
	{/if}
</div>

<!-- Keyboard shortcuts hint -->
<div class="keyboard-hint">
	<kbd>j</kbd>/<kbd>k</kbd> navigate • <kbd>Enter</kbd> preview
</div>

<style>
	.controls {
		margin-bottom: 1.5rem;
		display: flex;
		flex-direction: column;
		gap: 1rem;
	}

	.search-bar {
		position: relative;
	}

	.search-icon {
		position: absolute;
		left: 1rem;
		top: 50%;
		transform: translateY(-50%);
		width: 1.25rem;
		height: 1.25rem;
		color: var(--color-foreground-muted, #666);
		pointer-events: none;
	}

	.search-input {
		width: 100%;
		padding: 0.75rem 1rem 0.75rem 3rem;
		border: 2px solid var(--color-border, #e5e5e5);
		border-radius: 0.5rem;
		font-size: 1rem;
		font-family: inherit;
		background: var(--color-surface, #fff);
		color: var(--color-foreground, #111);
		transition: border-color 0.2s ease;
	}

	.search-input:focus {
		outline: none;
		border-color: var(--color-accent, #16a34a); /* accent-ok */
		box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-accent, #16a34a) 20%, transparent); /* accent-ok */
	}

	.filters {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		align-items: center;
	}

	.filter-select {
		padding: 0.5rem 0.75rem;
		border: 2px solid var(--color-border, #e5e5e5);
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-family: inherit;
		background: var(--color-surface, #fff);
		color: var(--color-foreground, #111);
		cursor: pointer;
		transition: border-color 0.2s ease;
	}

	.filter-select:focus {
		outline: none;
		border-color: var(--color-accent, #16a34a); /* accent-ok */
	}

	.results-count {
		padding: 0.5rem 0.75rem;
		background: var(--color-surface, #f5f5f5);
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-foreground-muted, #666);
	}

	.bulk-actions {
		display: flex;
		flex-wrap: wrap;
		gap: 0.75rem;
		align-items: center;
		padding: 0.75rem;
		background: var(--color-surface, #f5f5f5);
		border-radius: 0.5rem;
		border: 2px solid var(--color-border, #e5e5e5);
	}

	.selected-count {
		font-weight: 600;
		color: var(--color-foreground, #111);
	}

	.bulk-action-btn {
		padding: 0.5rem 1rem;
		border: none;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.bulk-action-btn.approve {
		background: #16a34a; /* accent-ok */
		color: #fff;
	}

	.bulk-action-btn.approve:hover {
		background: #15803d; /* accent-ok */
	}

	.bulk-action-btn.reject {
		background: #dc2626;
		color: #fff;
	}

	.bulk-action-btn.reject:hover {
		background: #b91c1c;
	}

	.bulk-action-btn.clear {
		background: transparent;
		color: var(--color-foreground, #111);
		border: 2px solid var(--color-border, #e5e5e5);
	}

	.bulk-action-btn.clear:hover {
		background: var(--color-surface, #f5f5f5);
	}

	.keyboard-hint {
		margin-bottom: 1rem;
		font-size: 0.875rem;
		color: var(--color-foreground-muted, #666);
	}

	kbd {
		padding: 0.125rem 0.375rem;
		background: var(--color-surface, #f5f5f5);
		border: 1px solid var(--color-border, #e5e5e5);
		border-radius: 0.25rem;
		font-family: var(--font-mono, monospace);
		font-size: 0.75rem;
	}

	@media (prefers-reduced-motion: reduce) {
		* {
			transition: none !important;
		}
	}
</style>
