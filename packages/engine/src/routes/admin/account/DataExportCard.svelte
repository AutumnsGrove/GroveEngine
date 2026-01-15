<script lang="ts">
  import { GlassCard, Button, Spinner } from "$lib/ui";
  import { Download } from "lucide-svelte";
  import type { ExportType } from "./types";

  interface Props {
    exportType: ExportType;
    exportingData: boolean;
    onExport: () => void;
    onExportTypeChange: (type: ExportType) => void;
  }

  let { exportType, exportingData, onExport, onExportTypeChange }: Props = $props();
</script>

<GlassCard variant="default" class="mb-6">
  <h2>Your Data</h2>
  <p class="section-description">
    You own your content. Export your blog posts, pages, images, and account
    data at any time. We believe in data portability — you should never feel
    locked in.
  </p>
  <p class="export-format-note">
    Exports are in JSON format. Media files are listed with download URLs
    (not bundled in the export).
  </p>

  <fieldset class="export-options">
    <legend class="sr-only">Choose export type</legend>
    <label class="export-option">
      <input
        type="radio"
        name="exportType"
        value="full"
        checked={exportType === "full"}
        onchange={() => onExportTypeChange("full")}
      />
      <div class="export-info">
        <span class="export-name">Full Export</span>
        <span class="export-desc">All posts, pages, images, and settings</span>
      </div>
    </label>

    <label class="export-option">
      <input
        type="radio"
        name="exportType"
        value="posts"
        checked={exportType === "posts"}
        onchange={() => onExportTypeChange("posts")}
      />
      <div class="export-info">
        <span class="export-name">Posts Only</span>
        <span class="export-desc">All blog posts in Markdown format</span>
      </div>
    </label>

    <label class="export-option">
      <input
        type="radio"
        name="exportType"
        value="media"
        checked={exportType === "media"}
        onchange={() => onExportTypeChange("media")}
      />
      <div class="export-info">
        <span class="export-name">Media Only</span>
        <span class="export-desc">All uploaded images and files</span>
      </div>
    </label>
  </fieldset>

  <Button
    variant="secondary"
    onclick={onExport}
    disabled={exportingData}
    aria-busy={exportingData}
    aria-label={exportingData ? "Exporting data..." : "Export data"}
  >
    {#if exportingData}
      <span aria-hidden="true"><Spinner size="sm" /></span>
    {:else}
      <Download class="btn-icon" aria-hidden="true" />
    {/if}
    Export Data
  </Button>
</GlassCard>

<style>
  .section-description {
    margin: 0 0 1rem 0;
    color: var(--color-text-muted);
    font-size: 0.9rem;
    line-height: 1.5;
  }

  .export-format-note {
    margin: 0 0 1rem 0;
    color: var(--color-text-muted);
    font-size: 0.8rem;
    font-style: italic;
    opacity: 0.8;
  }

  /* Screen reader only */
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }

  .export-options {
    display: flex;
    flex-direction: column;
    gap: 0.75rem;
    margin-bottom: 1rem;
    border: none;
    padding: 0;
  }

  .export-option {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    padding: 0.75rem 1rem;
    border: 2px solid var(--color-border);
    border-radius: var(--border-radius-standard);
    cursor: pointer;
    transition: border-color 0.2s;
  }

  .export-option:hover {
    border-color: var(--color-primary);
  }

  .export-option:has(input:checked) {
    border-color: var(--color-primary);
    background: rgba(44, 95, 45, 0.05);
  }

  .export-option input {
    width: 18px;
    height: 18px;
    accent-color: var(--color-primary);
  }

  .export-info {
    display: flex;
    flex-direction: column;
    gap: 0.125rem;
  }

  .export-name {
    font-weight: 500;
    color: var(--color-text);
  }

  .export-desc {
    font-size: 0.85rem;
    color: var(--color-text-muted);
  }

  :global(.btn-icon) {
    width: 1rem;
    height: 1rem;
    margin-right: 0.375rem;
  }
</style>
