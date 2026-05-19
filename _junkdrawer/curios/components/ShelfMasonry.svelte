<script lang="ts">
	import type { ShelfItem, Shelf } from "./shelf-types.js";
	import { renderStars, masonryGradient } from "./shelf-types.js";

	interface Props {
		items: ShelfItem[];
		shelf: Shelf;
	}

	let { items, shelf }: Props = $props();
</script>

<div class="display-masonry">
	{#each items as item, idx (item.id)}
		<a href={item.url} target="_blank" rel="noopener noreferrer" class="masonry-card">
			{#if item.coverUrl}
				<img src={item.coverUrl} alt="" class="masonry-card-image" loading="lazy" />
			{:else if item.thumbnailUrl}
				<img src={item.thumbnailUrl} alt="" class="masonry-card-image" loading="lazy" />
			{:else}
				<div class="masonry-card-gradient" style:background={masonryGradient(item.category, idx)}>
					<span class="masonry-card-initial">{item.title.slice(0, 2)}</span>
				</div>
			{/if}
			<div class="masonry-card-body">
				<h3 class="masonry-card-title">{item.title}</h3>
				{#if item.creator}
					<p class="masonry-card-creator">{shelf.creatorLabel}: {item.creator}</p>
				{/if}
				{#if item.description}
					<p class="masonry-card-desc">{item.description}</p>
				{/if}
				<div class="masonry-card-meta">
					{#if item.rating}
						<span class="masonry-card-rating" aria-label="{item.rating} out of 5 stars">{renderStars(item.rating)}</span>
					{/if}
					{#if item.isStatus1}
						<span class="badge badge--status1">{shelf.status1Label}</span>
					{/if}
					{#if item.isStatus2}
						<span class="badge badge--status2">{shelf.status2Label}</span>
					{/if}
				</div>
			</div>
		</a>
	{/each}
</div>

<style>
	.display-masonry { column-width: 17.5rem; column-gap: 1rem; column-fill: balance; }
	.masonry-card { display: inline-block; width: 100%; margin-bottom: 1rem; border-radius: 0.625rem; overflow: hidden; background: rgba(255,255,255,0.55); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.3); box-shadow: 0 2px 8px rgba(0,0,0,0.06); text-decoration: none; color: inherit; break-inside: avoid; transition: transform 0.2s ease, box-shadow 0.2s ease; }
	.masonry-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.1); }
	.masonry-card:focus-visible { outline: 2px solid rgb(34,197,94); outline-offset: 2px; }
	.masonry-card-image { width: 100%; height: auto; aspect-ratio: auto; display: block; }
	.masonry-card-gradient { width: 100%; aspect-ratio: 4 / 3; display: flex; align-items: center; justify-content: center; }
	.masonry-card-initial { font-size: 2.5rem; font-weight: 700; color: rgba(255,255,255,0.5); text-transform: uppercase; }
	.masonry-card-body { padding: 0.75rem; display: flex; flex-direction: column; gap: 0.25rem; }
	.masonry-card-title { margin: 0; font-size: 0.9375rem; font-weight: 600; line-height: 1.3; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
	.masonry-card-creator { margin: 0; font-size: 0.8125rem; opacity: 0.7; }
	.masonry-card-desc { margin: 0; font-size: 0.8125rem; opacity: 0.6; line-height: 1.4; display: -webkit-box; -webkit-line-clamp: 3; line-clamp: 3; -webkit-box-orient: vertical; overflow: hidden; }
	.masonry-card-meta { display: flex; align-items: center; gap: 0.375rem; flex-wrap: wrap; margin-top: 0.125rem; }
	.masonry-card-rating { font-size: 0.75rem; color: rgb(234,179,8); }
	.badge { display: inline-block; padding: 0.1875rem 0.375rem; border-radius: 0.1875rem; font-size: 0.625rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.02em; }
	.badge--status1 { background: rgba(59,130,246,0.1); color: rgb(37,99,235); }
	.badge--status2 { background: rgba(236,72,153,0.1); color: rgb(190,24,93); }
	:global(.dark) .badge--status1 { background: rgba(59,130,246,0.15); color: rgb(147,197,253); }
	:global(.dark) .badge--status2 { background: rgba(236,72,153,0.15); color: rgb(249,168,212); }
	:global(.dark) .masonry-card { background: rgba(30,30,30,0.6); border-color: rgba(255,255,255,0.1); box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
	:global(.dark) .masonry-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,0.3); }
	@media (prefers-reduced-motion: reduce) { .masonry-card { transition: none; } .masonry-card:hover { transform: none; } }
</style>
