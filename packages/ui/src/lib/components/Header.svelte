<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  interface Props extends HTMLAttributes<HTMLElement> {
    /** Variant style */
    variant?: 'default' | 'transparent' | 'bordered';
    /** Sticky header */
    sticky?: boolean;
    /** Logo/brand content */
    logo?: Snippet;
    /** Navigation links */
    nav?: Snippet;
    /** Right side actions (buttons, avatar, etc) */
    actions?: Snippet;
    /** Mobile menu content */
    mobileMenu?: Snippet;
  }

  let {
    variant = 'default',
    sticky = false,
    logo,
    nav,
    actions,
    mobileMenu,
    class: className = '',
    ...restProps
  }: Props = $props();

  let mobileMenuOpen = $state(false);

  const variantClasses = {
    default: 'bg-cream shadow-grove-sm',
    transparent: 'bg-transparent',
    bordered: 'bg-cream border-b border-cream-200',
  };

  function toggleMobileMenu() {
    mobileMenuOpen = !mobileMenuOpen;
  }
</script>

<header
  class="
    w-full z-[100]
    {variantClasses[variant]}
    {sticky ? 'sticky top-0' : 'relative'}
    {className}
  "
  {...restProps}
>
  <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
    <div class="flex items-center justify-between h-16">
      <!-- Logo -->
      {#if logo}
        <div class="flex-shrink-0">
          {@render logo()}
        </div>
      {/if}

      <!-- Desktop navigation -->
      {#if nav}
        <nav class="hidden md:flex items-center gap-1" aria-label="Main navigation">
          {@render nav()}
        </nav>
      {/if}

      <!-- Desktop actions -->
      <div class="hidden md:flex items-center gap-3">
        {#if actions}
          {@render actions()}
        {/if}
      </div>

      <!-- Mobile menu button -->
      {#if mobileMenu}
        <button
          type="button"
          class="
            md:hidden p-2 rounded-grove
            text-bark hover:bg-cream-200
            focus:outline-none focus:ring-2 focus:ring-grove-500
            transition-colors duration-150
          "
          aria-expanded={mobileMenuOpen}
          aria-controls="mobile-menu"
          onclick={toggleMobileMenu}
        >
          <span class="sr-only">{mobileMenuOpen ? 'Close menu' : 'Open menu'}</span>
          {#if mobileMenuOpen}
            <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M6 6l12 12M18 6L6 18" />
            </svg>
          {:else}
            <svg class="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round">
              <path d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          {/if}
        </button>
      {/if}
    </div>
  </div>

  <!-- Mobile menu -->
  {#if mobileMenu && mobileMenuOpen}
    <div
      id="mobile-menu"
      class="md:hidden border-t border-cream-200 bg-cream animate-slide-in-down"
    >
      <div class="px-4 py-4 space-y-3">
        {@render mobileMenu()}
      </div>
    </div>
  {/if}
</header>
