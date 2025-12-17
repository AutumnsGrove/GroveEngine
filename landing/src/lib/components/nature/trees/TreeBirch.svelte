<script lang="ts">
	import type { Season } from '../palette';
	import { autumn, greens, natural } from '../palette';

	interface Props {
		class?: string;
		color?: string;
		trunkColor?: string;
		season?: Season;
		animate?: boolean;
	}

	let {
		class: className = 'w-6 h-6',
		color,
		trunkColor,
		season = 'summer',
		animate = true
	}: Props = $props();

	// Birch turns brilliant golden yellow in autumn
	const defaultColor = season === 'autumn' ? autumn.gold : 'currentColor';
	const foliageColor = color ?? defaultColor;

	// Birch bark is white/cream with dark horizontal marks
	const actualTrunkColor = trunkColor ?? natural.birchWhite;
	const barkMarkColor = '#2d2d2d';
</script>

<!-- Birch tree - white bark with horizontal marks, small triangular leaves -->
<svg class={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140">
	<!-- Main trunk - characteristic white birch bark -->
	<rect fill={actualTrunkColor} x="45" y="55" width="10" height="85" rx="2" />

	<!-- Bark marks (horizontal lenticels - birch signature) -->
	<line x1="46" y1="65" x2="54" y2="65" stroke={barkMarkColor} stroke-width="1.5" opacity="0.5" />
	<line x1="47" y1="78" x2="53" y2="78" stroke={barkMarkColor} stroke-width="1" opacity="0.4" />
	<line x1="46" y1="92" x2="54" y2="92" stroke={barkMarkColor} stroke-width="1.5" opacity="0.5" />
	<line x1="47" y1="105" x2="53" y2="105" stroke={barkMarkColor} stroke-width="1" opacity="0.4" />
	<line x1="46" y1="118" x2="54" y2="118" stroke={barkMarkColor} stroke-width="1.5" opacity="0.5" />
	<line x1="47" y1="130" x2="53" y2="130" stroke={barkMarkColor} stroke-width="1" opacity="0.4" />

	<!-- Peeling bark texture hints -->
	<path fill="none" stroke={barkMarkColor} stroke-width="0.5" d="M45 83 Q43 87 45 91" opacity="0.25" />
	<path fill="none" stroke={barkMarkColor} stroke-width="0.5" d="M55 108 Q57 112 55 116" opacity="0.25" />

	<!-- Delicate branch structure -->
	<path fill="none" stroke={actualTrunkColor} stroke-width="3" d="M50 55 Q42 48 32 42" />
	<path fill="none" stroke={actualTrunkColor} stroke-width="3" d="M50 55 Q58 48 68 42" />
	<path fill="none" stroke={actualTrunkColor} stroke-width="2" d="M50 50 Q44 38 38 28" />
	<path fill="none" stroke={actualTrunkColor} stroke-width="2" d="M50 50 Q56 38 62 28" />
	<path fill="none" stroke={actualTrunkColor} stroke-width="1.5" d="M46 42 Q40 32 35 22" />
	<path fill="none" stroke={actualTrunkColor} stroke-width="1.5" d="M54 42 Q60 32 65 22" />

	<!-- Birch leaves - small diamond/triangular shapes -->
	<!-- Left side clusters -->
	<g class={animate ? 'sway sway-1' : ''}>
		<!-- Diamond-shaped leaves pointing down -->
		<path fill={foliageColor} d="M25 45 L30 38 L35 45 L30 50 Z" />
		<path fill={foliageColor} d="M18 38 L22 32 L26 38 L22 43 Z" />
		<path fill={foliageColor} d="M28 35 L32 28 L36 35 L32 40 Z" />
		<path fill={foliageColor} d="M15 46 L19 40 L23 46 L19 51 Z" />
		<path fill={foliageColor} d="M32 48 L36 42 L40 48 L36 53 Z" />
	</g>

	<g class={animate ? 'sway sway-2' : ''}>
		<path fill={foliageColor} d="M30 28 L34 22 L38 28 L34 33 Z" />
		<path fill={foliageColor} d="M22 25 L26 19 L30 25 L26 30 Z" />
		<path fill={foliageColor} d="M26 15 L29 10 L32 15 L29 19 Z" />
		<path fill={foliageColor} d="M35 20 L38 15 L41 20 L38 24 Z" />
	</g>

	<!-- Center top cluster -->
	<g class={animate ? 'sway sway-3' : ''}>
		<path fill={foliageColor} d="M47 18 L50 12 L53 18 L50 23 Z" />
		<path fill={foliageColor} d="M42 22 L45 16 L48 22 L45 27 Z" />
		<path fill={foliageColor} d="M52 22 L55 16 L58 22 L55 27 Z" />
		<path fill={foliageColor} d="M50 8 L52 4 L54 8 L52 11 Z" />
		<path fill={foliageColor} d="M44 12 L47 7 L50 12 L47 16 Z" />
		<path fill={foliageColor} d="M50 12 L53 7 L56 12 L53 16 Z" />
	</g>

	<!-- Center middle -->
	<g class={animate ? 'sway sway-1' : ''}>
		<path fill={foliageColor} d="M47 32 L50 26 L53 32 L50 37 Z" />
		<path fill={foliageColor} d="M40 35 L43 29 L46 35 L43 40 Z" />
		<path fill={foliageColor} d="M54 35 L57 29 L60 35 L57 40 Z" />
		<path fill={foliageColor} d="M45 45 L48 40 L51 45 L48 49 Z" />
		<path fill={foliageColor} d="M49 45 L52 40 L55 45 L52 49 Z" />
	</g>

	<!-- Right side clusters -->
	<g class={animate ? 'sway sway-2' : ''}>
		<path fill={foliageColor} d="M75 45 L70 38 L65 45 L70 50 Z" />
		<path fill={foliageColor} d="M82 38 L78 32 L74 38 L78 43 Z" />
		<path fill={foliageColor} d="M72 35 L68 28 L64 35 L68 40 Z" />
		<path fill={foliageColor} d="M85 46 L81 40 L77 46 L81 51 Z" />
		<path fill={foliageColor} d="M68 48 L64 42 L60 48 L64 53 Z" />
	</g>

	<g class={animate ? 'sway sway-3' : ''}>
		<path fill={foliageColor} d="M70 28 L66 22 L62 28 L66 33 Z" />
		<path fill={foliageColor} d="M78 25 L74 19 L70 25 L74 30 Z" />
		<path fill={foliageColor} d="M74 15 L71 10 L68 15 L71 19 Z" />
		<path fill={foliageColor} d="M65 20 L62 15 L59 20 L62 24 Z" />
	</g>
</svg>

<style>
	@keyframes sway {
		0%, 100% { transform: translateX(0) rotate(0deg); }
		50% { transform: translateX(0.8px) rotate(0.3deg); }
	}

	.sway {
		transform-origin: center bottom;
		animation: sway 3.5s ease-in-out infinite;
	}

	.sway-1 { animation-delay: 0s; }
	.sway-2 { animation-delay: 0.4s; }
	.sway-3 { animation-delay: 0.8s; }
</style>
