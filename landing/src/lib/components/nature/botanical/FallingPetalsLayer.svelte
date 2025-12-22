<script lang="ts">
	import { browser } from '$app/environment';
	import PetalFalling from './PetalFalling.svelte';

	type PetalVariant = 'round' | 'pointed' | 'heart' | 'curled' | 'tiny';

	// Check for reduced motion preference
	const prefersReducedMotion = browser
		? window.matchMedia('(prefers-reduced-motion: reduce)').matches
		: false;

	interface Props {
		/** Total number of petals */
		count?: number;
		/** Base z-index for the petal layer */
		zIndex?: number;
		/** Enable petal animation */
		enabled?: boolean;
		/** Opacity range for petals (depth affects final value) */
		opacity?: { min: number; max: number };
		/** Fall duration range in seconds (slower = more dreamy) */
		fallDuration?: { min: number; max: number };
		/** Horizontal drift range in pixels (petals flutter more than snow) */
		driftRange?: number;
		/** Maximum spawn delay in seconds */
		spawnDelay?: number;
	}

	let {
		count = 80,
		zIndex = 50,
		enabled = true,
		opacity = { min: 0.5, max: 0.9 },
		fallDuration = { min: 12, max: 20 },
		driftRange = 80,
		spawnDelay = 15
	}: Props = $props();

	// Petals fall gently and drift more than snow
	const FALL_DISTANCE = { min: 100, max: 130 } as const;

	// Reduce petal count for reduced motion
	const actualCount = prefersReducedMotion ? Math.floor(count / 4) : count;

	// Variant distribution - more round and heart shapes for cherry blossoms
	const petalVariants: PetalVariant[] = ['round', 'round', 'pointed', 'heart', 'curled', 'tiny'];

	interface Petal {
		id: number;
		x: number;
		y: number;
		size: number;
		variant: PetalVariant;
		duration: number;
		delay: number;
		drift: number;
		opacity: number;
		fallDistance: number;
	}

	// Deterministic hash for natural distribution
	function hashRandom(seed: number): number {
		const hash = Math.abs(Math.sin(seed * 12.9898) * 43758.5453);
		return hash - Math.floor(hash);
	}

	// Generate petals across the viewport
	function generatePetals(): Petal[] {
		const petals: Petal[] = [];

		for (let i = 0; i < actualCount; i++) {
			// Different seed multipliers for varied distributions
			const xRand = hashRandom(i * 7);
			const yRand = hashRandom(i * 11);
			const depthRand = hashRandom(i * 13);
			const durationRand = hashRandom(i * 17);
			const delayRand = hashRandom(i * 19);
			const driftRand = hashRandom(i * 23);
			const distanceRand = hashRandom(i * 29);
			const variantRand = hashRandom(i * 31);

			// Distribute across full width
			const x = (i / actualCount) * 100 + (xRand - 0.5) * 15;

			// Start positions: mix above and within viewport
			const y = yRand < 0.4
				? yRand * 60  // 40% start within viewport
				: -5 - yRand * 20; // 60% start above

			// Depth-based sizing:
			// Far petals are smaller and simpler
			// Close petals are larger and more detailed
			const depthFactor = depthRand;
			const size = 10 + depthFactor * 18; // 10-28px - petals are delicate

			// Variant based on depth
			let variant: PetalVariant;
			if (depthFactor < 0.25) {
				variant = 'tiny';
			} else {
				const variantIndex = Math.floor(variantRand * (petalVariants.length - 1));
				variant = petalVariants[variantIndex];
			}

			// Petals in viewport get minimal delay
			const isInViewport = y >= 0;
			const actualDelay = isInViewport ? delayRand * 3 : delayRand * spawnDelay;

			// Petals drift more erratically than snow - flutter in the breeze
			// Use sine wave for more organic drift pattern
			const baseDrift = (driftRand - 0.5) * driftRange;
			const driftVariation = Math.sin(i * 0.7) * 20;

			petals.push({
				id: i,
				x,
				y,
				size,
				variant,
				duration: fallDuration.min + durationRand * (fallDuration.max - fallDuration.min),
				delay: actualDelay,
				drift: baseDrift + driftVariation,
				opacity: opacity.min + depthFactor * (opacity.max - opacity.min),
				fallDistance: FALL_DISTANCE.min + distanceRand * (FALL_DISTANCE.max - FALL_DISTANCE.min)
			});
		}

		return petals;
	}

	// Generate petals once
	const petals = generatePetals();
</script>

{#if enabled}
	<!-- Falling petals layer - cherry blossoms drifting on spring breeze -->
	<div
		class="fixed inset-0 pointer-events-none overflow-hidden"
		style="z-index: {zIndex};"
		aria-hidden="true"
	>
		{#each petals as petal (petal.id)}
			<div
				class="absolute"
				style="
					left: {petal.x}%;
					top: {petal.y}%;
					width: {petal.size}px;
					height: {petal.size}px;
				"
			>
				<PetalFalling
					class="w-full h-full"
					variant={petal.variant}
					duration={petal.duration}
					delay={petal.delay}
					drift={petal.drift}
					fallDistance={petal.fallDistance}
					opacity={petal.opacity}
					seed={petal.id}
					animate={true}
				/>
			</div>
		{/each}
	</div>
{/if}
