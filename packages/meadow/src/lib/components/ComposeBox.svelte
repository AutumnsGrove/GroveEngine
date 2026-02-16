<!--
  ComposeBox — Leave a note in the meadow.

  Collapsed: a single-line glass prompt.
  Expanded: textarea with character counter, optional tags, submit button.
  Wires to POST /api/notes, emits oncreated with the new post.
-->
<script lang="ts">
  import type { MeadowPost } from "$lib/types/post";

  interface Props {
    userName: string | null;
    oncreated: (post: MeadowPost) => void;
  }

  const { userName, oncreated }: Props = $props();

  const MAX_BODY = 500;
  const WARN_AT = 450;
  const MAX_TAGS = 5;

  let expanded = $state(false);
  let body = $state("");
  let tagInput = $state("");
  let tags = $state<string[]>([]);
  let submitting = $state(false);
  let errorMsg = $state<string | null>(null);

  const charCount = $derived(body.length);
  const isOverLimit = $derived(charCount > MAX_BODY);
  const isNearLimit = $derived(charCount >= WARN_AT && !isOverLimit);
  const canSubmit = $derived(
    body.trim().length > 0 && !isOverLimit && !submitting,
  );

  function expand() {
    expanded = true;
  }

  function collapse() {
    expanded = false;
    body = "";
    tags = [];
    tagInput = "";
    errorMsg = null;
  }

  function addTag() {
    const tag = tagInput.trim().slice(0, 30);
    if (tag && !tags.includes(tag) && tags.length < MAX_TAGS) {
      tags = [...tags, tag];
    }
    tagInput = "";
  }

  function removeTag(tag: string) {
    tags = tags.filter((t) => t !== tag);
  }

  function handleTagKeydown(e: KeyboardEvent) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag();
    }
  }

  async function submit() {
    if (!canSubmit) return;
    submitting = true;
    errorMsg = null;

    try {
      const res = await fetch("/api/notes", {
        // csrf-ok
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          body: body.trim(),
          tags: tags.length > 0 ? tags : undefined,
        }),
      });

      if (!res.ok) {
        const errData = (await res.json().catch(() => ({}))) as Record<string, unknown>;
        errorMsg =
          (typeof errData.error_description === 'string' ? errData.error_description : null) || "Something went wrong. Try again?";
        return;
      }

      const data = (await res.json()) as { post: MeadowPost };
      oncreated(data.post);
      collapse();
    } catch {
      errorMsg = "Couldn't reach the meadow. Check your connection?";
    } finally {
      submitting = false;
    }
  }
</script>

<div
  class="rounded-xl border border-white/20 bg-white/60 shadow-sm backdrop-blur-md transition-all dark:border-cream-100/15 dark:bg-cream-100/40"
>
  {#if !expanded}
    <!-- Collapsed state -->
    <button
      type="button"
      class="flex w-full items-center gap-3 px-5 py-4 text-left"
      onclick={expand}
    >
      <div
        class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-grove-100 text-sm font-semibold text-grove-700 dark:bg-cream-100/40 dark:text-cream-900"
      >
        {(userName || "?").charAt(0).toUpperCase()}
      </div>
      <span class="text-sm text-foreground-muted">
        Leave a note in the meadow...
      </span>
    </button>
  {:else}
    <!-- Expanded state -->
    <div class="px-5 pt-4 pb-4">
      <div class="flex items-start gap-3">
        <div
          class="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-grove-100 text-sm font-semibold text-grove-700 dark:bg-cream-100/40 dark:text-cream-900"
        >
          {(userName || "?").charAt(0).toUpperCase()}
        </div>
        <div class="min-w-0 flex-1">
          <textarea
            class="w-full resize-none rounded-lg border-0 bg-transparent p-0 text-base leading-relaxed text-foreground placeholder:text-foreground-muted/60 focus:ring-0 focus:outline-none"
            placeholder="What's on your mind?"
            rows="3"
            maxlength={MAX_BODY + 50}
            bind:value={body}
            onkeydown={(e) => {
              if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                submit();
              }
            }}
          ></textarea>

          <!-- Character counter -->
          <div class="mt-1 flex items-center justify-between">
            <span
              class="text-xs {isOverLimit
                ? 'text-red-500 font-medium'
                : isNearLimit
                  ? 'text-amber-500'
                  : 'text-foreground-subtle'}"
            >
              {charCount}/{MAX_BODY}
            </span>
          </div>

          <!-- Tags -->
          {#if tags.length > 0}
            <div class="mt-2 flex flex-wrap gap-1.5">
              {#each tags as tag}
                <button
                  type="button"
                  class="inline-flex items-center gap-1 rounded-full bg-grove-50 px-2.5 py-0.5 text-xs font-medium text-grove-700 transition-colors hover:bg-grove-100 dark:bg-cream-100/30 dark:text-cream-800 dark:hover:bg-cream-100/40"
                  onclick={() => removeTag(tag)}
                  aria-label="Remove tag: {tag}"
                >
                  {tag}
                  <span aria-hidden="true">&times;</span>
                </button>
              {/each}
            </div>
          {/if}

          <!-- Tag input -->
          {#if tags.length < MAX_TAGS}
            <div class="mt-2">
              <input
                type="text"
                class="w-full rounded-md border-0 bg-black/5 px-2.5 py-1 text-xs text-foreground placeholder:text-foreground-subtle focus:ring-1 focus:ring-grove-400 dark:bg-white/5"
                placeholder="Add a tag (press Enter)"
                maxlength="30"
                bind:value={tagInput}
                onkeydown={handleTagKeydown}
              />
            </div>
          {/if}

          <!-- Error -->
          {#if errorMsg}
            <p class="mt-2 text-xs text-red-500">{errorMsg}</p>
          {/if}

          <!-- Actions -->
          <div class="mt-3 flex items-center justify-between">
            <button
              type="button"
              class="rounded-md px-3 py-1.5 text-xs text-foreground-muted transition-colors hover:text-foreground"
              onclick={collapse}
            >
              Cancel
            </button>
            <button
              type="button"
              class="rounded-lg bg-grove-600 px-4 py-1.5 text-sm font-medium text-white shadow-sm transition-colors hover:bg-grove-700 disabled:opacity-50 disabled:cursor-not-allowed dark:bg-grove-500 dark:hover:bg-grove-600"
              disabled={!canSubmit}
              onclick={submit}
            >
              {#if submitting}
                Leaving note...
              {:else}
                Leave note
              {/if}
            </button>
          </div>
        </div>
      </div>
    </div>
  {/if}
</div>

<style>
  @media (prefers-reduced-motion: reduce) {
    div {
      transition-duration: 0s !important;
    }
  }
</style>
