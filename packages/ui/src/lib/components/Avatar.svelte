<script lang="ts">
  import type { Snippet } from 'svelte';
  import type { HTMLAttributes } from 'svelte/elements';

  interface Props extends HTMLAttributes<HTMLSpanElement> {
    /** Image source URL */
    src?: string;
    /** Alt text for the image */
    alt?: string;
    /** Size of the avatar */
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | '2xl';
    /** Initials to show as fallback */
    initials?: string;
    /** Name to derive initials from */
    name?: string;
    /** Show online/offline status indicator */
    status?: 'online' | 'offline' | 'away' | 'busy';
    /** Custom fallback content */
    fallback?: Snippet;
  }

  let {
    src,
    alt = '',
    size = 'md',
    initials,
    name,
    status,
    fallback,
    class: className = '',
    ...restProps
  }: Props = $props();

  let imageError = $state(false);

  // Derive initials from name if not provided
  const derivedInitials = $derived(() => {
    if (initials) return initials.slice(0, 2).toUpperCase();
    if (name) {
      const parts = name.trim().split(/\s+/);
      if (parts.length >= 2) {
        return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
      }
      return parts[0].slice(0, 2).toUpperCase();
    }
    return '';
  });

  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-lg',
    '2xl': 'w-20 h-20 text-xl',
  };

  const statusSizeClasses = {
    xs: 'w-1.5 h-1.5 border',
    sm: 'w-2 h-2 border',
    md: 'w-2.5 h-2.5 border-2',
    lg: 'w-3 h-3 border-2',
    xl: 'w-3.5 h-3.5 border-2',
    '2xl': 'w-4 h-4 border-2',
  };

  const statusColors = {
    online: 'bg-grove-500',
    offline: 'bg-bark-400',
    away: 'bg-amber-500',
    busy: 'bg-red-500',
  };

  function handleImageError() {
    imageError = true;
  }
</script>

<span
  class="
    relative inline-flex items-center justify-center
    rounded-full overflow-hidden
    bg-grove-100 text-grove-700 font-medium
    {sizeClasses[size]}
    {className}
  "
  {...restProps}
>
  {#if src && !imageError}
    <img
      {src}
      alt={alt || name || 'Avatar'}
      class="w-full h-full object-cover"
      onerror={handleImageError}
    />
  {:else if fallback}
    {@render fallback()}
  {:else if derivedInitials()}
    <span aria-hidden="true">{derivedInitials()}</span>
    <span class="sr-only">{name || alt || 'User avatar'}</span>
  {:else}
    <!-- Default person icon -->
    <svg
      class="w-1/2 h-1/2"
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-hidden="true"
    >
      <path d="M12 12c2.21 0 4-1.79 4-4s-1.79-4-4-4-4 1.79-4 4 1.79 4 4 4zm0 2c-2.67 0-8 1.34-8 4v2h16v-2c0-2.66-5.33-4-8-4z"/>
    </svg>
    <span class="sr-only">{name || alt || 'User avatar'}</span>
  {/if}

  {#if status}
    <span
      class="
        absolute bottom-0 right-0 block rounded-full border-cream
        {statusSizeClasses[size]}
        {statusColors[status]}
      "
      aria-label="{status} status"
    ></span>
  {/if}
</span>
