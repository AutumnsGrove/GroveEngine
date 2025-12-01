<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  interface Props extends HTMLAttributes<HTMLDivElement> {
    /** Whether the modal is open */
    open?: boolean;
    /** Callback when modal should close */
    onclose?: () => void;
    /** Modal title */
    title?: string;
    /** Modal description for accessibility */
    description?: string;
    /** Size of the modal */
    size?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
    /** Close on backdrop click */
    closeOnBackdrop?: boolean;
    /** Close on Escape key */
    closeOnEscape?: boolean;
    /** Modal body content */
    children: Snippet;
    /** Optional footer content */
    footer?: Snippet;
  }

  let {
    open = false,
    onclose,
    title,
    description,
    size = 'md',
    closeOnBackdrop = true,
    closeOnEscape = true,
    children,
    footer,
    class: className = '',
    ...restProps
  }: Props = $props();

  let dialogElement: HTMLDivElement;
  const modalId = `grove-modal-${Math.random().toString(36).slice(2, 9)}`;

  const sizeClasses = {
    sm: 'max-w-sm',
    md: 'max-w-md',
    lg: 'max-w-lg',
    xl: 'max-w-xl',
    full: 'max-w-[calc(100vw-2rem)]',
  };

  function handleBackdropClick(event: MouseEvent) {
    if (closeOnBackdrop && event.target === event.currentTarget) {
      onclose?.();
    }
  }

  function handleKeydown(event: KeyboardEvent) {
    if (closeOnEscape && event.key === 'Escape') {
      onclose?.();
    }
  }

  // Focus trap and body scroll lock
  $effect(() => {
    if (open) {
      document.body.style.overflow = 'hidden';
      // Focus the dialog
      dialogElement?.focus();
    } else {
      document.body.style.overflow = '';
    }

    return () => {
      document.body.style.overflow = '';
    };
  });
</script>

<svelte:window onkeydown={handleKeydown} />

{#if open}
  <!-- Backdrop -->
  <div
    class="fixed inset-0 z-[400] bg-bark/40 backdrop-blur-sm animate-fade-in"
    aria-hidden="true"
  ></div>

  <!-- Modal container -->
  <!-- svelte-ignore a11y_no_noninteractive_element_interactions -->
  <div
    role="dialog"
    aria-modal="true"
    aria-labelledby={title ? `${modalId}-title` : undefined}
    aria-describedby={description ? `${modalId}-description` : undefined}
    class="fixed inset-0 z-[500] flex items-center justify-center p-4"
    onclick={handleBackdropClick}
    onkeydown={handleKeydown}
    bind:this={dialogElement}
    tabindex="-1"
  >
    <!-- Modal content -->
    <div
      class="
        w-full bg-cream rounded-grove-xl shadow-grove-xl
        max-h-[calc(100vh-2rem)] overflow-hidden
        animate-grow
        {sizeClasses[size]}
        {className}
      "
      onclick={(e) => e.stopPropagation()}
      {...restProps}
    >
      <!-- Header -->
      {#if title || onclose}
        <div class="flex items-center justify-between px-5 py-4 border-b border-cream-200">
          <div>
            {#if title}
              <h2
                id="{modalId}-title"
                class="font-serif text-heading font-normal text-bark"
              >
                {title}
              </h2>
            {/if}
            {#if description}
              <p
                id="{modalId}-description"
                class="mt-1 text-sm text-bark-600"
              >
                {description}
              </p>
            {/if}
          </div>
          {#if onclose}
            <button
              type="button"
              onclick={onclose}
              class="
                p-2 -mr-2 rounded-grove text-bark-500
                hover:bg-cream-200 hover:text-bark
                focus:outline-none focus:ring-2 focus:ring-grove-500 focus:ring-offset-2
                transition-colors duration-150
              "
              aria-label="Close modal"
            >
              <svg class="w-5 h-5" viewBox="0 0 20 20" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
                <path d="M5 5l10 10M15 5L5 15" />
              </svg>
            </button>
          {/if}
        </div>
      {/if}

      <!-- Body -->
      <div class="px-5 py-5 overflow-y-auto max-h-[60vh]">
        {@render children()}
      </div>

      <!-- Footer -->
      {#if footer}
        <div class="flex justify-end gap-3 px-5 py-4 border-t border-cream-200 bg-cream-100 rounded-b-grove-xl">
          {@render footer()}
        </div>
      {/if}
    </div>
  </div>
{/if}
