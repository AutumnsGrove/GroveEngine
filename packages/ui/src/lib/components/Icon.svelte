<script lang="ts">
  import type { HTMLAttributes } from 'svelte/elements';

  interface Props extends HTMLAttributes<SVGSVGElement> {
    /** Icon name */
    name: 'leaf' | 'seedling' | 'tree' | 'sun' | 'moon' | 'search' | 'close' | 'menu' | 'check' | 'chevron-down' | 'chevron-up' | 'chevron-left' | 'chevron-right' | 'arrow-right' | 'arrow-left' | 'edit' | 'trash' | 'plus' | 'minus' | 'heart' | 'bookmark' | 'share' | 'external-link' | 'mail' | 'user';
    /** Size of the icon */
    size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
    /** Stroke width for outline icons */
    strokeWidth?: number;
  }

  let {
    name,
    size = 'md',
    strokeWidth = 2,
    class: className = '',
    ...restProps
  }: Props = $props();

  const sizeClasses = {
    xs: 'w-3 h-3',
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
    xl: 'w-8 h-8',
  };

  const icons = {
    leaf: `<path d="M17 8C8 10 5.9 16.17 3.82 21.34l1.89.66.95-2.3c.48.17.98.3 1.34.3C19 20 22 3 22 3c-1 2-8 2.25-13 3.25S2 11.5 2 13.5s1.75 3.75 1.75 3.75C7 8 17 8 17 8z" fill="currentColor"/>`,
    seedling: `<path d="M12 22V10" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round"/><path d="M12 10C12 10 12 6 16 3C16 7 14 10 12 10Z" fill="currentColor"/><path d="M12 14C12 14 12 10 8 7C8 11 10 14 12 14Z" fill="currentColor"/>`,
    tree: `<path d="M12 2C9 2 6 5 6 8c0 2 1 3.5 2.5 4.5C7 13 6 14.5 6 16c0 2.5 2.5 4 6 4s6-1.5 6-4c0-1.5-1-3-2.5-3.5C17 11.5 18 10 18 8c0-3-3-6-6-6z" fill="currentColor"/><path d="M12 16V22" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round"/>`,
    sun: `<circle cx="12" cy="12" r="4" stroke="currentColor" stroke-width="${strokeWidth}"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round"/>`,
    moon: `<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`,
    search: `<circle cx="11" cy="11" r="8" stroke="currentColor" stroke-width="${strokeWidth}"/><path d="m21 21-4.35-4.35" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round"/>`,
    close: `<path d="M18 6 6 18M6 6l12 12" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round"/>`,
    menu: `<path d="M4 6h16M4 12h16M4 18h16" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round"/>`,
    check: `<path d="M20 6 9 17l-5-5" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`,
    'chevron-down': `<path d="m6 9 6 6 6-6" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`,
    'chevron-up': `<path d="m18 15-6-6-6 6" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`,
    'chevron-left': `<path d="m15 18-6-6 6-6" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`,
    'chevron-right': `<path d="m9 18 6-6-6-6" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`,
    'arrow-right': `<path d="M5 12h14M12 5l7 7-7 7" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`,
    'arrow-left': `<path d="M19 12H5M12 19l-7-7 7-7" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`,
    edit: `<path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`,
    trash: `<path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`,
    plus: `<path d="M12 5v14M5 12h14" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round"/>`,
    minus: `<path d="M5 12h14" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round"/>`,
    heart: `<path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`,
    bookmark: `<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`,
    share: `<circle cx="18" cy="5" r="3" stroke="currentColor" stroke-width="${strokeWidth}"/><circle cx="6" cy="12" r="3" stroke="currentColor" stroke-width="${strokeWidth}"/><circle cx="18" cy="19" r="3" stroke="currentColor" stroke-width="${strokeWidth}"/><path d="m8.59 13.51 6.83 3.98M15.41 6.51l-6.82 3.98" stroke="currentColor" stroke-width="${strokeWidth}"/>`,
    'external-link': `<path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14 21 3" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`,
    mail: `<path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/><path d="m22 6-10 7L2 6" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/>`,
    user: `<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" stroke="currentColor" stroke-width="${strokeWidth}" stroke-linecap="round" stroke-linejoin="round"/><circle cx="12" cy="7" r="4" stroke="currentColor" stroke-width="${strokeWidth}"/>`,
  };
</script>

<svg
  viewBox="0 0 24 24"
  fill="none"
  class="{sizeClasses[size]} {className}"
  aria-hidden="true"
  {...restProps}
>
  {@html icons[name]}
</svg>
