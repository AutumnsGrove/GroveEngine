<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  interface Props extends HTMLAttributes<HTMLDivElement> {
    /** Tooltip content text */
    content: string;
    /** Position of the tooltip */
    position?: 'top' | 'bottom' | 'left' | 'right';
    /** Delay before showing tooltip (ms) */
    delay?: number;
    /** Element to wrap */
    children: Snippet;
  }

  let {
    content,
    position = 'top',
    delay = 200,
    children,
    class: className = '',
    ...restProps
  }: Props = $props();

  let visible = $state(false);
  let timeoutId: ReturnType<typeof setTimeout>;

  const positionClasses = {
    top: 'bottom-full left-1/2 -translate-x-1/2 mb-2',
    bottom: 'top-full left-1/2 -translate-x-1/2 mt-2',
    left: 'right-full top-1/2 -translate-y-1/2 mr-2',
    right: 'left-full top-1/2 -translate-y-1/2 ml-2',
  };

  const arrowClasses = {
    top: 'top-full left-1/2 -translate-x-1/2 border-t-bark border-x-transparent border-b-transparent',
    bottom: 'bottom-full left-1/2 -translate-x-1/2 border-b-bark border-x-transparent border-t-transparent',
    left: 'left-full top-1/2 -translate-y-1/2 border-l-bark border-y-transparent border-r-transparent',
    right: 'right-full top-1/2 -translate-y-1/2 border-r-bark border-y-transparent border-l-transparent',
  };

  function show() {
    timeoutId = setTimeout(() => {
      visible = true;
    }, delay);
  }

  function hide() {
    clearTimeout(timeoutId);
    visible = false;
  }
</script>

<div
  class="relative inline-block {className}"
  onmouseenter={show}
  onmouseleave={hide}
  onfocusin={show}
  onfocusout={hide}
  {...restProps}
>
  {@render children()}

  {#if visible && content}
    <div
      role="tooltip"
      class="
        absolute z-[700] pointer-events-none
        px-2.5 py-1.5
        text-xs font-sans text-cream bg-bark
        rounded-md shadow-grove-md
        whitespace-nowrap
        animate-fade-in
        {positionClasses[position]}
      "
    >
      {content}
      <!-- Arrow -->
      <span
        class="absolute border-4 {arrowClasses[position]}"
        aria-hidden="true"
      ></span>
    </div>
  {/if}
</div>
