<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';

  interface Props extends HTMLAttributes<HTMLDivElement> {
    /** Progress value (0-100) */
    value?: number;
    /** Maximum value */
    max?: number;
    /** Show indeterminate animation */
    indeterminate?: boolean;
    /** Size of the progress bar */
    size?: 'sm' | 'md' | 'lg';
    /** Show value label */
    showLabel?: boolean;
    /** Custom label format */
    labelFormat?: (value: number, max: number) => string;
    /** Accessible label */
    label?: string;
  }

  let {
    value = 0,
    max = 100,
    indeterminate = false,
    size = 'md',
    showLabel = false,
    labelFormat,
    label = 'Progress',
    class: className = '',
    ...restProps
  }: Props = $props();

  const percentage = $derived(Math.min(100, Math.max(0, (value / max) * 100)));

  const formattedLabel = $derived(() => {
    if (labelFormat) {
      return labelFormat(value, max);
    }
    return `${Math.round(percentage)}%`;
  });

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3',
  };
</script>

<div class="w-full {className}" {...restProps}>
  {#if showLabel}
    <div class="flex justify-between items-center mb-1.5">
      <span class="text-sm text-bark-700">{label}</span>
      <span class="text-sm font-medium text-bark">{formattedLabel()}</span>
    </div>
  {/if}

  <div
    role="progressbar"
    aria-valuenow={indeterminate ? undefined : value}
    aria-valuemin={0}
    aria-valuemax={max}
    aria-label={label}
    class="
      w-full bg-cream-300 rounded-full overflow-hidden
      {sizeClasses[size]}
    "
  >
    {#if indeterminate}
      <!-- Indeterminate growing animation -->
      <div
        class="h-full bg-gradient-to-r from-grove-400 via-grove-500 to-grove-600 rounded-full"
        style="
          width: 30%;
          animation: grove-progress-slide 1.5s ease-in-out infinite;
        "
      ></div>
    {:else}
      <!-- Determinate progress with growth transition -->
      <div
        class="
          h-full rounded-full
          bg-gradient-to-r from-grove-400 via-grove-500 to-grove-600
          transition-all duration-500 ease-out
        "
        style="width: {percentage}%;"
      ></div>
    {/if}
  </div>
</div>

<style>
  @keyframes grove-progress-slide {
    0% {
      transform: translateX(-100%);
    }
    100% {
      transform: translateX(400%);
    }
  }
</style>
