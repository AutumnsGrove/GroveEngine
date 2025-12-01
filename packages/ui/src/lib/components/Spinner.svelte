<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';

  interface Props extends HTMLAttributes<HTMLDivElement> {
    /** Size of the spinner */
    size?: 'sm' | 'md' | 'lg' | 'xl';
    /** Animation style */
    variant?: 'circle' | 'leaf' | 'dots';
    /** Accessible label */
    label?: string;
  }

  let {
    size = 'md',
    variant = 'circle',
    label = 'Loading...',
    class: className = '',
    ...restProps
  }: Props = $props();

  const sizeClasses = {
    sm: 'w-4 h-4',
    md: 'w-6 h-6',
    lg: 'w-8 h-8',
    xl: 'w-12 h-12',
  };

  const dotSizeClasses = {
    sm: 'w-1.5 h-1.5',
    md: 'w-2 h-2',
    lg: 'w-2.5 h-2.5',
    xl: 'w-3 h-3',
  };
</script>

<div
  role="status"
  aria-label={label}
  class="inline-flex items-center justify-center {className}"
  {...restProps}
>
  {#if variant === 'circle'}
    <!-- Classic spinner with organic timing -->
    <svg
      class="{sizeClasses[size]} animate-spin"
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
  {:else if variant === 'leaf'}
    <!-- Leaf spinner - organic rotation -->
    <svg
      class="{sizeClasses[size]} text-grove-600"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
      style="animation: grove-spin-organic 1.5s ease-in-out infinite;"
    >
      <path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z"/>
    </svg>
  {:else if variant === 'dots'}
    <!-- Growing dots - organic pulsing -->
    <div class="flex items-center gap-1">
      <span
        class="{dotSizeClasses[size]} rounded-full bg-grove-500"
        style="animation: grove-pulse-soft 1s ease-in-out infinite;"
      ></span>
      <span
        class="{dotSizeClasses[size]} rounded-full bg-grove-500"
        style="animation: grove-pulse-soft 1s ease-in-out 0.2s infinite;"
      ></span>
      <span
        class="{dotSizeClasses[size]} rounded-full bg-grove-500"
        style="animation: grove-pulse-soft 1s ease-in-out 0.4s infinite;"
      ></span>
    </div>
  {/if}

  <span class="sr-only">{label}</span>
</div>

<style>
  @keyframes grove-spin-organic {
    0% { transform: rotate(0deg); }
    25% { transform: rotate(100deg); }
    50% { transform: rotate(180deg); }
    75% { transform: rotate(260deg); }
    100% { transform: rotate(360deg); }
  }

  @keyframes grove-pulse-soft {
    0%, 100% {
      opacity: 1;
      transform: scale(1);
    }
    50% {
      opacity: 0.5;
      transform: scale(0.75);
    }
  }
</style>
