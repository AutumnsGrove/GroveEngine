<!--
  Grove Logo: Sanctuary
  A grove of line-art trees within a circular badge, with a glowing flame at center
  Evokes: "A warm sanctuary in the night forest—someone left a light on for you"
-->
<script lang="ts">
	/**
	 * Grove Logo: Sanctuary
	 * Night grove with various stylized trees and a central glowing flame
	 * The vibe: warmth, safety, community gathering in the dark
	 *
	 * Typography: Uses Calistoga for the wordmark—intentionally distinct from
	 * body text (Lexend). Calistoga's warm, rounded character matches the
	 * sanctuary theme. This is a deliberate design choice; keep it unique.
	 *
	 * @example Basic usage
	 * ```svelte
	 * <LogoSanctuary />
	 * <LogoSanctuary size="lg" />
	 * <LogoSanctuary season="winter" />
	 * ```
	 *
	 * @example With flame animation
	 * ```svelte
	 * <LogoSanctuary flicker />
	 * <LogoSanctuary flicker flickerSpeed="slow" />
	 * ```
	 */
	import { browser } from '$app/environment';

	type Season = 'spring' | 'summer' | 'autumn' | 'winter';
	type Size = 'sm' | 'md' | 'lg' | 'xl';
	type FlickerSpeed = 'slow' | 'normal' | 'fast';

	// Seasonal color palettes - night grove variants
	// Each season has its own mood while maintaining the sanctuary warmth
	const seasonalPalettes = {
		spring: {
			line: '#e9b8d4',      // soft rose gold
			flame: '#ff7eb3',     // cherry blossom flame
			background: '#4a1942' // deep magenta night
		},
		summer: {
			line: '#c9874d',      // warm copper-orange
			flame: '#f5a623',     // amber-gold flame
			background: '#3d1952' // deep purple/violet night
		},
		autumn: {
			line: '#d97706',      // burnt copper
			flame: '#ea580c',     // ember orange
			background: '#431407' // deep rust night
		},
		winter: {
			line: '#94a3b8',      // silver frost
			flame: '#60a5fa',     // cool blue flame
			background: '#0f172a' // midnight blue
		}
	} as const;

	// Size presets
	const sizeClasses = {
		sm: 'w-8 h-8',
		md: 'w-16 h-16',
		lg: 'w-24 h-24',
		xl: 'w-32 h-32'
	} as const;

	interface Props {
		/** CSS classes for sizing and positioning (overrides size preset) */
		class?: string;
		/** Preset size - sm (32px), md (64px), lg (96px), xl (128px) */
		size?: Size;
		/** Seasonal color theme */
		season?: Season;
		/** Line/stroke color (overrides season if provided) */
		lineColor?: string;
		/** Flame/glow color (overrides season if provided) */
		flameColor?: string;
		/** Background color inside the circle (overrides season if provided) */
		backgroundColor?: string;
		/** Show the "Grove" text below the emblem */
		showText?: boolean;
		/** Show the crescent moon */
		showMoon?: boolean;
		/** Show decorative stars */
		showStars?: boolean;
		/** Show the flame glow effect */
		showGlow?: boolean;
		/** Enable flame flicker animation */
		flicker?: boolean;
		/** Flicker animation speed */
		flickerSpeed?: FlickerSpeed;
		/** Accessible name for screen readers */
		title?: string;
	}

	let {
		class: className,
		size = 'md',
		season = 'summer',
		lineColor,
		flameColor,
		backgroundColor,
		showText = true,
		showMoon = true,
		showStars = true,
		showGlow = true,
		flicker = false,
		flickerSpeed = 'normal',
		title = 'Grove'
	}: Props = $props();

	// Compute actual colors - custom colors override seasonal palette
	// Background uses seasonal palette by default for the full sanctuary effect
	const palette = $derived(seasonalPalettes[season]);
	const actualLineColor = $derived(lineColor ?? palette.line);
	const actualFlameColor = $derived(flameColor ?? palette.flame);
	const actualBackgroundColor = $derived(backgroundColor ?? palette.background);

	// Compute CSS class - custom class overrides size preset
	const computedClass = $derived(className ?? sizeClasses[size]);

	// Generate unique IDs for gradients to avoid conflicts with multiple instances
	const uniqueId = Math.random().toString(36).substring(2, 9);
	const glowGradientId = `sanctuary-glow-${uniqueId}`;
	const flameGradientId = `sanctuary-flame-${uniqueId}`;

	// Respect user's reduced motion preference
	const reducedMotionQuery = browser ? window.matchMedia('(prefers-reduced-motion: reduce)') : null;
	let prefersReducedMotion = $state(reducedMotionQuery?.matches ?? false);

	$effect(() => {
		if (!reducedMotionQuery) return;
		const handler = (e: MediaQueryListEvent) => { prefersReducedMotion = e.matches; };
		reducedMotionQuery.addEventListener('change', handler);
		return () => reducedMotionQuery.removeEventListener('change', handler);
	});

	// Flicker animation speed (CSS animation duration)
	const flickerDurations = {
		slow: '3s',
		normal: '1.5s',
		fast: '0.8s'
	} as const;

	const flickerDuration = $derived(flickerDurations[flickerSpeed]);
	const shouldAnimate = $derived(flicker && !prefersReducedMotion);
</script>

<svg
	class={computedClass}
	xmlns="http://www.w3.org/2000/svg"
	viewBox="0 0 100 {showText ? 115 : 100}"
	fill="none"
	role={title ? 'img' : 'presentation'}
	aria-label={title}
	aria-hidden={!title}
>
	{#if title}<title>{title}</title>{/if}

	<defs>
		<!-- Radial glow for the flame -->
		<radialGradient id={glowGradientId} cx="50%" cy="50%" r="50%">
			<stop offset="0%" stop-color={actualFlameColor} stop-opacity="0.8" />
			<stop offset="50%" stop-color={actualFlameColor} stop-opacity="0.3" />
			<stop offset="100%" stop-color={actualFlameColor} stop-opacity="0" />
		</radialGradient>
		<!-- Flame body gradient -->
		<linearGradient id={flameGradientId} x1="0%" y1="100%" x2="0%" y2="0%">
			<stop offset="0%" stop-color={actualFlameColor}>
				{#if shouldAnimate}
					<animate
						attributeName="stop-color"
						values="{actualFlameColor};#ea580c;{actualFlameColor}"
						dur={flickerDuration}
						repeatCount="indefinite"
					/>
				{/if}
			</stop>
			<stop offset="50%" stop-color={actualFlameColor} />
			<stop offset="100%" stop-color="#fef08a">
				{#if shouldAnimate}
					<animate
						attributeName="stop-color"
						values="#fef08a;#ffffff;#fef08a"
						dur={flickerDuration}
						repeatCount="indefinite"
					/>
				{/if}
			</stop>
		</linearGradient>
	</defs>

	<!-- Background circle (if backgroundColor is set) -->
	{#if actualBackgroundColor !== 'transparent'}
		<circle cx="50" cy="50" r="46" fill={actualBackgroundColor} />
	{/if}

	<!-- Outer ring - bold frame -->
	<circle
		cx="50"
		cy="50"
		r="46"
		stroke={actualLineColor}
		stroke-width="2.5"
		fill="none"
	/>

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- CELESTIAL ELEMENTS -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	{#if showMoon}
		<!-- Crescent moon (upper right) -->
		<path
			d="M72 22
			   a 6 6 0 1 1 0 12
			   a 4.5 4.5 0 1 0 0 -12"
			stroke={actualLineColor}
			stroke-width="1.5"
			fill="none"
		/>
	{/if}

	{#if showStars}
		<!-- Four-pointed stars scattered in the sky - bolder, more pronounced -->
		<!-- Star 1 (upper left area) -->
		<path d="M28 20 l0 -4 l0 8 m-4 -4 l8 0" stroke={actualLineColor} stroke-width="1.5" stroke-linecap="round" />
		<!-- Star 2 (small, between left star and center) -->
		<path d="M38 28 l0 -2.5 l0 5 m-2.5 -2.5 l5 0" stroke={actualLineColor} stroke-width="1.2" stroke-linecap="round" />
		<!-- Star 3 (upper center, near moon) -->
		<path d="M58 18 l0 -3 l0 6 m-3 -3 l6 0" stroke={actualLineColor} stroke-width="1.2" stroke-linecap="round" />
		<!-- Star 4 (right side) -->
		<path d="M80 30 l0 -3.5 l0 7 m-3.5 -3.5 l7 0" stroke={actualLineColor} stroke-width="1.3" stroke-linecap="round" />
		<!-- Star 5 (small accent, far left) -->
		<path d="M14 38 l0 -2 l0 4 m-2 -2 l4 0" stroke={actualLineColor} stroke-width="1" stroke-linecap="round" />
	{/if}

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- TREES (left to right) - organic, rounded shapes with overlapping depth -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	<!-- Tree 1: Large rounded deciduous (far left, background layer) -->
	<g stroke={actualLineColor} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
		<!-- Cloud-like organic canopy with multiple lobes -->
		<path d="M8 58
			Q6 52, 10 48
			Q8 42, 14 38
			Q12 32, 20 30
			Q26 28, 30 34
			Q34 30, 36 36
			Q40 38, 38 44
			Q42 48, 38 54
			Q40 60, 34 64
			Q30 68, 22 68
			Q14 68, 10 64
			Q6 62, 8 58
			Z" />
		<!-- Trunk -->
		<path d="M22 68 L22 80" stroke-width="2.2" />
		<!-- Internal branch structure -->
		<path d="M22 68 L22 50" stroke-width="1.5" />
		<path d="M22 60 L14 50" stroke-width="1.5" />
		<path d="M22 60 L30 50" stroke-width="1.5" />
		<path d="M22 52 L16 42" stroke-width="1.3" />
		<path d="M22 52 L28 42" stroke-width="1.3" />
	</g>

	<!-- Tree 2: Tall cypress/poplar (left-center, middle layer) -->
	<g stroke={actualLineColor} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
		<!-- Elongated pointed canopy -->
		<path d="M34 78
			Q30 72, 32 62
			Q30 52, 34 42
			Q32 32, 38 24
			Q42 32, 40 42
			Q44 52, 42 62
			Q44 72, 40 78
			Z" />
		<!-- Internal veining -->
		<path d="M37 70 L37 32" stroke-width="1.5" />
		<path d="M37 55 L33 48" stroke-width="1.3" />
		<path d="M37 55 L41 48" stroke-width="1.3" />
		<path d="M37 45 L34 38" stroke-width="1.2" />
		<path d="M37 45 L40 38" stroke-width="1.2" />
	</g>

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- CENTER: Gothic arch tree with flame (the hero element) -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	{#if showGlow}
		<!-- Soft glow behind the flame -->
		<circle cx="50" cy="68" r="12" fill="url(#{glowGradientId})">
			{#if shouldAnimate}
				<animate
					attributeName="r"
					values="12;14;12"
					dur={flickerDuration}
					repeatCount="indefinite"
				/>
				<animate
					attributeName="opacity"
					values="1;0.7;1"
					dur={flickerDuration}
					repeatCount="indefinite"
				/>
			{/if}
		</circle>
	{/if}

	<g stroke={actualLineColor} stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" fill="none">
		<!-- Gothic arch shape (pointed arch like a cathedral window) - bolder -->
		<path d="M42 80 L42 52 Q42 40, 50 34 Q58 40, 58 52 L58 80" />
		<!-- Internal arch details - creates the nested arch effect -->
		<path d="M45 78 L45 55 Q45 45, 50 40 Q55 45, 55 55 L55 78" stroke-width="1.8" />
	</g>

	<!-- The flame itself -->
	<g class:flicker-flame={shouldAnimate} style:--flicker-duration={flickerDuration}>
		<path
			d="M50 73
			   Q47 68, 48 64
			   Q46 60, 50 54
			   Q54 60, 52 64
			   Q53 68, 50 73
			   Z"
			fill="url(#{flameGradientId})"
			stroke={actualFlameColor}
			stroke-width="0.5"
		>
			{#if shouldAnimate}
				<animate
					attributeName="d"
					values="M50 73 Q47 68, 48 64 Q46 60, 50 54 Q54 60, 52 64 Q53 68, 50 73 Z;
					        M50 72 Q46 67, 47 63 Q45 59, 50 52 Q55 59, 53 63 Q54 67, 50 72 Z;
					        M50 73 Q47 68, 48 64 Q46 60, 50 54 Q54 60, 52 64 Q53 68, 50 73 Z"
					dur={flickerDuration}
					repeatCount="indefinite"
				/>
			{/if}
		</path>
		<!-- Flame inner glow -->
		<ellipse cx="50" cy="66" rx="2" ry="4" fill="#fef3c7" opacity="0.8">
			{#if shouldAnimate}
				<animate
					attributeName="ry"
					values="4;5;4"
					dur={flickerDuration}
					repeatCount="indefinite"
				/>
				<animate
					attributeName="cy"
					values="66;64;66"
					dur={flickerDuration}
					repeatCount="indefinite"
				/>
			{/if}
		</ellipse>
	</g>

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- MORE TREES (right side) - organic, overlapping depth -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	<!-- Tree 4: Tall cypress/poplar (right-center, middle layer) -->
	<g stroke={actualLineColor} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
		<!-- Elongated pointed canopy -->
		<path d="M60 78
			Q56 72, 58 62
			Q56 52, 60 42
			Q58 32, 64 24
			Q68 32, 66 42
			Q70 52, 68 62
			Q70 72, 66 78
			Z" />
		<!-- Internal veining -->
		<path d="M63 70 L63 32" stroke-width="1.5" />
		<path d="M63 55 L59 48" stroke-width="1.3" />
		<path d="M63 55 L67 48" stroke-width="1.3" />
		<path d="M63 45 L60 38" stroke-width="1.2" />
		<path d="M63 45 L66 38" stroke-width="1.2" />
	</g>

	<!-- Tree 5: Large rounded deciduous (far right, background layer) -->
	<g stroke={actualLineColor} stroke-width="2" stroke-linecap="round" stroke-linejoin="round" fill="none">
		<!-- Cloud-like organic canopy with multiple lobes -->
		<path d="M72 62
			Q68 56, 72 50
			Q70 44, 76 40
			Q74 34, 82 32
			Q88 30, 92 36
			Q96 34, 96 42
			Q98 48, 94 54
			Q96 60, 90 64
			Q86 68, 80 68
			Q74 68, 72 64
			Q70 62, 72 62
			Z" />
		<!-- Trunk -->
		<path d="M82 68 L82 80" stroke-width="2.2" />
		<!-- Internal branch structure -->
		<path d="M82 68 L82 50" stroke-width="1.5" />
		<path d="M82 58 L76 50" stroke-width="1.5" />
		<path d="M82 58 L88 50" stroke-width="1.5" />
		<path d="M82 52 L78 44" stroke-width="1.3" />
		<path d="M82 52 L86 44" stroke-width="1.3" />
	</g>

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- GROUND LINE - curved with downward dips at edges -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	<!-- Primary ground line - gentle curve dipping at edges -->
	<path
		d="M8 82 Q25 79, 50 79 Q75 79, 92 82"
		stroke={actualLineColor}
		stroke-width="2"
		stroke-linecap="round"
		fill="none"
	/>

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- "GROVE" TEXT WITH ACCENT LINES -->
	<!-- NOTE: Calistoga is intentionally used here for its unique, warm character. -->
	<!-- This is the logo wordmark—keep it distinct from body text (Lexend). -->
	<!-- ═══════════════════════════════════════════════════════════════ -->

	{#if showText}
		<!-- Accent line above text -->
		<path
			d="M30 90 L70 90"
			stroke={actualLineColor}
			stroke-width="1.5"
			stroke-linecap="round"
		/>

		<text
			x="50"
			y="106"
			text-anchor="middle"
			font-family="Calistoga, serif"
			font-size="15"
			fill={actualLineColor}
			letter-spacing="2"
		>
			Grove
		</text>

		<!-- Accent line below text (curved to echo the circle frame) -->
		<path
			d="M25 112 Q50 116, 75 112"
			stroke={actualLineColor}
			stroke-width="1.5"
			stroke-linecap="round"
			fill="none"
		/>
	{/if}
</svg>
