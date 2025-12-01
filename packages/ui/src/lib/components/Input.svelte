<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLInputAttributes } from 'svelte/elements';

  interface Props extends HTMLInputAttributes {
    /** Visual size variant */
    size?: 'sm' | 'md' | 'lg';
    /** Error state */
    error?: boolean;
    /** Error message to display */
    errorMessage?: string;
    /** Help text to display below input */
    helpText?: string;
    /** Label text */
    label?: string;
    /** Mark field as required */
    required?: boolean;
    /** Icon to show at the start of input */
    iconLeft?: Snippet;
    /** Icon to show at the end of input */
    iconRight?: Snippet;
  }

  let {
    size = 'md',
    error = false,
    errorMessage = '',
    helpText = '',
    label = '',
    required = false,
    disabled = false,
    iconLeft,
    iconRight,
    id,
    class: className = '',
    ...restProps
  }: Props = $props();

  // Generate unique ID if not provided
  const inputId = id || `grove-input-${Math.random().toString(36).slice(2, 9)}`;

  const sizeClasses = {
    sm: 'h-8 text-sm',
    md: 'h-10 text-base',
    lg: 'h-12 text-lg',
  };

  const paddingClasses = {
    sm: iconLeft ? 'pl-8' : 'pl-3',
    md: iconLeft ? 'pl-10' : 'pl-3',
    lg: iconLeft ? 'pl-12' : 'pl-4',
  };
</script>

<div class="w-full">
  {#if label}
    <label
      for={inputId}
      class="block mb-1.5 text-sm font-medium text-bark {required ? 'after:content-[\'_*\'] after:text-red-600' : ''}"
    >
      {label}
    </label>
  {/if}

  <div class="relative">
    {#if iconLeft}
      <div class="absolute left-3 top-1/2 -translate-y-1/2 text-bark-500 pointer-events-none">
        {@render iconLeft()}
      </div>
    {/if}

    <input
      id={inputId}
      {disabled}
      {required}
      aria-invalid={error}
      aria-describedby={errorMessage ? `${inputId}-error` : helpText ? `${inputId}-help` : undefined}
      class="
        w-full rounded-grove border bg-cream
        font-sans text-bark placeholder:text-bark-500
        transition-all duration-200 ease-grove
        focus:outline-none focus:border-grove-500 focus:ring-[3px] focus:ring-grove-500/15
        hover:border-cream-400
        disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-cream-200
        {sizeClasses[size]}
        {paddingClasses[size]}
        {iconRight ? 'pr-10' : 'pr-3'}
        {error ? 'border-red-500 focus:border-red-500 focus:ring-red-500/15' : 'border-cream-200'}
        {className}
      "
      {...restProps}
    />

    {#if iconRight}
      <div class="absolute right-3 top-1/2 -translate-y-1/2 text-bark-500 pointer-events-none">
        {@render iconRight()}
      </div>
    {/if}
  </div>

  {#if errorMessage && error}
    <p id="{inputId}-error" class="mt-1.5 text-xs text-red-600" role="alert">
      {errorMessage}
    </p>
  {:else if helpText}
    <p id="{inputId}-help" class="mt-1.5 text-xs text-bark-600">
      {helpText}
    </p>
  {/if}
</div>
