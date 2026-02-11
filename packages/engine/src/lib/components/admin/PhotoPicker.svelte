<script>
  import { GlassCard } from '$lib/ui';
  import { apiRequest } from '$lib/utils/api';
  import { X, Check, Search, Images } from 'lucide-svelte';

  /**
   * @typedef {Object} PickerImage
   * @property {string} key
   * @property {string} url
   * @property {number} size
   * @property {string | null} custom_title
   * @property {string} parsed_slug
   */

  /** @type {{ onInsert: (urls: string[]) => void, onClose: () => void }} */
  let { onInsert, onClose } = $props();

  /** @type {PickerImage[]} */
  let images = $state([]);
  let loading = $state(true);
  let error = $state(/** @type {string | null} */ (null));
  let searchQuery = $state("");

  /** @type {Set<string>} */
  let selected = $state(new Set());

  let cursor = $state(/** @type {string | null} */ (null));
  let hasMore = $state(false);
  let loadingMore = $state(false);

  /** @type {HTMLDivElement | null} */
  let panelRef = $state(null);

  // Fetch images on mount
  $effect(() => {
    fetchImages();
  });

  async function fetchImages() {
    loading = true;
    error = null;
    try {
      const params = new URLSearchParams({ limit: "50", sortBy: "date-desc" });
      if (searchQuery) params.set("search", searchQuery);
      const result = await apiRequest(`/api/images/list?${params}`);
      images = result.images || [];
      cursor = result.cursor || null;
      hasMore = !!result.truncated;
    } catch (err) {
      error = err instanceof Error ? err.message : "Failed to load photos";
    } finally {
      loading = false;
    }
  }

  async function loadMore() {
    if (!cursor || loadingMore) return;
    loadingMore = true;
    try {
      const params = new URLSearchParams({
        limit: "50",
        sortBy: "date-desc",
        cursor,
      });
      if (searchQuery) params.set("search", searchQuery);
      const result = await apiRequest(`/api/images/list?${params}`);
      images = [...images, ...(result.images || [])];
      cursor = result.cursor || null;
      hasMore = !!result.truncated;
    } catch {
      // silently fail on load-more
    } finally {
      loadingMore = false;
    }
  }

  /** @type {ReturnType<typeof setTimeout> | null} */
  let searchTimer = null;

  function handleSearchInput() {
    if (searchTimer) clearTimeout(searchTimer);
    searchTimer = setTimeout(() => {
      cursor = null;
      fetchImages();
    }, 300);
  }

  /** @param {string} url */
  function toggleSelect(url) {
    const next = new Set(selected);
    if (next.has(url)) {
      next.delete(url);
    } else {
      next.add(url);
    }
    selected = next;
  }

  function handleInsert() {
    onInsert(Array.from(selected));
  }

  /** @param {MouseEvent} e */
  function handleBackdropClick(e) {
    if (e.target === e.currentTarget) {
      onClose();
    }
  }

  /** @param {KeyboardEvent} e */
  function handleKeydown(e) {
    if (e.key === "Escape") {
      e.stopPropagation();
      onClose();
    }
  }

  let selectedCount = $derived(selected.size);
</script>

<!-- svelte-ignore a11y_no_static_element_interactions -->
<div
  class="photo-picker-backdrop"
  onclick={handleBackdropClick}
  onkeydown={handleKeydown}
>
  <div class="photo-picker-panel" bind:this={panelRef} role="dialog" aria-modal="true" aria-label="Insert photo from gallery">
    <GlassCard variant="frosted">
      <!-- Header -->
      <div class="picker-header">
        <div class="picker-title">
          <Images size={18} />
          <span>Photo Gallery</span>
        </div>
        <button type="button" class="picker-close" onclick={onClose} aria-label="Close photo picker">
          <X size={18} />
        </button>
      </div>

      <!-- Search -->
      <div class="picker-search">
        <Search size={14} class="search-icon" />
        <input
          type="text"
          placeholder="Search photos..."
          bind:value={searchQuery}
          oninput={handleSearchInput}
          class="search-input"
        />
      </div>

      <!-- Grid -->
      <div class="picker-grid-scroll">
        {#if loading}
          <div class="picker-skeleton-grid">
            {#each Array(8) as _}
              <div class="skeleton-thumb"></div>
            {/each}
          </div>
        {:else if error}
          <div class="picker-empty">
            <p class="picker-error">{error}</p>
          </div>
        {:else if images.length === 0}
          <div class="picker-empty">
            <Images size={32} class="empty-icon" />
            <p>No photos yet</p>
            <p class="picker-empty-hint">Upload photos in the <a href="/arbor/images">image manager</a></p>
          </div>
        {:else}
          <div class="picker-grid">
            {#each images as image (image.key)}
              <button
                type="button"
                class="picker-thumb"
                class:selected={selected.has(image.url)}
                onclick={() => toggleSelect(image.url)}
                title={image.custom_title || image.parsed_slug}
                aria-label="Select {image.custom_title || image.parsed_slug}"
              >
                <img
                  src="{image.url}?w=200&h=150&fit=cover"
                  alt={image.custom_title || image.parsed_slug}
                  loading="lazy"
                />
                {#if selected.has(image.url)}
                  <div class="thumb-check">
                    <Check size={16} />
                  </div>
                {/if}
              </button>
            {/each}
          </div>
          {#if hasMore}
            <div class="picker-load-more">
              <button type="button" class="load-more-btn" onclick={loadMore} disabled={loadingMore}>
                {loadingMore ? "Loading..." : "Load more"}
              </button>
            </div>
          {/if}
        {/if}
      </div>

      <!-- Footer -->
      <div class="picker-footer">
        <span class="picker-count">
          {#if selectedCount > 0}
            {selectedCount} photo{selectedCount !== 1 ? "s" : ""} selected
            {#if selectedCount > 1}
              <span class="picker-hint">(will insert as gallery)</span>
            {/if}
          {:else}
            Click to select photos
          {/if}
        </span>
        <div class="picker-actions">
          <button type="button" class="picker-cancel" onclick={onClose}>Cancel</button>
          <button type="button" class="picker-insert" onclick={handleInsert} disabled={selectedCount === 0}>
            Insert{#if selectedCount > 0} ({selectedCount}){/if}
          </button>
        </div>
      </div>
    </GlassCard>
  </div>
</div>

<style>
  .photo-picker-backdrop {
    position: fixed;
    inset: 0;
    z-index: 200;
    background: rgba(0, 0, 0, 0.5);
    display: flex;
    align-items: center;
    justify-content: center;
    animation: fadeIn 0.15s ease;
  }
  .photo-picker-panel {
    width: 90%;
    max-width: 680px;
    max-height: 80vh;
    display: flex;
    flex-direction: column;
    animation: slideUp 0.2s ease;
  }
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  @keyframes slideUp {
    from { opacity: 0; transform: translateY(12px); }
    to { opacity: 1; transform: translateY(0); }
  }

  /* Header */
  .picker-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-bottom: 0.75rem;
    border-bottom: 1px solid rgba(0, 0, 0, 0.1);
    margin-bottom: 0.75rem;
  }
  .picker-title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    font-weight: 600;
    font-size: 0.95rem;
    color: var(--color-foreground, #1a1a1a);
  }
  :global(.dark) .picker-title {
    color: var(--color-foreground-dark, #e0e0e0);
  }
  .picker-close {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 0.25rem;
    background: transparent;
    border: none;
    color: var(--color-foreground-muted, #666);
    border-radius: 4px;
    cursor: pointer;
    transition: background 0.15s ease;
  }
  .picker-close:hover {
    background: rgba(0, 0, 0, 0.08);
  }
  :global(.dark) .picker-close:hover {
    background: rgba(255, 255, 255, 0.1);
  }

  /* Search */
  .picker-search {
    position: relative;
    margin-bottom: 0.75rem;
  }
  :global(.search-icon) {
    position: absolute;
    left: 0.75rem;
    top: 50%;
    transform: translateY(-50%);
    color: var(--color-foreground-subtle, #999);
    pointer-events: none;
  }
  .search-input {
    width: 100%;
    padding: 0.5rem 0.75rem 0.5rem 2rem;
    border: 1px solid rgba(0, 0, 0, 0.15);
    border-radius: 6px;
    background: rgba(255, 255, 255, 0.5);
    font-size: 0.85rem;
    color: var(--color-foreground, #1a1a1a);
    outline: none;
    transition: border-color 0.15s ease;
  }
  .search-input:focus {
    border-color: var(--grove-500, #22c55e);
  }
  :global(.dark) .search-input {
    background: rgba(0, 0, 0, 0.2);
    border-color: rgba(255, 255, 255, 0.15);
    color: var(--color-foreground-dark, #e0e0e0);
  }

  /* Grid scroll area */
  .picker-grid-scroll {
    overflow-y: auto;
    max-height: 45vh;
    min-height: 200px;
    margin-bottom: 0.75rem;
  }
  .picker-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
  }
  @media (max-width: 480px) {
    .picker-grid {
      grid-template-columns: repeat(2, 1fr);
    }
  }
  @media (min-width: 481px) and (max-width: 640px) {
    .picker-grid {
      grid-template-columns: repeat(3, 1fr);
    }
  }

  /* Thumbnails */
  .picker-thumb {
    position: relative;
    aspect-ratio: 4 / 3;
    border-radius: 6px;
    overflow: hidden;
    border: 2px solid transparent;
    cursor: pointer;
    padding: 0;
    background: rgba(0, 0, 0, 0.05);
    transition: border-color 0.15s ease, transform 0.1s ease;
  }
  .picker-thumb:hover {
    transform: scale(1.02);
  }
  .picker-thumb.selected {
    border-color: var(--grove-500, #22c55e);
    box-shadow: 0 0 0 2px rgba(34, 197, 94, 0.3);
  }
  .picker-thumb img {
    width: 100%;
    height: 100%;
    object-fit: cover;
    display: block;
  }
  .thumb-check {
    position: absolute;
    top: 4px;
    right: 4px;
    width: 24px;
    height: 24px;
    background: var(--grove-500, #22c55e);
    color: white;
    border-radius: 50%;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  }

  /* Skeleton */
  .picker-skeleton-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 0.5rem;
  }
  .skeleton-thumb {
    aspect-ratio: 4 / 3;
    border-radius: 6px;
    background: linear-gradient(90deg, rgba(0, 0, 0, 0.06) 25%, rgba(0, 0, 0, 0.1) 50%, rgba(0, 0, 0, 0.06) 75%);
    background-size: 200% 100%;
    animation: shimmer 1.5s ease infinite;
  }
  :global(.dark) .skeleton-thumb {
    background: linear-gradient(90deg, rgba(255, 255, 255, 0.04) 25%, rgba(255, 255, 255, 0.08) 50%, rgba(255, 255, 255, 0.04) 75%);
    background-size: 200% 100%;
  }
  @keyframes shimmer {
    0% { background-position: 200% 0; }
    100% { background-position: -200% 0; }
  }

  /* Empty */
  .picker-empty {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    gap: 0.5rem;
    padding: 3rem 1rem;
    color: var(--color-foreground-muted, #666);
    text-align: center;
  }
  :global(.empty-icon) {
    opacity: 0.4;
  }
  .picker-empty-hint {
    font-size: 0.8rem;
    color: var(--color-foreground-subtle, #999);
  }
  .picker-empty-hint a {
    color: var(--grove-500, #22c55e);
    text-decoration: underline;
  }
  .picker-error {
    color: var(--grove-error, #ef4444);
  }

  /* Load more */
  .picker-load-more {
    text-align: center;
    padding: 0.75rem;
  }
  .load-more-btn {
    padding: 0.4rem 1rem;
    background: transparent;
    border: 1px solid rgba(0, 0, 0, 0.15);
    border-radius: 6px;
    font-size: 0.8rem;
    color: var(--color-foreground-muted, #666);
    cursor: pointer;
    transition: background 0.15s ease;
  }
  .load-more-btn:hover {
    background: rgba(0, 0, 0, 0.05);
  }
  .load-more-btn:disabled {
    opacity: 0.5;
    cursor: default;
  }

  /* Footer */
  .picker-footer {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding-top: 0.75rem;
    border-top: 1px solid rgba(0, 0, 0, 0.1);
    gap: 0.75rem;
  }
  .picker-count {
    font-size: 0.8rem;
    color: var(--color-foreground-muted, #666);
  }
  .picker-hint {
    font-size: 0.75rem;
    color: var(--color-foreground-subtle, #999);
    font-style: italic;
  }
  .picker-actions {
    display: flex;
    gap: 0.5rem;
  }
  .picker-cancel {
    padding: 0.4rem 0.75rem;
    background: transparent;
    border: 1px solid rgba(0, 0, 0, 0.15);
    border-radius: 6px;
    font-size: 0.8rem;
    color: var(--color-foreground-muted, #666);
    cursor: pointer;
    transition: background 0.15s ease;
  }
  .picker-cancel:hover {
    background: rgba(0, 0, 0, 0.05);
  }
  .picker-insert {
    padding: 0.4rem 0.75rem;
    background: var(--grove-500, #22c55e);
    border: none;
    border-radius: 6px;
    font-size: 0.8rem;
    font-weight: 600;
    color: white;
    cursor: pointer;
    transition: background 0.15s ease, opacity 0.15s ease;
  }
  .picker-insert:hover {
    background: var(--grove-600, #16a34a);
  }
  .picker-insert:disabled {
    opacity: 0.4;
    cursor: not-allowed;
  }
</style>
