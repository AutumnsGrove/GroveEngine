<script lang="ts">
	import type { Snippet } from "svelte";
	import type { HTMLAttributes } from "svelte/elements";
	import { cn } from "$lib/ui/utils";

	/**
	 * Glass component for creating glassmorphism effects
	 *
	 * A reusable component that provides translucent, frosted-glass effects
	 * perfect for overlays, cards, navbars, and text containers while
	 * maintaining visibility of background elements.
	 *
	 * @example Basic usage
	 * ```svelte
	 * <Glass variant="card">
	 *   <p>Content with glass background</p>
	 * </Glass>
	 * ```
	 *
	 * @example As a navbar
	 * ```svelte
	 * <Glass variant="surface" as="header" class="sticky top-0">
	 *   <nav>...</nav>
	 * </Glass>
	 * ```
	 *
	 * @example Accent tint for callouts
	 * ```svelte
	 * <Glass variant="accent" intensity="light" class="p-6 rounded-xl">
	 *   <p>Important message here</p>
	 * </Glass>
	 * ```
	 */

	type Variant =
		| "surface"   // Headers, navbars - high opacity, subtle blur
		| "overlay"   // Modal backdrops - dark, medium blur
		| "card"      // Content cards - medium opacity, clean look
		| "tint"      // Text containers - light background for readability
		| "accent"    // Accent-colored glass for callouts/highlights
		| "muted";    // Subtle background, barely visible

	type Intensity =
		| "none"      // No blur (just transparency)
		| "light"     // backdrop-blur-sm (4px)
		| "medium"    // backdrop-blur (8px)
		| "strong";   // backdrop-blur-md (12px)

	type Element = "div" | "section" | "article" | "aside" | "header" | "footer" | "nav" | "main";

	interface Props extends HTMLAttributes<HTMLElement> {
		/** Visual style variant */
		variant?: Variant;
		/** Blur intensity */
		intensity?: Intensity;
		/** HTML element to render */
		as?: Element;
		/** Include subtle border */
		border?: boolean;
		/** Include shadow */
		shadow?: boolean;
		/** Additional CSS classes */
		class?: string;
		/** Content */
		children?: Snippet;
	}

	let {
		variant = "card",
		intensity = "light",
		as: element = "div",
		border = true,
		shadow = false,
		class: className,
		children,
		...restProps
	}: Props = $props();

	// Background colors per variant - warm grove tones, translucent for glass effect
	const variantClasses: Record<Variant, string> = {
		// High opacity for sticky headers/navbars (uses background color)
		surface: "bg-background/90 dark:bg-background/90",

		// Dark overlay for modals/sheets
		overlay: "bg-black/50 dark:bg-black/60",

		// Medium opacity for content cards - translucent with grove warmth
		card: "bg-white/60 dark:bg-emerald-950/25",

		// Light tint for text readability
		tint: "bg-white/50 dark:bg-emerald-950/20",

		// Accent-colored glass for highlights/callouts
		accent: "bg-accent/25 dark:bg-accent/15",

		// Barely visible, very subtle
		muted: "bg-white/30 dark:bg-emerald-950/15"
	};

	// Blur intensity classes - default to medium blur for true glass effect
	const intensityClasses: Record<Intensity, string> = {
		none: "",
		light: "backdrop-blur",         // 8px
		medium: "backdrop-blur-md",     // 12px
		strong: "backdrop-blur-lg"      // 16px
	};

	// Border classes per variant - subtle borders that complement the glass
	const borderClasses: Record<Variant, string> = {
		surface: "border-border",
		overlay: "border-white/10",
		card: "border-white/40 dark:border-emerald-800/25",
		tint: "border-white/30 dark:border-emerald-800/20",
		accent: "border-accent/30 dark:border-accent/20",
		muted: "border-white/20 dark:border-emerald-800/15"
	};

	// Shadow classes
	const shadowClasses: Record<Variant, string> = {
		surface: "shadow-sm",
		overlay: "shadow-2xl",
		card: "shadow-sm",
		tint: "shadow-sm",
		accent: "shadow-sm",
		muted: ""
	};

	const computedClass = $derived(
		cn(
			variantClasses[variant],
			intensityClasses[intensity],
			border && `border ${borderClasses[variant]}`,
			shadow && shadowClasses[variant],
			className
		)
	);
</script>

<!--
  Glassmorphism component for Grove

  CSS Properties used:
  - backdrop-filter: blur() - Creates the frosted glass effect
  - Background with alpha - Semi-transparent backgrounds (e.g., bg-white/80)
  - Border with alpha - Subtle borders that complement the glass effect

  Browser Support:
  - backdrop-filter is supported in all modern browsers
  - Falls back gracefully to solid backgrounds in older browsers
-->

<svelte:element
	this={element}
	class={computedClass}
	{...restProps}
>
	{#if children}{@render children()}{/if}
</svelte:element>
