<script lang="ts">
	import Input from "$lib/ui/components/ui/Input.svelte";
	import Button from "$lib/ui/components/ui/Button.svelte";
	import Dialog from "$lib/ui/components/ui/Dialog.svelte";
	import { toast } from "$lib/ui/components/ui/toast";
	import { debounce } from "$lib/utils/debounce";
	import type { CdnImage } from "./gutter-manager.types.js";
	import { getCachedImage, setCachedImage } from "./gutter-manager-utils.js";

	/**
	 * CdnImagePicker — a modal grid of images from the tenant CDN.
	 *
	 * Shared by the Vines panel (photo + gallery flows) and the post editor's
	 * Details tab (cover image). Owns its own fetch, cache, and filter state.
	 *
	 * @prop {boolean} [open=false] - Bindable open state
	 * @prop {(url: string) => void} onSelect - Called with the chosen image URL
	 * @prop {string} [title="Select Image"] - Dialog heading
	 */
	let {
		open = $bindable(false),
		onSelect,
		title = "Select Image",
	}: {
		open?: boolean;
		onSelect: (url: string) => void;
		title?: string;
	} = $props();

	let cdnImages: CdnImage[] = $state([]);
	let cdnLoading = $state(false);
	let cdnFilter = $state("");

	// Debounced CDN filter to avoid excessive API calls
	const debouncedFilterRequest = debounce(async (query: unknown) => {
		cdnLoading = true;
		try {
			const queryStr = query ? String(query) : "";
			const cacheKey = queryStr ? `cdn_${queryStr}` : "cdn_root";

			// Check cache first
			const cachedResult = getCachedImage(cacheKey);
			if (cachedResult) {
				try {
					cdnImages = JSON.parse(cachedResult);
					cdnLoading = false;
					return;
				} catch {
					// If cache parsing fails, continue to API call
				}
			}

			const params = new URLSearchParams();
			if (queryStr) params.set("prefix", queryStr);
			params.set("limit", "50");

			const response = await fetch(`/api/images/list?${params}`); // csrf-ok
			const data = (await response.json()) as { images: CdnImage[] };

			if (response.ok) {
				const imageExtensions = [".jpg", ".jpeg", ".png", ".gif", ".webp", ".svg"];
				const filtered = data.images.filter((img: CdnImage) => {
					const key = img.key.toLowerCase();
					return imageExtensions.some((ext) => key.endsWith(ext));
				});
				cdnImages = filtered;
				// Cache the result
				setCachedImage(cacheKey, JSON.stringify(filtered));
			}
		} catch (err) {
			toast.error("Failed to load CDN images");
			console.error("Failed to load CDN images:", err);
			cdnImages = [];
		} finally {
			cdnLoading = false;
		}
	}, 300);

	function loadCdnImages() {
		debouncedFilterRequest(cdnFilter);
	}

	// Plain (non-reactive) latch so opening the dialog fetches exactly once
	// per open, matching the old openImagePicker() behaviour.
	let hasLoadedForOpen = false;
	$effect(() => {
		if (open) {
			if (!hasLoadedForOpen) {
				hasLoadedForOpen = true;
				loadCdnImages();
			}
		} else {
			hasLoadedForOpen = false;
		}
	});

	function selectImage(image: CdnImage) {
		onSelect(image.url);
		open = false;
	}
</script>

<Dialog bind:open {title}>
	{#snippet children()}
		<div class="picker-controls">
			<Input type="text" bind:value={cdnFilter} placeholder="Filter by folder (e.g., blog/)" />
			<Button onclick={loadCdnImages} disabled={cdnLoading}>
				{cdnLoading ? "Loading..." : "Filter"}
			</Button>
		</div>

		<div class="image-grid">
			{#if cdnLoading}
				<div class="loading">Loading images...</div>
			{:else if cdnImages.length === 0}
				<div class="no-images">No images found</div>
			{:else}
				{#each cdnImages as image (image.key)}
					<button class="image-option" onclick={() => selectImage(image)}>
						<img src={image.url} alt={image.key} />
						<span class="image-name">{image.key.split("/").pop()}</span>
					</button>
				{/each}
			{/if}
		</div>
	{/snippet}

	{#snippet footer()}
		<Button variant="outline" onclick={() => (open = false)}>Cancel</Button>
	{/snippet}
</Dialog>

<style>
	.picker-controls {
		display: flex;
		gap: 0.5rem;
		margin-bottom: 1rem;
	}

	.image-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(100px, 1fr));
		gap: 0.5rem;
		max-height: 400px;
		overflow-y: auto;
		padding: 0.5rem;
		background: var(--color-bg-secondary);
		border-radius: 8px;
		border: 1px solid var(--color-border);
	}

	:global(.dark) .image-grid {
		background: rgba(15, 23, 42, 0.6);
		border-color: var(--grove-accent-15);
	}

	.loading,
	.no-images {
		grid-column: 1 / -1;
		text-align: center;
		padding: 2rem;
		color: var(--color-text-muted);
	}

	:global(.dark) .loading,
	:global(.dark) .no-images {
		color: var(--color-foreground-muted);
	}

	.image-option {
		display: flex;
		flex-direction: column;
		background: var(--color-bg-secondary);
		border: 2px solid transparent;
		border-radius: 6px;
		padding: 0.25rem;
		cursor: pointer;
		transition: border-color 0.15s ease;
	}

	.image-option:hover {
		border-color: var(--color-primary);
	}

	:global(.dark) .image-option {
		background: rgba(15, 23, 42, 0.4);
	}

	:global(.dark) .image-option:hover {
		border-color: var(--grove-accent);
	}

	.image-option img {
		width: 100%;
		aspect-ratio: 1;
		object-fit: cover;
		border-radius: 4px;
	}

	.image-name {
		font-size: 0.65rem;
		color: var(--color-text-subtle);
		margin-top: 0.25rem;
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
	}

	:global(.dark) .image-name {
		color: var(--color-foreground-muted);
	}

	@media (prefers-reduced-motion: reduce) {
		.image-option {
			transition: none;
		}
	}
</style>
