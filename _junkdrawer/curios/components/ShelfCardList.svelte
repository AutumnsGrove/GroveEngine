<script lang="ts">
	import type { ShelfItem, Shelf } from "./shelf-types.js";
	import { renderStars, extractDomain, faviconUrl } from "./shelf-types.js";

	interface Props {
		items: ShelfItem[];
		shelf: Shelf;
	}

	let { items, shelf }: Props = $props();
</script>

<div class="display-card-list">
	{#each items as item (item.id)}
		<a href={item.url} target="_blank" rel="noopener noreferrer" class="list-card">
			{#if item.coverUrl || item.thumbnailUrl}
				<div class="list-card-image-wrap">
					<img src={item.coverUrl || item.thumbnailUrl} alt="" class="list-card-image" loading="lazy" />
				</div>
			{/if}
			<div class="list-card-content">
				<h3 class="list-card-title">{item.title}</h3>
				{#if item.url && extractDomain(item.url)}
					<div class="list-card-domain">
						{#if faviconUrl(item.url)}
							<img src={faviconUrl(item.url)} alt="" class="list-card-favicon" width="14" height="14" loading="lazy" />
						{/if}
						<span>{extractDomain(item.url)}</span>
					</div>
				{/if}
				{#if item.creator}
					<p class="list-card-creator">{shelf.creatorLabel}: {item.creator}</p>
				{/if}
				{#if item.description}
					<p class="list-card-desc">{item.description}</p>
				{/if}
				<div class="list-card-meta">
					{#if item.rating}
						<span class="list-card-rating" aria-label="{item.rating} out of 5 stars">{renderStars(item.rating)}</span>
					{/if}
					{#if item.isStatus1}
						<span class="badge badge--status1">{shelf.status1Label}</span>
					{/if}
					{#if item.isStatus2}
						<span class="badge badge--status2">{shelf.status2Label}</span>
					{/if}
				</div>
				{#if item.note}
					<p class="list-card-note">{item.note}</p>
				{/if}
			</div>
		</a>
	{/each}
</div>

<style>
	.display-card-list { display: flex; flex-direction: column; gap: 0.75rem; }
	.list-card { display: flex; flex-direction: column; border-radius: 0.625rem; overflow: hidden; background: rgba(255,255,255,0.55); backdrop-filter: blur(8px); -webkit-backdrop-filter: blur(8px); border: 1px solid rgba(255,255,255,0.3); box-shadow: 0 2px 8px rgba(0,0,0,0.06); text-decoration: none; color: inherit; transition: transform 0.2s ease, box-shadow 0.2s ease; }
	.list-card:hover { transform: translateY(-2px); box-shadow: 0 6px 20px rgba(0,0,0,0.1); }
	:global(.dark) .list-card { background: rgba(30,30,30,0.6); border-color: rgba(255,255,255,0.1); box-shadow: 0 2px 8px rgba(0,0,0,0.2); }
	:global(.dark) .list-card:hover { box-shadow: 0 6px 20px rgba(0,0,0,0.3); }
	.list-card:focus-visible { outline: 2px solid rgb(34,197,94); outline-offset: 2px; }
	.list-card-image-wrap { width: 100%; max-height: 12rem; overflow: hidden; }
	.list-card-image { width: 100%; max-height: 12rem; object-fit: cover; display: block; }
	.list-card-content { flex: 1; display: flex; flex-direction: column; gap: 0.25rem; padding: 0.75rem; min-width: 0; }
	.list-card-title { margin: 0; font-size: 0.9375rem; font-weight: 600; line-height: 1.3; }
	.list-card-domain { display: flex; align-items: center; gap: 0.375rem; font-size: 0.75rem; opacity: 0.55; }
	.list-card-favicon { width: 14px; height: 14px; border-radius: 2px; flex-shrink: 0; }
	.list-card-creator { margin: 0; font-size: 0.8125rem; opacity: 0.7; }
	.list-card-desc { margin: 0; font-size: 0.8125rem; opacity: 0.6; display: -webkit-box; -webkit-line-clamp: 2; line-clamp: 2; -webkit-box-orient: vertical; overflow: hidden; }
	.list-card-meta { display: flex; align-items: center; gap: 0.375rem; flex-wrap: wrap; margin-top: 0.125rem; }
	.list-card-rating { font-size: 0.75rem; color: rgb(234,179,8); }
	.list-card-note { margin: 0.25rem 0 0; font-size: 0.75rem; font-style: italic; opacity: 0.6; }
	.badge { display: inline-block; padding: 0.1875rem 0.375rem; border-radius: 0.1875rem; font-size: 0.625rem; font-weight: 500; text-transform: uppercase; letter-spacing: 0.02em; }
	.badge--status1 { background: rgba(59,130,246,0.1); color: rgb(37,99,235); }
	.badge--status2 { background: rgba(236,72,153,0.1); color: rgb(190,24,93); }
	:global(.dark) .badge--status1 { background: rgba(59,130,246,0.15); color: rgb(147,197,253); }
	:global(.dark) .badge--status2 { background: rgba(236,72,153,0.15); color: rgb(249,168,212); }
	@media (prefers-reduced-motion: reduce) { .list-card { transition: none; } .list-card:hover { transform: none; } }
</style>
