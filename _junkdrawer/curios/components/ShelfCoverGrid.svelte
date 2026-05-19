<script lang="ts">
	import type { ShelfItem, Shelf } from "./shelf-types.js";

	interface Props {
		items: ShelfItem[];
		shelf: Shelf;
	}

	let { items, shelf }: Props = $props();
</script>

<div class="display-cover-grid">
	{#each items as item (item.id)}
		<a href={item.url} target="_blank" rel="noopener noreferrer" class="cover-card" title={item.title} aria-label={item.title}>
			{#if item.coverUrl}
				<img src={item.coverUrl} alt="" class="cover-image" loading="lazy" />
			{:else if item.thumbnailUrl}
				<img src={item.thumbnailUrl} alt="" class="cover-image cover-image--thumb" loading="lazy" />
			{:else}
				<div class="cover-placeholder">
					<span class="cover-placeholder-text">{item.title.slice(0, 2)}</span>
				</div>
			{/if}
			<div class="cover-overlay">
				<span class="cover-overlay-title">{item.title}</span>
				{#if item.creator}
					<span class="cover-overlay-creator">{item.creator}</span>
				{/if}
			</div>
			{#if item.isStatus1 || item.isStatus2}
				<div class="cover-badges">
					{#if item.isStatus1}
						<span class="badge badge--status1">{shelf.status1Label}</span>
					{/if}
					{#if item.isStatus2}
						<span class="badge badge--status2">{shelf.status2Label}</span>
					{/if}
				</div>
			{/if}
		</a>
	{/each}
</div>

<style>
	.display-cover-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(8.5rem, 1fr));
		gap: 1rem;
	}

	.cover-card {
		position: relative;
		display: flex;
		flex-direction: column;
		text-decoration: none;
		color: inherit;
		border-radius: 0.375rem;
		overflow: hidden;
		transition: transform 0.2s ease;
	}

	.cover-card:hover {
		transform: translateY(-2px);
	}

	.cover-card:focus-visible {
		outline: 2px solid currentColor;
		outline-offset: 2px;
	}

	.cover-image {
		width: 100%;
		height: 12rem;
		object-fit: cover;
		background: rgba(0, 0, 0, 0.05);
	}

	.cover-image--thumb {
		object-fit: contain;
		background: rgba(0, 0, 0, 0.03);
	}

	.cover-placeholder {
		width: 100%;
		height: 12rem;
		display: flex;
		align-items: center;
		justify-content: center;
		background: linear-gradient(135deg, var(--grove-accent-15), var(--grove-accent-8));
		border-radius: 0.375rem;
	}

	.cover-placeholder-text {
		font-size: 2rem;
		font-weight: 700;
		opacity: 0.3;
		text-transform: uppercase;
	}

	.cover-overlay {
		padding: 0.5rem 0.25rem;
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
	}

	.cover-overlay-title {
		font-size: 0.8125rem;
		font-weight: 600;
		line-height: 1.3;
		display: -webkit-box;
		-webkit-line-clamp: 2;
		line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}

	.cover-overlay-creator {
		font-size: 0.6875rem;
		opacity: 0.6;
	}

	.cover-badges {
		position: absolute;
		top: 0.375rem;
		right: 0.375rem;
		display: flex;
		gap: 0.25rem;
	}

	.badge {
		display: inline-block;
		padding: 0.1875rem 0.375rem;
		border-radius: 0.1875rem;
		font-size: 0.625rem;
		font-weight: 500;
		text-transform: uppercase;
		letter-spacing: 0.02em;
	}

	.badge--status1 {
		background: rgba(59, 130, 246, 0.1);
		color: rgb(37, 99, 235);
	}

	.badge--status2 {
		background: rgba(236, 72, 153, 0.1);
		color: rgb(190, 24, 93);
	}

	:global(.dark) .badge--status1 {
		background: rgba(59, 130, 246, 0.15);
		color: rgb(147, 197, 253);
	}

	:global(.dark) .badge--status2 {
		background: rgba(236, 72, 153, 0.15);
		color: rgb(249, 168, 212);
	}

	:global(.dark) .cover-placeholder {
		background: linear-gradient(135deg, var(--grove-accent-10), var(--grove-accent-5));
	}

	:global(.dark) .cover-image {
		background: rgba(255, 255, 255, 0.05);
	}

	@media (prefers-reduced-motion: reduce) {
		.cover-card {
			transition: none;
		}

		.cover-card:hover {
			transform: none;
		}
	}
</style>
