<script lang="ts">
	/**
	 * CurioShelves — Universal shelf display with 5 display modes (orchestrator)
	 *
	 * Fetches shelves from the API and dispatches rendering to mode-specific children.
	 */
	import type { Shelf } from "./shelf-types.js";
	import ShelfCoverGrid from "./ShelfCoverGrid.svelte";
	import ShelfCardList from "./ShelfCardList.svelte";
	import ShelfButtons from "./ShelfButtons.svelte";
	import ShelfSpines from "./ShelfSpines.svelte";
	import ShelfMasonry from "./ShelfMasonry.svelte";

	let { arg = "" }: { arg?: string } = $props();

	let data = $state<{ shelves: Shelf[] } | null>(null);
	let loading = $state(true);
	let error = $state(false);
	let expandedSpine = $state<string | null>(null);

	$effect(() => {
		fetch("/api/curios/shelves") // csrf-ok
			.then((r) => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				return r.json() as Promise<typeof data>;
			})
			.then((d) => {
				data = d;
				loading = false;
			})
			.catch((err) => {
				console.warn("[CurioShelves] Failed to load:", err);
				error = true;
				loading = false;
			});
	});

	function resolveShelf(): Shelf | null {
		if (!data || !arg) return null;
		const num = Number(arg);
		if (Number.isInteger(num) && num >= 1 && num <= data.shelves.length) {
			return data.shelves[num - 1];
		}
		const byName = data.shelves.find((s) => s.name.toLowerCase() === arg.toLowerCase());
		if (byName) return byName;
		return data.shelves.find((s) => s.id === arg) ?? null;
	}

	function toggleSpine(itemId: string) {
		expandedSpine = expandedSpine === itemId ? null : itemId;
	}
</script>

{#if loading}
	<div class="grove-curio-skeleton" role="status">
		<span class="sr-only">Loading shelves...</span>
		<div class="shelves-skeleton">
			{#each Array(2) as _}
				<div class="skeleton-shelf">
					<div class="skeleton-title">&nbsp;</div>
					<div class="skeleton-items">
						{#each Array(3) as _}
							<div class="skeleton-item">&nbsp;</div>
						{/each}
					</div>
				</div>
			{/each}
		</div>
	</div>
{:else if error}
	<span class="grove-curio-error">Shelves unavailable</span>
{:else if data && !arg}
	<span class="grove-curio-error"
		>This shelf needs to be configured. Specify which shelf to display: <code
			>::shelves[My Shelf Name]::</code
		>
		or <code>::shelves[1]::</code></span
	>
{:else if data && arg && !resolveShelf()}
	<span class="grove-curio-error"
		>Shelf "{arg}" not found. Check the name or number and try again.</span
	>
{:else if data && resolveShelf()}
	{@const shelf = resolveShelf()!}
	<div class="shelves" role="region" aria-label="Shelves">
		<section class="shelf-section">
			<div class="shelf-header">
				<h2 class="shelf-title">{shelf.name}</h2>
				{#if shelf.description}
					<p class="shelf-description">{shelf.description}</p>
				{/if}
			</div>

			{#if shelf.items.length === 0}
				<p class="shelf-empty">Nothing on this shelf yet</p>
			{:else if shelf.displayMode === "cover-grid"}
				<ShelfCoverGrid items={shelf.items} {shelf} />
			{:else if shelf.displayMode === "card-list"}
				<ShelfCardList items={shelf.items} {shelf} />
			{:else if shelf.displayMode === "buttons"}
				<ShelfButtons items={shelf.items} />
			{:else if shelf.displayMode === "spines"}
				<ShelfSpines items={shelf.items} {shelf} {expandedSpine} onToggleSpine={toggleSpine} />
			{:else if shelf.displayMode === "masonry"}
				<ShelfMasonry items={shelf.items} {shelf} />
			{:else}
				<!-- Fallback to cover grid -->
				<ShelfCoverGrid items={shelf.items} {shelf} />
			{/if}
		</section>
	</div>
{/if}

<style>
	.shelves { padding: 0.5rem 0; }
	.shelf-section { margin-bottom: 2.5rem; }
	.shelf-section:last-child { margin-bottom: 0; }
	.shelf-header { margin-bottom: 1rem; }
	.shelf-title { margin: 0 0 0.25rem 0; font-size: 1.125rem; font-weight: 600; }
	.shelf-description { margin: 0; font-size: 0.875rem; opacity: 0.7; }
	.shelf-empty { margin: 1rem 0; font-size: 0.875rem; opacity: 0.6; font-style: italic; }

	.shelves-skeleton { display: flex; flex-direction: column; gap: 2rem; }
	.skeleton-shelf { display: flex; flex-direction: column; gap: 1rem; }
	.skeleton-title { height: 1.5rem; width: 50%; background: rgba(0,0,0,0.08); border-radius: 0.375rem; }
	.skeleton-items { display: grid; grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr)); gap: 1rem; }
	.skeleton-item { height: 12rem; background: rgba(0,0,0,0.06); border-radius: 0.375rem; }
	:global(.dark) .skeleton-title { background: rgba(255,255,255,0.1); }
	:global(.dark) .skeleton-item { background: rgba(255,255,255,0.08); }
</style>
