<script lang="ts">
	import type { ShelfItem } from "./shelf-types.js";

	interface Props {
		items: ShelfItem[];
	}

	let { items }: Props = $props();
</script>

<div class="display-buttons">
	{#each items as item (item.id)}
		<a href={item.url} target="_blank" rel="noopener noreferrer" class="button-tile" title={item.title}>
			{#if item.thumbnailUrl}
				<img src={item.thumbnailUrl} alt={item.title} class="button-image" loading="lazy" width="88" height="31" />
			{:else}
				<span class="button-text">{item.title}</span>
			{/if}
		</a>
	{/each}
</div>

<style>
	.display-buttons { display: flex; flex-wrap: wrap; gap: 0.25rem; }
	.button-tile { display: block; width: 88px; height: 31px; flex-shrink: 0; text-decoration: none; transition: opacity 0.15s ease; }
	.button-tile:hover { opacity: 0.85; }
	.button-tile:focus-visible { outline: 2px solid currentColor; outline-offset: 1px; }
	.button-image { width: 88px; height: 31px; object-fit: cover; display: block; image-rendering: pixelated; }
	.button-text { display: flex; align-items: center; justify-content: center; width: 88px; height: 31px; background: rgb(34,197,94); color: white; font-size: 0.5625rem; font-weight: 600; text-align: center; line-height: 1.1; padding: 0 0.125rem; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
	@media (prefers-reduced-motion: reduce) { .button-tile { transition: none; } }
</style>
