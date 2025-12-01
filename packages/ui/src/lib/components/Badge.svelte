<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  interface Props extends HTMLAttributes<HTMLSpanElement> {
    /** Visual style variant */
    variant?: 'default' | 'primary' | 'success' | 'warning' | 'error' | 'info';
    /** Size of the badge */
    size?: 'sm' | 'md' | 'lg';
    /** Rounded pill style */
    pill?: boolean;
    /** Show dot indicator */
    dot?: boolean;
    /** Badge content */
    children: Snippet;
    /** Optional icon */
    icon?: Snippet;
  }

  let {
    variant = 'default',
    size = 'md',
    pill = true,
    dot = false,
    children,
    icon,
    class: className = '',
    ...restProps
  }: Props = $props();

  const variantClasses = {
    default: 'bg-cream-300 text-bark',
    primary: 'bg-grove-100 text-grove-800',
    success: 'bg-green-100 text-green-800',
    warning: 'bg-amber-100 text-amber-800',
    error: 'bg-red-100 text-red-800',
    info: 'bg-sky-100 text-sky-800',
  };

  const dotColors = {
    default: 'bg-bark-400',
    primary: 'bg-grove-500',
    success: 'bg-green-500',
    warning: 'bg-amber-500',
    error: 'bg-red-500',
    info: 'bg-sky-500',
  };

  const sizeClasses = {
    sm: 'px-1.5 py-0.5 text-xs',
    md: 'px-2 py-0.5 text-xs',
    lg: 'px-2.5 py-1 text-sm',
  };

  const dotSizes = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2 h-2',
  };
</script>

<span
  class="
    inline-flex items-center gap-1 font-sans font-medium leading-normal
    {variantClasses[variant]}
    {sizeClasses[size]}
    {pill ? 'rounded-full' : 'rounded-md'}
    {className}
  "
  {...restProps}
>
  {#if dot}
    <span class="flex-shrink-0 {dotSizes[size]} {dotColors[variant]} rounded-full" aria-hidden="true"></span>
  {:else if icon}
    <span class="flex-shrink-0" aria-hidden="true">
      {@render icon()}
    </span>
  {/if}
  {@render children()}
</span>
