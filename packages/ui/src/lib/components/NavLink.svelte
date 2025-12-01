<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAnchorAttributes } from 'svelte/elements';

  interface Props extends HTMLAnchorAttributes {
    /** Whether the link is currently active */
    active?: boolean;
    /** Visual variant */
    variant?: 'default' | 'subtle' | 'pill';
    /** Content */
    children: Snippet;
    /** Optional icon */
    icon?: Snippet;
  }

  let {
    active = false,
    variant = 'default',
    children,
    icon,
    class: className = '',
    ...restProps
  }: Props = $props();

  const variantClasses = {
    default: active
      ? 'text-grove-700 font-medium'
      : 'text-bark-600 hover:text-bark',
    subtle: active
      ? 'text-grove-700'
      : 'text-bark-500 hover:text-bark-700',
    pill: active
      ? 'bg-grove-100 text-grove-700 font-medium'
      : 'text-bark-600 hover:bg-cream-200 hover:text-bark',
  };

  const baseClasses = {
    default: 'px-3 py-2 text-sm transition-colors duration-150',
    subtle: 'py-1 text-sm transition-colors duration-150',
    pill: 'px-3 py-1.5 text-sm rounded-grove transition-all duration-150',
  };
</script>

<a
  class="
    inline-flex items-center gap-2
    {baseClasses[variant]}
    {variantClasses[variant]}
    {className}
  "
  aria-current={active ? 'page' : undefined}
  {...restProps}
>
  {#if icon}
    <span class="flex-shrink-0" aria-hidden="true">
      {@render icon()}
    </span>
  {/if}
  {@render children()}
</a>
