<script lang="ts">
	import { accents } from '../palette';

	interface Props {
		class?: string;
		color?: string;
		animate?: boolean;
		variant?: 'twinkle' | 'point' | 'burst';
	}

	let {
		class: className = 'w-3 h-3',
		color,
		animate = true,
		variant = 'twinkle'
	}: Props = $props();

	const starColor = color ?? accents.sky.star;
</script>

<!-- Star -->
<svg class="{className} {animate ? 'twinkle' : ''}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20">
	{#if variant === 'twinkle'}
		<!-- 4-point twinkle star -->
		<path
			fill={starColor}
			d="M10 0 L11 8 L20 10 L11 12 L10 20 L9 12 L0 10 L9 8 Z"
		/>
	{:else if variant === 'point'}
		<!-- Simple point -->
		<circle fill={starColor} cx="10" cy="10" r="3" />
		<!-- Subtle glow -->
		<circle fill={starColor} cx="10" cy="10" r="6" opacity="0.3" />
	{:else}
		<!-- Starburst -->
		<path
			fill={starColor}
			d="M10 0 L11 7 L18 4 L13 9 L20 10 L13 11 L18 16 L11 13 L10 20 L9 13 L2 16 L7 11 L0 10 L7 9 L2 4 L9 7 Z"
		/>
	{/if}
</svg>

<style>
	@keyframes twinkle {
		0%, 100% { opacity: 1; transform: scale(1); }
		50% { opacity: 0.5; transform: scale(0.8); }
	}

	.twinkle {
		animation: twinkle 2s ease-in-out infinite;
		animation-delay: var(--twinkle-delay, 0s);
	}
</style>
