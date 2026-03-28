<script lang="ts">
	import { copyToClipboard as copyText } from "@autumnsgrove/lattice/utils/share";
	import Button from "@autumnsgrove/lattice/ui/components/ui/Button.svelte";
	import GlassCard from "@autumnsgrove/lattice/ui/components/ui/GlassCard.svelte";
	import Dialog from "@autumnsgrove/lattice/ui/components/ui/Dialog.svelte";
	import { toast } from "@autumnsgrove/lattice/ui/components/ui/toast";
	import {
		api,
		apiRequest,
		formatBytes,
		generateThumbnail,
		extractDominantColor,
	} from "@autumnsgrove/lattice/utils";
	import {
		ALLOWED_EXTENSIONS,
	} from "@autumnsgrove/lattice/utils/upload-validation";

	interface GalleryImage {
		key: string;
		url: string;
		thumbnailUrl?: string;
		dominantColor?: string;
		uploaded?: string;
		size?: number;
		imageWidth?: number;
		imageHeight?: number;
		customMetadata?: {
			altText?: string;
			description?: string;
			filename?: string;
			imageFormat?: string;
			originalSize?: string;
			storedSize?: string;
		};
	}

	interface Props {
		copyFormat: string;
		copiedItem: string | number | null;
		onCopiedItemChange?: (item: string | number | null) => void;
	}

	let {
		copyFormat,
		copiedItem,
		onCopiedItemChange = () => {},
	}: Props = $props();

	// Gallery state
	let galleryImages = $state<GalleryImage[]>([]);
	let galleryLoading = $state(false);
	let galleryError = $state<string | null>(null);
	let galleryCursor = $state<string | null>(null);
	let galleryHasMore = $state(false);
	let galleryFilter = $state("");
	let gallerySortBy = $state("date-desc");

	// UI state
	let deleteModalOpen = $state(false);
	let imageToDelete = $state<GalleryImage | null>(null);
	let deleting = $state(false);

	// Multi-select state
	let selectionMode = $state(false);
	let selectedImages = $state<Set<string>>(new Set());
	let bulkDeleteModalOpen = $state(false);
	let bulkDeleting = $state(false);

	// Backfill state
	let backfilling = $state(false);
	let backfillProgress = $state(0);
	let backfillTotal = $state(0);
	let backfillErrors = $state(0);

	// Load gallery on mount
	$effect(() => {
		loadGallery();
	});

	// Public method for parent to refresh gallery
	export function refresh() {
		loadGallery();
	}

	async function loadGallery(append = false) {
		galleryLoading = true;
		galleryError = null;

		try {
			const params = new URLSearchParams();
			if (galleryFilter) params.set("prefix", galleryFilter);
			if (append && galleryCursor) params.set("cursor", galleryCursor);
			params.set("limit", "30");
			params.set("sortBy", gallerySortBy);

			const data = await api.get(`/api/images/list?${params}`);

			const filteredImages = data.images.filter((img: GalleryImage) => {
				const key = img.key.toLowerCase();
				return ALLOWED_EXTENSIONS.some((ext) => key.endsWith(`.${ext}`));
			});

			if (append) {
				galleryImages = [...galleryImages, ...filteredImages];
			} else {
				galleryImages = filteredImages;
			}
			galleryCursor = data.cursor;
			galleryHasMore = data.truncated;
		} catch (err) {
			galleryError = err instanceof Error ? err.message : "Failed to load gallery";
		} finally {
			galleryLoading = false;
		}
	}

	function filterGallery() {
		galleryCursor = null;
		loadGallery();
	}

	function changeSortOrder() {
		galleryCursor = null;
		loadGallery();
	}

	async function runBackfill() {
		if (backfilling) return;
		backfilling = true;
		backfillProgress = 0;
		backfillErrors = 0;

		try {
			const listing = await api.get("/api/curios/gallery/backfill?limit=200");
			const images = listing.images ?? [];
			backfillTotal = images.length;

			if (images.length === 0) {
				toast.info("All images already have thumbnails");
				backfilling = false;
				return;
			}

			toast.info(`Processing ${images.length} images...`);

			for (const img of images) {
				try {
					const response = await fetch(img.url);
					if (!response.ok) {
						backfillErrors++;
						backfillProgress++;
						continue;
					}
					const blob = await response.blob();
					const file = new File([blob], "image.jpg", { type: blob.type || "image/jpeg" });

					const [thumbResult, color] = await Promise.all([
						generateThumbnail(file, { maxWidth: 400, quality: 60 }),
						extractDominantColor(file),
					]);

					const formData = new FormData();
					formData.append("imageId", img.id);
					formData.append(
						"thumbnail",
						new File([thumbResult.blob], "thumb.webp", { type: "image/webp" }),
					);
					formData.append("dominantColor", color);
					formData.append("width", String(thumbResult.width));
					formData.append("height", String(thumbResult.height));

					await apiRequest("/api/curios/gallery/backfill", {
						method: "POST",
						body: formData,
					});
				} catch (err) {
					console.warn("Backfill failed for image:", img.id, err);
					backfillErrors++;
				}
				backfillProgress++;
			}

			const succeeded = backfillProgress - backfillErrors;
			if (backfillErrors > 0) {
				toast.warning(`Backfill complete: ${succeeded} processed, ${backfillErrors} failed`);
			} else {
				toast.success(`Backfill complete: ${succeeded} images processed`);
			}
		} catch (err) {
			toast.error("Backfill failed: " + (err instanceof Error ? err.message : "Unknown error"));
		} finally {
			backfilling = false;
		}
	}

	function getFileName(key: string) {
		return key.split("/").pop();
	}

	function getDateFromPath(key: string) {
		const match = key.match(/photos\/(\d{4})\/(\d{2})\/(\d{2})/);
		if (match) {
			return `${match[1]}-${match[2]}-${match[3]}`;
		}
		return null;
	}

	function getCopyTextForGallery(image: GalleryImage) {
		const url = image.url;
		const alt = image.customMetadata?.altText || "Image";
		if (copyFormat === "url") return url;
		if (copyFormat === "markdown") return `![${alt}](${url})`;
		if (copyFormat === "html") return `<img src="${url}" alt="${alt}" />`;
		return url;
	}

	async function copyToClipboard(text: string, itemId: string | number | null = null) {
		const result = await copyText(text);
		if (result.success) {
			onCopiedItemChange(itemId);
			setTimeout(() => {
				onCopiedItemChange(null);
			}, 2000);
		} else {
			toast.error("Failed to copy to clipboard");
		}
	}

	function confirmDelete(image: GalleryImage) {
		imageToDelete = image;
		deleteModalOpen = true;
	}

	function cancelDelete() {
		deleteModalOpen = false;
		imageToDelete = null;
	}

	function toggleSelectionMode() {
		selectionMode = !selectionMode;
		if (!selectionMode) {
			selectedImages = new Set();
		}
	}

	function toggleImageSelection(key: string) {
		const next = new Set(selectedImages);
		if (next.has(key)) {
			next.delete(key);
		} else {
			next.add(key);
		}
		selectedImages = next;
	}

	function selectAll() {
		if (selectedImages.size === galleryImages.length) {
			selectedImages = new Set();
		} else {
			selectedImages = new Set(galleryImages.map((img) => img.key));
		}
	}

	function confirmBulkDelete() {
		if (selectedImages.size === 0) return;
		bulkDeleteModalOpen = true;
	}

	function cancelBulkDelete() {
		bulkDeleteModalOpen = false;
	}

	async function executeBulkDelete() {
		const keys = Array.from(selectedImages);
		if (keys.length === 0) return;

		bulkDeleting = true;

		try {
			const result = await api.post("/api/images/delete-batch", { keys });

			const deletedKeys = new Set(result?.deleted ?? keys);
			galleryImages = galleryImages.filter((img) => !deletedKeys.has(img.key));

			const failedCount = result?.failed?.length ?? 0;
			if (failedCount > 0) {
				toast.warning(`Deleted ${deletedKeys.size} images, ${failedCount} failed`);
			} else {
				toast.success(`Deleted ${deletedKeys.size} image${deletedKeys.size === 1 ? "" : "s"}`);
			}
		} catch (err) {
			toast.error("Bulk delete failed: " + (err instanceof Error ? err.message : "Unknown error"));
		} finally {
			bulkDeleting = false;
			bulkDeleteModalOpen = false;
			selectedImages = new Set();
		}
	}

	async function executeDelete() {
		if (!imageToDelete) return;
		deleting = true;

		try {
			await api.delete("/api/images/delete", {
				body: JSON.stringify({ key: imageToDelete.key }),
			});
			galleryImages = galleryImages.filter((img) => img.key !== imageToDelete?.key);
			toast.success("Image deleted");
		} catch (err) {
			toast.error("Failed to delete: " + (err instanceof Error ? err.message : "Unknown error"));
		} finally {
			deleting = false;
			deleteModalOpen = false;
			imageToDelete = null;
		}
	}
</script>

<!-- Gallery Section -->
<GlassCard variant="default" class="gallery-section">
	<div class="section-header">
		<div class="section-title">
			<h2>Gallery</h2>
			<span class="section-subtitle">All images in your Grove</span>
		</div>
		<div class="gallery-controls">
			<select bind:value={gallerySortBy} onchange={changeSortOrder} aria-label="Sort gallery images">
				<option value="date-desc">Newest</option>
				<option value="date-asc">Oldest</option>
				<option value="name-asc">A-Z</option>
				<option value="name-desc">Z-A</option>
				<option value="size-desc">Largest</option>
				<option value="size-asc">Smallest</option>
			</select>
			<div class="filter-group">
				<input
					type="text"
					placeholder="Filter by path..."
					bind:value={galleryFilter}
					onkeydown={(e) => e.key === "Enter" && filterGallery()}
					aria-label="Filter images by path"
				/>
				<Button variant="secondary" size="sm" onclick={filterGallery}>Filter</Button>
			</div>
			<Button variant="secondary" size="sm" onclick={() => loadGallery()} aria-label="Refresh gallery">
				<svg
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					style="width: 16px; height: 16px;"
				>
					<path
						d="M23 4v6h-6M1 20v-6h6M3.51 9a9 9 0 0114.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0020.49 15"
					/>
				</svg>
			</Button>
			<Button
				variant={selectionMode ? "primary" : "secondary"}
				size="sm"
				onclick={toggleSelectionMode}
			>
				{selectionMode ? "Cancel" : "Select"}
			</Button>
			<Button variant="secondary" size="sm" onclick={runBackfill} disabled={backfilling}>
				{#if backfilling}
					{backfillProgress}/{backfillTotal}
				{:else}
					Thumbnails
				{/if}
			</Button>
		</div>
	</div>

	{#if backfilling}
		<div class="backfill-progress">
			<div class="backfill-bar">
				<div
					class="backfill-fill"
					style="width: {backfillTotal > 0 ? (backfillProgress / backfillTotal) * 100 : 0}%"
				></div>
			</div>
			<span class="backfill-label">
				Generating thumbnails... {backfillProgress}/{backfillTotal}
				{#if backfillErrors > 0}
					({backfillErrors} failed)
				{/if}
			</span>
		</div>
	{/if}

	{#if galleryError}
		<div class="gallery-error">{galleryError}</div>
	{/if}

	{#if galleryLoading && galleryImages.length === 0}
		<div class="gallery-loading">
			<div class="spinner"></div>
			<span>Loading images...</span>
		</div>
	{:else if galleryImages.length === 0}
		<div class="gallery-empty">
			<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
				<rect x="3" y="3" width="18" height="18" rx="2" />
				<circle cx="8.5" cy="8.5" r="1.5" />
				<path d="M21 15l-5-5L5 21" />
			</svg>
			<p>No images found</p>
		</div>
	{:else}
		{#if selectionMode}
			<div class="selection-bar">
				<div class="selection-bar-left">
					<button class="select-all-btn" onclick={selectAll}>
						{selectedImages.size === galleryImages.length ? "Deselect All" : "Select All"}
					</button>
					<span class="selection-count">
						{selectedImages.size} selected
					</span>
				</div>
				{#if selectedImages.size > 0}
					<Button variant="danger" size="sm" onclick={confirmBulkDelete}>
						Delete {selectedImages.size} image{selectedImages.size === 1 ? "" : "s"}
					</Button>
				{/if}
			</div>
		{/if}
		<div class="gallery-grid">
			{#each galleryImages as image (image.key)}
				<!-- svelte-ignore a11y_no_noninteractive_tabindex -->
				<div
					class="gallery-card {selectionMode && selectedImages.has(image.key) ? 'selected' : ''}"
					onclick={selectionMode ? () => toggleImageSelection(image.key) : undefined}
					role={selectionMode ? "checkbox" : undefined}
					aria-checked={selectionMode ? selectedImages.has(image.key) : undefined}
					tabindex={selectionMode ? 0 : undefined}
					onkeydown={selectionMode
						? (e: KeyboardEvent) => {
								if (e.key === "Enter" || e.key === " ") {
									e.preventDefault();
									toggleImageSelection(image.key);
								}
							}
						: undefined}
				>
					{#if selectionMode}
						<div class="selection-checkbox" class:checked={selectedImages.has(image.key)}>
							{#if selectedImages.has(image.key)}
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3">
									<path d="M20 6L9 17l-5-5" />
								</svg>
							{/if}
						</div>
					{/if}
					<div class="gallery-image">
						<img src={image.url} alt={getFileName(image.key)} loading="lazy" />
					</div>
					<div class="gallery-info">
						<span class="gallery-name" title={image.key}>{getFileName(image.key)}</span>
						<div class="gallery-meta">
							<span>{formatBytes(image.size ?? 0)}</span>
							{#if getDateFromPath(image.key)}
								<span>{getDateFromPath(image.key)}</span>
							{/if}
						</div>
					</div>
					{#if !selectionMode}
						<div class="gallery-actions">
							<button
								class="action-btn copy"
								onclick={() => copyToClipboard(getCopyTextForGallery(image), image.key)}
								title="Copy {copyFormat.toUpperCase()}"
								aria-label="Copy image URL"
							>
								{#if copiedItem === image.key}
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<path d="M20 6L9 17l-5-5" />
									</svg>
								{:else}
									<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
										<rect x="9" y="9" width="13" height="13" rx="2" />
										<path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
									</svg>
								{/if}
							</button>
							<button
								class="action-btn delete"
								onclick={() => confirmDelete(image)}
								title="Delete"
								aria-label="Delete image"
							>
								<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
									<path
										d="M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6m3 0V4a2 2 0 012-2h4a2 2 0 012 2v2"
									/>
								</svg>
							</button>
						</div>
					{/if}
				</div>
			{/each}
		</div>

		{#if galleryHasMore}
			<div class="gallery-load-more">
				<Button variant="primary" onclick={() => loadGallery(true)} disabled={galleryLoading}>
					{galleryLoading ? "Loading..." : "Load More"}
				</Button>
			</div>
		{/if}
	{/if}
</GlassCard>

<!-- Delete Modal -->
<Dialog bind:open={deleteModalOpen} title="Delete Image">
	{#if imageToDelete}
		<div class="delete-preview">
			<img
				src={imageToDelete.url}
				alt="Preview"
				onerror={(e) => {
					const el = e.currentTarget as HTMLImageElement;
					el.style.display = "none";
					el.nextElementSibling?.classList.remove("hidden");
				}}
			/>
			<div class="delete-preview-fallback hidden">
				<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5">
					<rect x="3" y="3" width="18" height="18" rx="2" />
					<circle cx="8.5" cy="8.5" r="1.5" />
					<path d="M21 15l-5-5L5 21" />
				</svg>
			</div>
		</div>
		<p class="delete-filename">{getFileName(imageToDelete.key)}</p>
	{/if}
	<p class="delete-warning">This action cannot be undone.</p>

	{#snippet footer()}
		<div class="modal-actions">
			<Button variant="secondary" onclick={cancelDelete} disabled={deleting}>Cancel</Button>
			<Button variant="danger" onclick={executeDelete} disabled={deleting}>
				{deleting ? "Deleting..." : "Delete"}
			</Button>
		</div>
	{/snippet}
</Dialog>

<!-- Bulk Delete Modal -->
<Dialog
	bind:open={bulkDeleteModalOpen}
	title="Delete {selectedImages.size} Image{selectedImages.size === 1 ? '' : 's'}"
>
	<div class="bulk-delete-content">
		<p class="bulk-delete-count">
			You are about to delete <strong>{selectedImages.size}</strong> image{selectedImages.size === 1
				? ""
				: "s"} from your grove.
		</p>
		{#if bulkDeleting}
			<p class="bulk-deleting-status">Deleting&hellip;</p>
		{/if}
	</div>
	<p class="delete-warning">This action cannot be undone.</p>

	{#snippet footer()}
		<div class="modal-actions">
			<Button variant="secondary" onclick={cancelBulkDelete} disabled={bulkDeleting}>Cancel</Button>
			<Button variant="danger" onclick={executeBulkDelete} disabled={bulkDeleting}>
				{bulkDeleting
					? "Deleting..."
					: `Delete ${selectedImages.size} Image${selectedImages.size === 1 ? "" : "s"}`}
			</Button>
		</div>
	{/snippet}
</Dialog>

<style>
	/* Gallery Section */
	:global(.gallery-section) {
		padding: 1.5rem;
	}

	.section-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
		margin-bottom: 1rem;
	}

	.section-header h2 {
		margin: 0;
		font-size: 1.1rem;
		font-weight: 600;
		color: var(--color-text);
	}

	.section-title {
		display: flex;
		align-items: baseline;
		gap: 0.75rem;
	}

	.section-subtitle {
		font-size: 0.85rem;
		color: var(--color-text-muted);
	}

	.gallery-controls {
		display: flex;
		gap: 0.75rem;
		align-items: center;
		flex-wrap: wrap;
	}

	.gallery-controls select {
		padding: 0.4rem 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius-small);
		background: var(--mobile-menu-bg);
		color: var(--color-text);
		font-size: 0.85rem;
	}

	:global(.dark) .gallery-controls select {
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(255, 255, 255, 0.1);
	}

	.filter-group {
		display: flex;
		gap: 0.5rem;
	}

	.filter-group input {
		padding: 0.4rem 0.75rem;
		border: 1px solid var(--color-border);
		border-radius: var(--border-radius-small);
		background: var(--mobile-menu-bg);
		color: var(--color-text);
		font-size: 0.85rem;
		min-width: 150px;
	}

	:global(.dark) .filter-group input {
		background: rgba(255, 255, 255, 0.05);
		border-color: rgba(255, 255, 255, 0.1);
	}

	.backfill-progress {
		margin: 1rem 0;
		display: flex;
		align-items: center;
		gap: 0.75rem;
	}

	.backfill-bar {
		flex: 1;
		height: 6px;
		background: var(--color-border);
		border-radius: 3px;
		overflow: hidden;
	}

	.backfill-fill {
		height: 100%;
		background: var(--color-primary);
		transition: width 0.3s ease;
		border-radius: 3px;
	}

	.backfill-label {
		font-size: 0.8rem;
		color: var(--color-text-muted);
		white-space: nowrap;
	}

	.gallery-error {
		background: var(--status-danger-bg);
		color: var(--accent-danger);
		padding: 1rem;
		border-radius: var(--border-radius-small);
		margin: 1rem 0;
	}

	.gallery-loading,
	.gallery-empty {
		text-align: center;
		color: var(--color-text-muted);
		padding: 3rem;
	}

	.gallery-loading {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.75rem;
	}

	.spinner {
		width: 20px;
		height: 20px;
		border: 2px solid var(--color-border);
		border-top-color: var(--color-primary);
		border-radius: 50%;
		animation: spin 0.8s linear infinite;
	}

	@keyframes spin {
		to {
			transform: rotate(360deg);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.spinner {
			animation: none;
		}
	}

	.gallery-empty svg {
		width: 48px;
		height: 48px;
		margin-bottom: 1rem;
		opacity: 0.5;
	}

	.gallery-grid {
		display: grid;
		grid-template-columns: repeat(auto-fill, minmax(160px, 1fr));
		gap: 1rem;
		margin-top: 1rem;
	}

	.gallery-card {
		position: relative;
		background: var(--glass-bg-medium);
		backdrop-filter: blur(8px);
		border: 1px solid var(--glass-border);
		border-radius: var(--border-radius-standard);
		overflow: hidden;
		transition:
			transform 0.2s,
			box-shadow 0.2s,
			background-color 0.2s;
	}

	:global(.dark) .gallery-card {
		background: var(--glass-bg-medium);
		border-color: var(--glass-border);
	}

	.gallery-card:hover {
		transform: translateY(-2px);
		box-shadow: var(--shadow-md);
		background: var(--glass-bg);
	}

	:global(.dark) .gallery-card:hover {
		background: var(--glass-bg);
	}

	.gallery-image {
		aspect-ratio: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		background: var(--color-bg-secondary);
		overflow: hidden;
	}

	.gallery-image img {
		max-width: 100%;
		max-height: 100%;
		object-fit: contain;
	}

	.gallery-info {
		padding: 0.75rem;
		border-top: 1px solid var(--color-border);
	}

	.gallery-name {
		display: block;
		font-size: 0.8rem;
		font-weight: 500;
		color: var(--color-text);
		white-space: nowrap;
		overflow: hidden;
		text-overflow: ellipsis;
		margin-bottom: 0.25rem;
	}

	.gallery-meta {
		display: flex;
		justify-content: space-between;
		font-size: 0.7rem;
		color: var(--color-text-muted);
	}

	.gallery-actions {
		display: flex;
		gap: 0.25rem;
		padding: 0.5rem 0.75rem;
		border-top: 1px solid var(--color-border);
	}

	.action-btn {
		flex: 1;
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.4rem;
		border: none;
		border-radius: var(--border-radius-small);
		cursor: pointer;
		transition:
			background 0.2s,
			color 0.2s;
	}

	.action-btn svg {
		width: 16px;
		height: 16px;
	}

	.action-btn.copy {
		background: var(--color-bg-secondary);
		color: var(--color-text-muted);
	}

	:global(.dark) .action-btn.copy {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.action-btn.copy:hover {
		background: var(--color-primary);
		color: white;
	}

	.action-btn.delete {
		background: var(--color-bg-secondary);
		color: var(--color-text-muted);
	}

	:global(.dark) .action-btn.delete {
		background: rgba(255, 255, 255, 0.05);
		border: 1px solid rgba(255, 255, 255, 0.1);
	}

	.action-btn.delete:hover {
		background: var(--accent-danger);
		color: white;
	}

	.gallery-load-more {
		text-align: center;
		margin-top: 1.5rem;
	}

	/* Delete Modal */
	.delete-preview {
		display: flex;
		justify-content: center;
		background: var(--color-bg-secondary);
		border-radius: var(--border-radius-small);
		padding: 0.5rem;
		margin-bottom: 1rem;
		max-height: 150px;
		overflow: hidden;
	}

	.delete-preview img {
		max-width: 100%;
		max-height: 130px;
		object-fit: contain;
	}

	.delete-preview-fallback {
		display: flex;
		align-items: center;
		justify-content: center;
		width: 100%;
		height: 80px;
		color: var(--color-text-muted);
		opacity: 0.5;
	}

	.delete-preview-fallback svg {
		width: 40px;
		height: 40px;
	}

	.delete-preview-fallback.hidden {
		display: none;
	}

	.delete-filename {
		font-family: monospace;
		font-size: 0.85rem;
		color: var(--color-text-muted);
		word-break: break-all;
		margin: 0 0 1rem 0;
	}

	.delete-warning {
		color: var(--accent-danger);
		font-size: 0.85rem;
		font-weight: 500;
		margin: 0 0 1rem 0;
	}

	.modal-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
	}

	/* Selection Mode */
	.selection-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		margin-top: 1rem;
		background: var(--glass-bg-medium);
		backdrop-filter: blur(8px);
		border: 1px solid var(--glass-border);
		border-radius: var(--border-radius-standard);
	}

	.selection-bar-left {
		display: flex;
		align-items: center;
		gap: 1rem;
	}

	.select-all-btn {
		background: none;
		border: 1px solid var(--color-border);
		color: var(--color-text);
		padding: 0.35rem 0.75rem;
		border-radius: var(--border-radius-small);
		font-size: 0.8rem;
		cursor: pointer;
		transition: background 0.2s;
	}

	.select-all-btn:hover {
		background: var(--color-bg-secondary);
	}

	.selection-count {
		font-size: 0.85rem;
		color: var(--color-text-muted);
		font-weight: 500;
	}

	.gallery-card.selected {
		border-color: var(--color-primary);
		background: var(--grove-overlay-10, rgba(var(--color-primary-rgb, 76, 133, 87), 0.1));
		box-shadow: 0 0 0 2px var(--color-primary);
	}

	.gallery-card.selected .gallery-image {
		opacity: 0.85;
	}

	.selection-checkbox {
		position: absolute;
		top: 0.5rem;
		left: 0.5rem;
		width: 24px;
		height: 24px;
		border-radius: 6px;
		border: 2px solid var(--glass-border);
		background: var(--glass-bg);
		backdrop-filter: blur(8px);
		z-index: 2;
		display: flex;
		align-items: center;
		justify-content: center;
		transition: all 0.15s ease;
	}

	.selection-checkbox.checked {
		background: var(--color-primary);
		border-color: var(--color-primary);
	}

	.selection-checkbox svg {
		width: 14px;
		height: 14px;
		color: white;
	}

	/* Bulk Delete Modal */
	.bulk-delete-content {
		margin-bottom: 1rem;
	}

	.bulk-delete-count {
		font-size: 0.95rem;
		color: var(--color-text);
		margin: 0 0 1rem 0;
	}

	.bulk-deleting-status {
		font-size: 0.85rem;
		color: var(--color-text-muted);
		margin: 0.5rem 0 0;
	}

	/* Responsive */
	@media (max-width: 768px) {
		.gallery-controls {
			flex-direction: column;
			align-items: stretch;
		}

		.filter-group {
			flex-direction: column;
		}

		.filter-group input {
			min-width: 0;
			width: 100%;
		}

		.gallery-grid {
			grid-template-columns: repeat(3, 1fr);
			gap: 0.75rem;
		}

		.selection-bar {
			flex-direction: column;
			gap: 0.75rem;
			text-align: center;
		}

		.selection-bar-left {
			justify-content: center;
		}
	}
</style>
