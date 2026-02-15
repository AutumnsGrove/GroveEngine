<script lang="ts">
  import { enhance } from "$app/forms";
  import { GlassCard, GlassButton, toast } from "$lib/ui/components/ui";
  import { Hash, ArrowLeft, RotateCcw } from "lucide-svelte";
  import {
    formatCount,
    toDigits,
    formatSinceDate,
    type HitCounterStyle,
  } from "$lib/curios/hitcounter";

  let { data, form } = $props();

  // Config form state
  let style = $state<HitCounterStyle>("classic");
  let label = $state("You are visitor");
  let showSinceDate = $state(true);
  let isSubmitting = $state(false);

  // Sync form state with loaded data
  $effect(() => {
    if (data.config) {
      style = (data.config.style as HitCounterStyle) ?? "classic";
      label = data.config.label ?? "You are visitor";
      showSinceDate = data.config.showSinceDate ?? true;
    }
  });

  // Show toast on form result
  $effect(() => {
    if (form?.success && form?.reset) {
      toast.success("Counter reset to zero!");
    } else if (form?.success) {
      toast.success("Hit counter settings saved!");
    } else if (form?.error) {
      toast.error("Failed to save", { description: form.error });
    }
  });

  const previewCount = $derived(data.config?.count ?? 0);
  const previewDigits = $derived(toDigits(previewCount));
  const previewFormatted = $derived(formatCount(previewCount));
</script>

<svelte:head>
  <title>Hit Counter - Admin</title>
</svelte:head>

<div class="hitcounter-admin">
  <header class="page-header">
    <div class="header-top">
      <GlassButton href="/arbor/curios" variant="ghost" class="back-link">
        <ArrowLeft class="w-4 h-4" />
        Back to Curios
      </GlassButton>
    </div>
    <div class="title-row">
      <Hash class="header-icon" />
      <h1>Hit Counter</h1>
    </div>
    <p class="subtitle">
      The nostalgic page view counter. No tracking, just a number.
    </p>
  </header>

  <!-- Live Preview -->
  <GlassCard class="preview-card">
    <h3 class="preview-title">Preview</h3>
    <div class="counter-preview style-{style}">
      {#if style === "minimal"}
        <div class="minimal-counter">
          <span class="minimal-label">{label}</span>
          <span class="minimal-number">#{previewFormatted}</span>
        </div>
      {:else if style === "lcd"}
        <div class="lcd-counter">
          <div class="lcd-screen">
            {#each previewDigits as digit}
              <span class="lcd-digit">{digit}</span>
            {/each}
          </div>
          <span class="lcd-label">{label}</span>
        </div>
      {:else if style === "odometer"}
        <div class="odometer-counter">
          <div class="odometer-digits">
            {#each previewDigits as digit}
              <span class="odometer-cell">{digit}</span>
            {/each}
          </div>
          <span class="odometer-label">{label}</span>
        </div>
      {:else}
        <div class="classic-counter">
          <div class="classic-digits">
            {#each previewDigits as digit}
              <span class="classic-digit">{digit}</span>
            {/each}
          </div>
          <span class="classic-label">{label}</span>
        </div>
      {/if}
      {#if showSinceDate && data.config?.startedAt}
        <span class="since-date">{formatSinceDate(data.config.startedAt)}</span>
      {/if}
    </div>
  </GlassCard>

  <!-- Settings -->
  <GlassCard class="settings-card">
    <form
      method="POST"
      action="?/save"
      use:enhance={() => {
        isSubmitting = true;
        return async ({ update }) => {
          isSubmitting = false;
          await update();
        };
      }}
    >
      <!-- Current Count -->
      <div class="form-section">
        <h3>Current Count</h3>
        <div class="count-display">
          <span class="big-count">{previewFormatted}</span>
          <span class="count-hint">visitors</span>
        </div>
      </div>

      <!-- Display Style -->
      <div class="form-section">
        <h3>Display Style</h3>
        <div class="style-grid">
          {#each data.styleOptions as option}
            <label
              class="style-option"
              class:selected={style === option.value}
            >
              <input
                type="radio"
                name="style"
                value={option.value}
                bind:group={style}
              />
              <span class="style-name">{option.label}</span>
              <span class="style-desc">{option.description}</span>
            </label>
          {/each}
        </div>
      </div>

      <!-- Label -->
      <div class="form-section">
        <h3>Label</h3>
        <div class="input-group">
          <label class="input-label" for="counterLabel">
            Text shown next to the counter
          </label>
          <input
            id="counterLabel"
            type="text"
            name="label"
            bind:value={label}
            placeholder="You are visitor"
            maxlength="100"
            class="text-input"
          />
        </div>
      </div>

      <!-- Since Date -->
      <div class="form-section">
        <h3>Options</h3>
        <label class="toggle-row">
          <span class="toggle-label">
            <strong>Show "since" date</strong>
            <span class="toggle-hint">Display when the counter started</span>
          </span>
          <input
            type="checkbox"
            name="showSinceDate"
            value="true"
            bind:checked={showSinceDate}
            class="toggle-input"
          />
        </label>
      </div>

      <div class="form-actions">
        <GlassButton type="submit" variant="accent" disabled={isSubmitting}>
          {isSubmitting ? "Saving..." : "Save Configuration"}
        </GlassButton>
      </div>
    </form>
  </GlassCard>

  <!-- Danger Zone -->
  <GlassCard class="danger-card">
    <h3>Reset Counter</h3>
    <p class="danger-hint">Set the counter back to zero. This can't be undone.</p>
    <form
      method="POST"
      action="?/reset"
      use:enhance={({ cancel }) => {
        if (!confirm("Reset the counter to zero? This can't be undone.")) {
          cancel();
          return;
        }
        return async ({ update }) => {
          await update();
        };
      }}
    >
      <GlassButton type="submit" variant="ghost" class="reset-btn">
        <RotateCcw class="w-4 h-4" />
        Reset to Zero
      </GlassButton>
    </form>
  </GlassCard>
</div>

<style>
  .hitcounter-admin {
    max-width: 800px;
    margin: 0 auto;
  }

  .page-header {
    margin-bottom: 2rem;
  }

  .header-top {
    margin-bottom: 1rem;
  }

  .title-row {
    display: flex;
    align-items: center;
    gap: 0.75rem;
    margin-bottom: 0.5rem;
  }

  :global(.header-icon) {
    width: 2rem;
    height: 2rem;
    color: var(--color-primary);
  }

  h1 {
    font-size: 2rem;
    font-weight: 700;
    color: var(--color-text);
    margin: 0;
  }

  .subtitle {
    color: var(--color-text-muted);
    font-size: 1rem;
    line-height: 1.6;
  }

  /* ─── Preview ─── */
  :global(.preview-card) {
    padding: 1.5rem !important;
    margin-bottom: 1.5rem;
  }

  .preview-title {
    font-size: 0.9rem;
    font-weight: 600;
    color: var(--color-text-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin: 0 0 1rem;
  }

  .counter-preview {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
    padding: 1.5rem;
    border-radius: 0.75rem;
    background: var(--grove-overlay-4, rgba(0, 0, 0, 0.02));
  }

  .since-date {
    font-size: 0.75rem;
    color: var(--color-text-muted);
    font-style: italic;
  }

  /* Classic Style */
  .classic-counter {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .classic-digits {
    display: flex;
    gap: 2px;
  }

  .classic-digit {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2.75rem;
    background: #111;
    color: #00ff41;
    font-family: "Courier New", Courier, monospace;
    font-size: 1.5rem;
    font-weight: 700;
    border-radius: 3px;
  }

  .classic-label {
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  /* Odometer Style */
  .odometer-counter {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .odometer-digits {
    display: flex;
    gap: 1px;
  }

  .odometer-cell {
    display: flex;
    align-items: center;
    justify-content: center;
    width: 2rem;
    height: 2.75rem;
    background: linear-gradient(180deg, #333 0%, #444 45%, #222 55%, #333 100%);
    color: #fff;
    font-family: "Courier New", Courier, monospace;
    font-size: 1.5rem;
    font-weight: 700;
    border: 1px solid #555;
    border-radius: 2px;
  }

  .odometer-label {
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  /* LCD Style */
  .lcd-counter {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 0.5rem;
  }

  .lcd-screen {
    display: flex;
    gap: 4px;
    padding: 0.75rem 1rem;
    background: #c5cba3;
    border-radius: 4px;
    border: 2px solid #8a8f6e;
    box-shadow: inset 0 2px 4px rgba(0, 0, 0, 0.15);
  }

  .lcd-digit {
    font-family: "Courier New", Courier, monospace;
    font-size: 1.75rem;
    font-weight: 700;
    color: #2a2e1a;
    letter-spacing: 0.05em;
  }

  .lcd-label {
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  /* Minimal Style */
  .minimal-counter {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    font-size: 1.1rem;
  }

  .minimal-label {
    color: var(--color-text-muted);
  }

  .minimal-number {
    font-weight: 700;
    color: var(--color-text);
    font-size: 1.5rem;
  }

  /* ─── Settings ─── */
  :global(.settings-card) {
    padding: 1.5rem !important;
    margin-bottom: 1.5rem;
  }

  .form-section {
    margin-bottom: 2rem;
    padding-bottom: 1.5rem;
    border-bottom: 1px solid var(--color-border, #e5e7eb);
  }

  .form-section:last-of-type {
    border-bottom: none;
    margin-bottom: 1rem;
  }

  .form-section h3 {
    font-size: 1rem;
    font-weight: 600;
    color: var(--color-text);
    margin: 0 0 1rem;
  }

  .count-display {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
  }

  .big-count {
    font-size: 2.5rem;
    font-weight: 700;
    color: var(--color-text);
    font-variant-numeric: tabular-nums;
  }

  .count-hint {
    font-size: 0.9rem;
    color: var(--color-text-muted);
  }

  .style-grid {
    display: grid;
    grid-template-columns: repeat(2, 1fr);
    gap: 0.75rem;
  }

  .style-option {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
    padding: 1rem;
    border: 2px solid var(--color-border, #e5e7eb);
    border-radius: 0.75rem;
    cursor: pointer;
    transition: all 0.2s ease;
  }

  .style-option:hover {
    border-color: var(--color-primary);
    background: var(--grove-overlay-4, rgba(0, 0, 0, 0.04));
  }

  .style-option.selected {
    border-color: var(--color-primary);
    background: color-mix(in srgb, var(--color-primary) 10%, transparent);
  }

  .style-option input[type="radio"] {
    display: none;
  }

  .style-name {
    font-weight: 600;
    font-size: 0.95rem;
    color: var(--color-text);
  }

  .style-desc {
    font-size: 0.8rem;
    color: var(--color-text-muted);
  }

  .input-group {
    margin-bottom: 1rem;
  }

  .input-label {
    display: block;
    font-size: 0.9rem;
    font-weight: 500;
    color: var(--color-text);
    margin-bottom: 0.5rem;
  }

  .text-input {
    width: 100%;
    padding: 0.625rem 0.875rem;
    border: 1px solid var(--color-border, #e5e7eb);
    border-radius: 0.5rem;
    font-size: 0.9rem;
    color: var(--color-text);
    background: hsl(var(--background));
    transition: border-color 0.2s ease;
  }

  .text-input:focus {
    outline: none;
    border-color: var(--color-primary);
    box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 20%, transparent);
  }

  .toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 1rem;
    cursor: pointer;
  }

  .toggle-label {
    display: flex;
    flex-direction: column;
    gap: 0.25rem;
  }

  .toggle-hint {
    font-size: 0.85rem;
    color: var(--color-text-muted);
  }

  .toggle-input {
    width: 2.5rem;
    height: 1.25rem;
    accent-color: var(--color-primary);
    cursor: pointer;
  }

  .form-actions {
    display: flex;
    justify-content: flex-end;
    padding-top: 1rem;
  }

  /* ─── Danger Zone ─── */
  :global(.danger-card) {
    padding: 1.5rem !important;
    border-color: hsl(var(--destructive) / 0.2) !important;
  }

  :global(.dark .danger-card) {
    border-color: hsl(var(--destructive) / 0.15) !important;
  }

  .danger-card h3 {
    font-size: 1rem;
    font-weight: 600;
    color: hsl(var(--destructive));
    margin: 0 0 0.5rem;
  }

  .danger-hint {
    font-size: 0.85rem;
    color: var(--color-text-muted);
    margin: 0 0 1rem;
  }

  :global(.reset-btn) {
    color: hsl(var(--destructive)) !important;
  }

  :global(.reset-btn:hover) {
    background: hsl(var(--destructive) / 0.1) !important;
  }

  :global(.dark .reset-btn:hover) {
    background: rgb(127 29 29 / 0.3) !important;
  }

  @media (max-width: 640px) {
    .title-row {
      flex-wrap: wrap;
    }

    .style-grid {
      grid-template-columns: 1fr;
    }

    .toggle-row {
      flex-wrap: wrap;
    }

    .count-display {
      flex-wrap: wrap;
    }
  }
</style>
