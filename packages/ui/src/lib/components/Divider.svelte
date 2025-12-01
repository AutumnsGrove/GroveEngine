<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  interface Props extends HTMLAttributes<HTMLDivElement> {
    /** Orientation of the divider */
    orientation?: 'horizontal' | 'vertical';
    /** Show leaf motif in the center */
    leaf?: boolean;
    /** Custom text or content in the center */
    children?: Snippet;
    /** Spacing around the divider */
    spacing?: 'none' | 'sm' | 'md' | 'lg';
  }

  let {
    orientation = 'horizontal',
    leaf = false,
    children,
    spacing = 'md',
    class: className = '',
    ...restProps
  }: Props = $props();

  const spacingClasses = {
    none: '',
    sm: orientation === 'horizontal' ? 'my-2' : 'mx-2',
    md: orientation === 'horizontal' ? 'my-4' : 'mx-4',
    lg: orientation === 'horizontal' ? 'my-8' : 'mx-8',
  };
</script>

{#if orientation === 'horizontal'}
  <div
    role="separator"
    aria-orientation="horizontal"
    class="
      w-full flex items-center
      {spacingClasses[spacing]}
      {className}
    "
    {...restProps}
  >
    {#if leaf || children}
      <div class="flex-1 h-px bg-cream-300"></div>
      <div class="px-4 flex items-center text-cream-400">
        {#if children}
          {@render children()}
        {:else if leaf}
          <!-- Leaf motif SVG -->
          <svg
            class="w-5 h-5 animate-leaf-sway"
            viewBox="0 0 24 24"
            fill="currentColor"
            aria-hidden="true"
          >
            <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z"/>
          </svg>
        {/if}
      </div>
      <div class="flex-1 h-px bg-cream-300"></div>
    {:else}
      <div class="flex-1 h-px bg-cream-300"></div>
    {/if}
  </div>
{:else}
  <div
    role="separator"
    aria-orientation="vertical"
    class="
      h-full w-px bg-cream-300
      {spacingClasses[spacing]}
      {className}
    "
    {...restProps}
  ></div>
{/if}
