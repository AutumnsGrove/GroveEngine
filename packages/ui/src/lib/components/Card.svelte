<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  interface Props extends HTMLAttributes<HTMLElement> {
    /** Visual style variant */
    variant?: 'default' | 'bordered' | 'elevated';
    /** Enable hover effects */
    hoverable?: boolean;
    /** Padding size */
    padding?: 'none' | 'sm' | 'md' | 'lg';
    /** Content slot */
    children: Snippet;
    /** Optional header slot */
    header?: Snippet;
    /** Optional footer slot */
    footer?: Snippet;
    /** Render as a different element (e.g., 'article', 'section') */
    as?: 'div' | 'article' | 'section' | 'aside';
  }

  let {
    variant = 'default',
    hoverable = false,
    padding = 'md',
    children,
    header,
    footer,
    as = 'div',
    class: className = '',
    ...restProps
  }: Props = $props();

  const variantClasses = {
    default: 'bg-cream border border-cream-200 shadow-grove-sm',
    bordered: 'bg-cream border-2 border-cream-300',
    elevated: 'bg-cream shadow-grove-md',
  };

  const paddingClasses = {
    none: '',
    sm: 'p-3',
    md: 'p-5',
    lg: 'p-6',
  };
</script>

<svelte:element
  this={as}
  class="
    rounded-grove-lg overflow-hidden
    {variantClasses[variant]}
    {hoverable ? 'transition-all duration-200 ease-grove hover:shadow-grove-md hover:-translate-y-0.5 cursor-pointer' : ''}
    {className}
  "
  {...restProps}
>
  {#if header}
    <div class="px-5 py-4 border-b border-cream-200">
      {@render header()}
    </div>
  {/if}

  <div class={paddingClasses[padding]}>
    {@render children()}
  </div>

  {#if footer}
    <div class="px-5 py-4 border-t border-cream-200 bg-cream-100 rounded-b-grove-lg">
      {@render footer()}
    </div>
  {/if}
</svelte:element>
