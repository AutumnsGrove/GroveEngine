<script lang="ts">
	import type { ShelfItem, Shelf } from "./shelf-types.js";
	import { spineColor, renderStars } from "./shelf-types.js";

	interface Props {
		items: ShelfItem[];
		shelf: Shelf;
		expandedSpine: string | null;
		onToggleSpine: (itemId: string) => void;
	}

	let { items, shelf, expandedSpine, onToggleSpine }: Props = $props();

	function handleSpineKey(e: KeyboardEvent, itemId: string) {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			onToggleSpine(itemId);
		}
	}
</script>

<div class="display-spines">
	<ul class="spines-row" role="list">
		{#each items as item, idx (item.id)}
			<li class="spine-slot">
				<button
					class="spine"
					style:--spine-color={spineColor(item.category, idx)}
					aria-expanded={expandedSpine === item.id}
					onclick={() => onToggleSpine(item.id)}
					onkeydown={(e) => handleSpineKey(e, item.id)}
				>
					<span class="spine-title">{item.title}</span>
					{#if item.creator}
						<span class="spine-creator">{item.creator}</span>
					{/if}
				</button>
			</li>
		{/each}
	</ul>
	<div class="shelf-plank shelf-plank--{shelf.material}"></div>
	{#if expandedSpine}
		{@const expanded = items.find((i) => i.id === expandedSpine)}
		{#if expanded}
			<div class="spine-detail">
				{#if expanded.coverUrl}
					<img src={expanded.coverUrl} alt="" class="spine-detail-cover" />
				{/if}
				<div class="spine-detail-info">
					<h3 class="spine-detail-title">
						<a href={expanded.url} target="_blank" rel="noopener noreferrer">{expanded.title}</a>
					</h3>
					{#if expanded.creator}
						<p class="spine-detail-creator">{shelf.creatorLabel}: {expanded.creator}</p>
					{/if}
					{#if expanded.description}
						<p class="spine-detail-desc">{expanded.description}</p>
					{/if}
					{#if expanded.rating}
						<span class="spine-detail-rating">{renderStars(expanded.rating)}</span>
					{/if}
					{#if expanded.note}
						<p class="spine-detail-note">{expanded.note}</p>
					{/if}
					<div class="spine-detail-badges">
						{#if expanded.isStatus1}
							<span class="badge badge--status1">{shelf.status1Label}</span>
						{/if}
						{#if expanded.isStatus2}
							<span class="badge badge--status2">{shelf.status2Label}</span>
						{/if}
					</div>
				</div>
			</div>
		{/if}
	{/if}
</div>

<style>
	.display-spines { display: flex; flex-direction: column; }
	.spines-row { display: flex; align-items: flex-end; gap: 0; min-height: 8rem; padding: 0 0.5rem; list-style: none; margin: 0; }
	.spine-slot { display: contents; }
	.spine { writing-mode: vertical-rl; text-orientation: mixed; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 0.25rem; padding: 0.5rem 0.375rem; min-height: 6rem; max-height: 10rem; background: var(--spine-color, #8b6914); color: white; border: none; font: inherit; border-radius: 0.125rem 0.125rem 0 0; cursor: pointer; transition: filter 0.2s ease, transform 0.2s ease; text-shadow: 0 1px 2px rgba(0,0,0,0.3); flex-shrink: 0; }
	.spine:hover { filter: brightness(1.1); transform: translateY(-2px); }
	.spine:focus-visible { outline: 2px solid white; outline-offset: -2px; z-index: 1; }
	.spine[aria-expanded="true"] { filter: brightness(1.2); transform: translateY(-4px); }
	.spine-title { font-size: 0.6875rem; font-weight: 600; line-height: 1; max-height: 6rem; overflow: hidden; }
	.spine-creator { font-size: 0.5625rem; opacity: 0.8; max-height: 3rem; overflow: hidden; }
	.shelf-plank { height: 0.75rem; border-radius: 0 0 0.25rem 0.25rem; }
	.shelf-plank--wood { background: linear-gradient(to bottom, #a0522d, #8b4513); box-shadow: 0 3px 6px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.1); }
	.shelf-plank--glass { background: rgba(255,255,255,0.15); backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.2); box-shadow: 0 2px 8px rgba(0,0,0,0.1); }
	:global(.dark) .shelf-plank--glass { background: rgba(255,255,255,0.08); border-color: rgba(255,255,255,0.1); }
	.shelf-plank--none { display: none; }
	.spine-detail { display: flex; gap: 1rem; padding: 1rem; margin-top: 0.75rem; border-radius: 0.5rem; background: rgba(0,0,0,0.03); }
	:global(.dark) .spine-detail { background: rgba(255,255,255,0.04); }
	.spine-detail-cover { width: 5rem; height: 7rem; object-fit: cover; border-radius: 0.25rem; flex-shrink: 0; }
	.spine-detail-info { flex: 1; display: flex; flex-direction: column; gap: 0.25rem; }
	.spine-detail-title { margin: 0; font-size: 1rem; font-weight: 600; }
	.spine-detail-title a { color: inherit; text-decoration: none; }
	.spine-detail-title a:hover { text-decoration: underline; }
	.spine-detail-creator { margin: 0; font-size: 0.875rem; opacity: 0.7; }
	.spine-detail-desc { margin: 0.25rem 0 0; font-size: 0.8125rem; opacity: 0.7; line-height: 1.4; }
	.spine-detail-rating { font-size: 0.875rem; color: rgb(234,179,8); }
	.spine-detail-note { margin: 0.25rem 0 0; font-size: 0.8125rem; font-style: italic; opacity: 0.6; }
	.spine-detail-badges { display: flex; gap: 0.375rem; margin-top: 0.25rem; }
	.badge { display: inline-block; padding: 0.1875rem 0.375rem; border-radius: 0.1875rem; font-size: 0.625rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.02em; }
	.badge--status1 { background: rgba(59,130,246,0.1); color: rgb(37,99,235); }
	.badge--status2 { background: rgba(236,72,153,0.1); color: rgb(190,24,93); }
	:global(.dark) .badge--status1 { background: rgba(59,130,246,0.15); color: rgb(147,197,253); }
	:global(.dark) .badge--status2 { background: rgba(236,72,153,0.15); color: rgb(249,168,212); }
	@media (prefers-reduced-motion: reduce) { .spine { transition: none; } .spine:hover, .spine[aria-expanded="true"] { transform: none; } }
</style>
