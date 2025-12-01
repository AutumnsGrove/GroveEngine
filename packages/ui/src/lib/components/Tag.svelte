<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  interface Props extends HTMLAttributes<HTMLSpanElement> {
    /** Visual style variant */
    variant?: 'default' | 'primary' | 'outline';
    /** Size of the tag */
    size?: 'sm' | 'md' | 'lg';
    /** Show remove button */
    removable?: boolean;
    /** Callback when remove button is clicked */
    onremove?: () => void;
    /** Tag content */
    children: Snippet;
    /** Optional icon */
    icon?: Snippet;
  }

  let {
    variant = 'default',
    size = 'md',
    removable = false,
    onremove,
    children,
    icon,
    class: className = '',
    ...restProps
  }: Props = $props();

  const variantClasses = {
    default: 'bg-cream-200 text-bark border border-cream-300 hover:bg-cream-300',
    primary: 'bg-grove-100 text-grove-800 border border-grove-200 hover:bg-grove-200',
    outline: 'bg-transparent text-bark border border-cream-400 hover:bg-cream-100',
  };

  const sizeClasses = {
    sm: 'h-6 px-2 text-xs gap-1',
    md: 'h-7 px-2.5 text-sm gap-1.5',
    lg: 'h-8 px-3 text-sm gap-2',
  };

  function handleRemove(event: MouseEvent) {
    event.stopPropagation();
    onremove?.();
  }
</script>

<span
  class="
    inline-flex items-center font-sans font-medium rounded-grove
    transition-colors duration-150 ease-grove
    {variantClasses[variant]}
    {sizeClasses[size]}
    {className}
  "
  {...restProps}
>
  {#if icon}
    <span class="flex-shrink-0 -ml-0.5" aria-hidden="true">
      {@render icon()}
    </span>
  {/if}

  <span class="truncate">
    {@render children()}
  </span>

  {#if removable}
    <button
      type="button"
      onclick={handleRemove}
      class="
        flex-shrink-0 -mr-1 p-0.5 rounded-sm
        text-current opacity-60
        hover:opacity-100 hover:bg-bark/10
        focus:outline-none focus:ring-1 focus:ring-grove-500
        transition-all duration-150
      "
      aria-label="Remove tag"
    >
      <svg class="w-3 h-3" viewBox="0 0 12 12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
        <path d="M3 3l6 6M9 3L3 9" />
      </svg>
    </button>
  {/if}
</span>
