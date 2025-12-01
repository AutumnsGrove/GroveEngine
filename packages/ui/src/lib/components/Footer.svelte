<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  interface Props extends HTMLAttributes<HTMLElement> {
    /** Variant style */
    variant?: 'default' | 'minimal' | 'centered';
    /** Logo/brand content */
    logo?: Snippet;
    /** Description text */
    description?: string;
    /** Copyright text */
    copyright?: string;
    /** Navigation columns (for default variant) */
    columns?: Snippet;
    /** Social links */
    social?: Snippet;
    /** Bottom links (privacy, terms, etc) */
    bottomLinks?: Snippet;
  }

  let {
    variant = 'default',
    logo,
    description,
    copyright,
    columns,
    social,
    bottomLinks,
    class: className = '',
    ...restProps
  }: Props = $props();

  const currentYear = new Date().getFullYear();
  const defaultCopyright = `${currentYear} Grove. All rights reserved.`;
</script>

<footer
  class="
    w-full bg-cream-100 border-t border-cream-200
    {className}
  "
  {...restProps}
>
  {#if variant === 'default'}
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div class="grid grid-cols-1 md:grid-cols-4 gap-8">
        <!-- Brand column -->
        <div class="md:col-span-1">
          {#if logo}
            <div class="mb-4">
              {@render logo()}
            </div>
          {/if}
          {#if description}
            <p class="text-sm text-bark-600 leading-relaxed">
              {description}
            </p>
          {/if}
          {#if social}
            <div class="mt-6 flex gap-4">
              {@render social()}
            </div>
          {/if}
        </div>

        <!-- Navigation columns -->
        {#if columns}
          <div class="md:col-span-3 grid grid-cols-2 sm:grid-cols-3 gap-8">
            {@render columns()}
          </div>
        {/if}
      </div>

      <!-- Bottom bar -->
      <div class="mt-12 pt-8 border-t border-cream-300">
        <div class="flex flex-col sm:flex-row justify-between items-center gap-4">
          <p class="text-sm text-bark-500">
            {copyright || defaultCopyright}
          </p>
          {#if bottomLinks}
            <nav class="flex flex-wrap gap-6 text-sm text-bark-500" aria-label="Footer links">
              {@render bottomLinks()}
            </nav>
          {/if}
        </div>
      </div>
    </div>

  {:else if variant === 'minimal'}
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <div class="flex flex-col sm:flex-row justify-between items-center gap-4">
        {#if logo}
          {@render logo()}
        {/if}
        <p class="text-sm text-bark-500">
          {copyright || defaultCopyright}
        </p>
        {#if social}
          <div class="flex gap-4">
            {@render social()}
          </div>
        {/if}
      </div>
    </div>

  {:else if variant === 'centered'}
    <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12 text-center">
      {#if logo}
        <div class="mb-4 flex justify-center">
          {@render logo()}
        </div>
      {/if}
      {#if description}
        <p class="text-sm text-bark-600 max-w-md mx-auto">
          {description}
        </p>
      {/if}
      {#if social}
        <div class="mt-6 flex justify-center gap-4">
          {@render social()}
        </div>
      {/if}
      {#if bottomLinks}
        <nav class="mt-6 flex flex-wrap justify-center gap-6 text-sm text-bark-500" aria-label="Footer links">
          {@render bottomLinks()}
        </nav>
      {/if}
      <p class="mt-8 text-sm text-bark-500">
        {copyright || defaultCopyright}
      </p>
    </div>
  {/if}
</footer>
