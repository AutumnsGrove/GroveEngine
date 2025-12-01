<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLButtonAttributes } from 'svelte/elements';

  interface Props extends HTMLButtonAttributes {
    /** Visual style variant */
    variant?: 'primary' | 'secondary' | 'ghost' | 'outline';
    /** Size of the button */
    size?: 'sm' | 'md' | 'lg';
    /** Show loading spinner */
    loading?: boolean;
    /** Full width button */
    fullWidth?: boolean;
    /** Icon-only button (square aspect ratio) */
    iconOnly?: boolean;
    /** Button content */
    children: Snippet;
    /** Optional icon to display before content */
    iconLeft?: Snippet;
    /** Optional icon to display after content */
    iconRight?: Snippet;
  }

  let {
    variant = 'primary',
    size = 'md',
    loading = false,
    fullWidth = false,
    iconOnly = false,
    disabled = false,
    type = 'button',
    children,
    iconLeft,
    iconRight,
    class: className = '',
    ...restProps
  }: Props = $props();

  const sizeClasses = {
    sm: iconOnly ? 'h-8 w-8' : 'h-8 px-3 text-sm',
    md: iconOnly ? 'h-10 w-10' : 'h-10 px-4 text-sm',
    lg: iconOnly ? 'h-12 w-12' : 'h-12 px-6 text-base',
  };

  const variantClasses = {
    primary: 'bg-grove-600 text-white hover:bg-grove-700 active:bg-grove-800',
    secondary: 'bg-cream-300 text-bark border border-cream-400 hover:bg-cream-400 hover:border-cream-500 active:bg-cream-500',
    ghost: 'bg-transparent text-bark hover:bg-cream-300 active:bg-cream-400',
    outline: 'bg-transparent text-grove-600 border border-grove-600 hover:bg-grove-50 active:bg-grove-100',
  };
</script>

<button
  {type}
  disabled={disabled || loading}
  class="
    inline-flex items-center justify-center gap-2
    font-sans font-medium whitespace-nowrap
    rounded-grove
    transition-all duration-200 ease-grove
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-grove-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream
    disabled:opacity-50 disabled:cursor-not-allowed disabled:pointer-events-none
    {sizeClasses[size]}
    {variantClasses[variant]}
    {fullWidth ? 'w-full' : ''}
    {className}
  "
  aria-busy={loading}
  {...restProps}
>
  {#if loading}
    <svg
      class="animate-spin h-4 w-4"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden="true"
    >
      <circle
        class="opacity-25"
        cx="12"
        cy="12"
        r="10"
        stroke="currentColor"
        stroke-width="3"
      />
      <path
        class="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
    </svg>
  {:else if iconLeft}
    <span class="flex-shrink-0" aria-hidden="true">
      {@render iconLeft()}
    </span>
  {/if}

  {#if !iconOnly}
    <span class={loading ? 'opacity-0' : ''}>
      {@render children()}
    </span>
  {:else}
    {@render children()}
  {/if}

  {#if iconRight && !loading}
    <span class="flex-shrink-0" aria-hidden="true">
      {@render iconRight()}
    </span>
  {/if}
</button>
