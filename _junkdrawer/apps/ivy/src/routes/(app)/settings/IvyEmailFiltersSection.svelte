<script lang="ts">
	import Icon from "$lib/components/Icons.svelte";

	interface FilterRule {
		id: string;
		type: "blocklist" | "allowlist";
		pattern: string;
		match_type: "exact" | "domain" | "contains";
		notes: string | null;
		created_at: string;
	}

	interface Props {
		filters: FilterRule[];
		loadingFilters: boolean;
		newFilterPattern: string;
		newFilterType: "blocklist" | "allowlist";
		newFilterMatchType: "exact" | "domain" | "contains";
		addingFilter: boolean;
		onNewFilterPatternChange: (value: string) => void;
		onNewFilterTypeChange: (value: "blocklist" | "allowlist") => void;
		onNewFilterMatchTypeChange: (value: "exact" | "domain" | "contains") => void;
		onAddFilter: () => void;
		onRemoveFilter: (id: string) => void;
	}

	let {
		filters,
		loadingFilters,
		newFilterPattern,
		newFilterType,
		newFilterMatchType,
		addingFilter,
		onNewFilterPatternChange,
		onNewFilterTypeChange,
		onNewFilterMatchTypeChange,
		onAddFilter,
		onRemoveFilter,
	}: Props = $props();
</script>

<section class="settings-section">
	<h2 class="section-title">Email Filters</h2>

	<div class="setting-card">
		<!-- Add filter -->
		<div class="setting-item column">
			<div class="setting-info full">
				<Icon name="settings" size={20} />
				<div class="setting-details">
					<span class="setting-label">Add filter rule</span>
					<span class="setting-description">Block or allow specific senders and domains</span>
				</div>
			</div>
			<div class="filter-form">
				<select
					class="select-input"
					value={newFilterType}
					onchange={(e) =>
						onNewFilterTypeChange(e.currentTarget.value as "blocklist" | "allowlist")}
					aria-label="Filter type"
				>
					<option value="blocklist">Block</option>
					<option value="allowlist">Allow</option>
				</select>
				<select
					class="select-input"
					value={newFilterMatchType}
					onchange={(e) =>
						onNewFilterMatchTypeChange(e.currentTarget.value as "exact" | "domain" | "contains")}
					aria-label="Match type"
				>
					<option value="domain">Domain</option>
					<option value="exact">Exact</option>
					<option value="contains">Contains</option>
				</select>
				<input
					type="text"
					class="text-input filter-pattern"
					placeholder="e.g. instagram.com"
					value={newFilterPattern}
					oninput={(e) => onNewFilterPatternChange(e.currentTarget.value)}
					onkeydown={(e) => e.key === "Enter" && onAddFilter()}
					aria-label="Filter pattern"
				/>
				<button
					class="btn-outline"
					onclick={onAddFilter}
					disabled={addingFilter || !newFilterPattern.trim()}
				>
					{addingFilter ? "Adding..." : "Add"}
				</button>
			</div>
		</div>

		<div class="setting-divider"></div>

		<!-- Filter list -->
		<div class="setting-item column">
			{#if loadingFilters}
				<p class="filter-loading">Loading filters...</p>
			{:else if filters.length === 0}
				<p class="filter-empty">
					No custom filters yet. Default junk domains (Instagram, Facebook, LinkedIn, etc.) are
					blocked automatically.
				</p>
			{:else}
				<div class="filter-list">
					{#each filters as filter (filter.id)}
						<div class="filter-row">
							<span
								class="filter-type"
								class:blocklist={filter.type === "blocklist"}
								class:allowlist={filter.type === "allowlist"}
							>
								{filter.type === "blocklist" ? "Block" : "Allow"}
							</span>
							<span class="filter-match">{filter.match_type}</span>
							<span class="filter-pattern-text">{filter.pattern}</span>
							<button
								class="filter-remove"
								onclick={() => onRemoveFilter(filter.id)}
								title="Remove filter"
								aria-label={`Remove filter for ${filter.pattern}`}
							>
								<Icon name="x" size={14} />
							</button>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>
</section>

<style>
	.settings-section {
		margin-bottom: var(--space-8);
	}

	.section-title {
		font-size: var(--text-sm);
		font-weight: var(--font-semibold);
		color: var(--color-text-tertiary);
		text-transform: uppercase;
		letter-spacing: 0.05em;
		margin-bottom: var(--space-3);
	}

	.setting-card {
		background: var(--color-bg-secondary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-lg);
		overflow: hidden;
	}

	.setting-item {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: var(--space-4);
		gap: var(--space-4);
	}

	.setting-item.column {
		flex-direction: column;
		align-items: stretch;
	}

	.setting-info {
		display: flex;
		align-items: center;
		gap: var(--space-3);
		color: var(--color-text-secondary);
	}

	.setting-info.full {
		width: 100%;
	}

	.setting-details {
		display: flex;
		flex-direction: column;
		gap: var(--space-1);
	}

	.setting-label {
		font-weight: var(--font-medium);
		color: var(--color-text-primary);
	}

	.setting-description {
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
	}

	.setting-divider {
		height: 1px;
		background: var(--color-border-subtle);
		margin: 0 var(--space-4);
	}

	.btn-outline {
		padding: var(--space-2) var(--space-4);
		background: transparent;
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text-secondary);
		font-weight: var(--font-medium);
		font-size: var(--text-sm);
		transition: all var(--transition-fast);
		white-space: nowrap;
	}

	.btn-outline:hover {
		background: var(--color-surface-hover);
		color: var(--color-text-primary);
		border-color: var(--color-border-strong);
	}

	.select-input {
		padding: var(--space-2) var(--space-3);
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text-primary);
		font-size: var(--text-sm);
		cursor: pointer;
	}

	.select-input:focus {
		outline: none;
		border-color: var(--color-primary);
	}

	.text-input {
		padding: var(--space-2) var(--space-3);
		background: var(--color-bg-tertiary);
		border: 1px solid var(--color-border);
		border-radius: var(--radius-md);
		color: var(--color-text-primary);
		font-size: var(--text-sm);
	}

	.text-input:focus {
		outline: none;
		border-color: var(--color-primary);
	}

	.text-input::placeholder {
		color: var(--color-text-tertiary);
	}

	.filter-form {
		display: flex;
		gap: var(--space-2);
		margin-top: var(--space-3);
		flex-wrap: wrap;
	}

	.filter-pattern {
		flex: 1;
		min-width: 150px;
	}

	.filter-loading,
	.filter-empty {
		font-size: var(--text-sm);
		color: var(--color-text-tertiary);
		padding: var(--space-2) 0;
	}

	.filter-list {
		display: flex;
		flex-direction: column;
		gap: var(--space-2);
		width: 100%;
	}

	.filter-row {
		display: flex;
		align-items: center;
		gap: var(--space-2);
		padding: var(--space-2);
		background: var(--color-bg-tertiary);
		border-radius: var(--radius-md);
	}

	.filter-type {
		font-size: var(--text-xs);
		font-weight: var(--font-semibold);
		padding: 1px 6px;
		border-radius: var(--radius-sm);
		text-transform: uppercase;
	}

	.filter-type.blocklist {
		background: var(--color-error);
		color: white;
	}

	.filter-type.allowlist {
		background: var(--color-primary);
		color: white;
	}

	.filter-match {
		font-size: var(--text-xs);
		color: var(--color-text-tertiary);
	}

	.filter-pattern-text {
		flex: 1;
		font-size: var(--text-sm);
		color: var(--color-text-primary);
		font-family: monospace;
	}

	.filter-remove {
		padding: var(--space-1);
		border-radius: var(--radius-sm);
		color: var(--color-text-muted);
		transition: all var(--transition-fast);
	}

	.filter-remove:hover {
		color: var(--color-error);
		background: var(--color-surface-hover);
	}
</style>
