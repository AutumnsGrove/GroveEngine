<script lang="ts">
	import type { Season } from '../palette';
	import { autumn, greens } from '../palette';

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

	// Aspen turns brilliant gold/yellow in autumn
	const defaultColor = season === 'autumn' ? autumn.gold : 'currentColor';
	const foliageColor = color ?? defaultColor;

	// Aspen bark is pale cream/greenish-white with dark marks
	const actualTrunkColor = trunkColor ?? '#e8e4d9';
	const barkMarkColor = '#4a4a4a';

	// Slightly darker shade for leaf depth
	const leafShadow = season === 'autumn' ? autumn.amber : greens.grove;
</script>

<!-- Aspen tree - slender trunk with quivering round/heart-shaped leaves -->
<svg class={className} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 140">
	<!-- Trunk - slender with characteristic bark marks -->
	<rect fill={actualTrunkColor} x="46" y="60" width="8" height="80" rx="2" />

	<!-- Bark marks (aspen "eyes") -->
	<ellipse fill={barkMarkColor} cx="49" cy="78" rx="2" ry="1" opacity="0.6" />
	<ellipse fill={barkMarkColor} cx="51" cy="98" rx="2.5" ry="1" opacity="0.5" />
	<ellipse fill={barkMarkColor} cx="48" cy="118" rx="2" ry="1" opacity="0.6" />

	<!-- Upper branches hint -->
	<path fill={actualTrunkColor} d="M50 60 Q44 55 38 58 L42 52 Q47 54 50 55 Z" />
	<path fill={actualTrunkColor} d="M50 60 Q56 55 62 58 L58 52 Q53 54 50 55 Z" />

	<!-- Individual aspen leaves - round/heart shaped with pointed tips -->
	<!-- Each group quivers independently like real aspen leaves -->

	<!-- Left branch cluster -->
	<g class={animate ? 'quiver quiver-1' : ''}>
		<!-- Individual leaf shapes (teardrop/heart) -->
		<path fill={foliageColor} d="M22 40 Q18 35 22 28 Q26 35 22 40 Z" />
		<path fill={foliageColor} d="M28 32 Q24 27 28 20 Q32 27 28 32 Z" />
		<path fill={foliageColor} d="M18 32 Q14 27 18 22 Q22 27 18 32 Z" />
		<path fill={foliageColor} d="M25 45 Q21 40 25 35 Q29 40 25 45 Z" />
		<path fill={foliageColor} d="M16 42 Q12 37 16 32 Q20 37 16 42 Z" />
	</g>

	<g class={animate ? 'quiver quiver-2' : ''}>
		<path fill={foliageColor} d="M32 28 Q28 23 32 16 Q36 23 32 28 Z" />
		<path fill={foliageColor} d="M26 18 Q22 13 26 8 Q30 13 26 18 Z" />
		<path fill={foliageColor} d="M35 38 Q31 33 35 28 Q39 33 35 38 Z" />
		<path fill={foliageColor} d="M22 12 Q18 7 22 2 Q26 7 22 12 Z" />
	</g>

	<!-- Center top cluster -->
	<g class={animate ? 'quiver quiver-3' : ''}>
		<path fill={foliageColor} d="M50 18 Q46 12 50 5 Q54 12 50 18 Z" />
		<path fill={foliageColor} d="M44 22 Q40 16 44 10 Q48 16 44 22 Z" />
		<path fill={foliageColor} d="M56 22 Q52 16 56 10 Q60 16 56 22 Z" />
		<path fill={foliageColor} d="M50 28 Q46 22 50 16 Q54 22 50 28 Z" />
		<path fill={foliageColor} d="M42 32 Q38 26 42 20 Q46 26 42 32 Z" />
		<path fill={foliageColor} d="M58 32 Q54 26 58 20 Q62 26 58 32 Z" />
	</g>

	<!-- Center middle cluster -->
	<g class={animate ? 'quiver quiver-1' : ''}>
		<path fill={foliageColor} d="M50 38 Q46 32 50 26 Q54 32 50 38 Z" />
		<path fill={foliageColor} d="M44 45 Q40 39 44 33 Q48 39 44 45 Z" />
		<path fill={foliageColor} d="M56 45 Q52 39 56 33 Q60 39 56 45 Z" />
		<path fill={foliageColor} d="M48 52 Q44 46 48 40 Q52 46 48 52 Z" />
		<path fill={foliageColor} d="M52 52 Q48 46 52 40 Q56 46 52 52 Z" />
	</g>

	<!-- Right branch cluster -->
	<g class={animate ? 'quiver quiver-2' : ''}>
		<path fill={foliageColor} d="M78 40 Q74 35 78 28 Q82 35 78 40 Z" />
		<path fill={foliageColor} d="M72 32 Q68 27 72 20 Q76 27 72 32 Z" />
		<path fill={foliageColor} d="M82 32 Q78 27 82 22 Q86 27 82 32 Z" />
		<path fill={foliageColor} d="M75 45 Q71 40 75 35 Q79 40 75 45 Z" />
		<path fill={foliageColor} d="M84 42 Q80 37 84 32 Q88 37 84 42 Z" />
	</g>

	<g class={animate ? 'quiver quiver-3' : ''}>
		<path fill={foliageColor} d="M68 28 Q64 23 68 16 Q72 23 68 28 Z" />
		<path fill={foliageColor} d="M74 18 Q70 13 74 8 Q78 13 74 18 Z" />
		<path fill={foliageColor} d="M65 38 Q61 33 65 28 Q69 33 65 38 Z" />
		<path fill={foliageColor} d="M78 12 Q74 7 78 2 Q82 7 78 12 Z" />
	</g>
</svg>

<style>
	/* Aspen leaves famously "quiver" in the slightest breeze */
	@keyframes quiver {
		0%, 100% {
			transform: rotate(0deg) translateX(0);
		}
		20% {
			transform: rotate(0.8deg) translateX(0.4px);
		}
		40% {
			transform: rotate(-0.6deg) translateX(-0.3px);
		}
		60% {
			transform: rotate(0.5deg) translateX(0.2px);
		}
		80% {
			transform: rotate(-0.4deg) translateX(-0.2px);
		}
	}

	.quiver {
		transform-origin: center bottom;
		animation: quiver 2.5s ease-in-out infinite;
	}

	.quiver-1 { animation-delay: 0s; }
	.quiver-2 { animation-delay: 0.4s; }
	.quiver-3 { animation-delay: 0.8s; }
</style>
