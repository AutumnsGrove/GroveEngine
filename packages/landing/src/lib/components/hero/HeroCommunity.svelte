<!--
  HeroCommunity — Slide 5: "The internet should feel like home"
  Belonging — the forest. Pond + Reeds + LilyPad, TreeBirch + TreeCherry,
  Robin, Rabbit, Lantern glowing, dawn mood.
-->
<script lang="ts">
	import type { HeroSlideContentProps } from './hero-types';
	import HeroSlide from './HeroSlide.svelte';
	import { Sprout } from 'lucide-svelte';
	import {
		TreeBirch,
		TreeCherry,
		Pond,
		Reeds,
		LilyPad,
		Robin,
		Rabbit,
		Lantern
	} from '@autumnsgrove/groveengine/ui/nature';

	let { season, active, index }: HeroSlideContentProps = $props();
</script>

<HeroSlide {season} {active} bgVariant="dawn" ariaLabel="The internet should feel like home — join the Grove community">
	{#snippet text()}
		<h2 class="text-display-sm md:text-display lg:text-display-lg text-foreground motion-safe:animate-fade-in-up">
			The internet should feel like home.
		</h2>
		<p class="text-body-sm md:text-body text-foreground-muted motion-safe:animate-fade-in" style="animation-delay: 150ms;">
			A quiet forest of writers, thinkers, and people who just want their own space.
		</p>
		<a
			href="https://plant.grove.place"
			class="btn-primary inline-flex items-center gap-2 text-sm md:text-base px-5 py-2.5 w-fit mt-2 motion-safe:animate-bloom"
			style="animation-delay: 300ms;"
		>
			Become a Seedling
			<Sprout class="w-4 h-4" aria-hidden="true" />
		</a>
	{/snippet}

	{#snippet scene()}
		<div class="relative w-full h-full flex items-end justify-center">
			<!-- Trees -->
			<div class="absolute bottom-[10%] left-[8%]">
				<TreeBirch {season} animate={active} class="w-12 h-22 md:w-16 md:h-30 opacity-70" />
			</div>
			<div class="absolute bottom-[10%] right-[8%] hidden md:block">
				<TreeCherry {season} animate={active} class="w-14 h-24 md:w-18 md:h-32 opacity-70" />
			</div>

			<!-- Pond area (centered bottom) -->
			<div class="absolute bottom-[4%] left-1/2 -translate-x-1/2">
				<Pond class="w-24 h-10 md:w-32 md:h-14" />
			</div>

			<!-- Reeds beside pond -->
			<div class="absolute bottom-[10%] left-[30%]">
				<Reeds class="w-6 h-10 md:w-8 md:h-14 opacity-70" />
			</div>

			<!-- Lily pad on pond -->
			<div class="absolute bottom-[6%] left-[52%]">
				<LilyPad class="w-5 h-3 md:w-6 md:h-4" />
			</div>

			<!-- Robin -->
			<div class="absolute top-[30%] left-[20%]">
				<Robin animate={active} class="w-5 h-5 md:w-7 md:h-7" />
			</div>

			<!-- Rabbit -->
			<div class="absolute bottom-[14%] right-[22%]">
				<Rabbit class="w-6 h-6 md:w-8 md:h-8" />
			</div>

			<!-- Lantern glowing -->
			<div class="absolute bottom-[12%] right-[38%] hidden md:block">
				<Lantern animate={active} class="w-4 h-7" variant="standing" />
			</div>
		</div>
	{/snippet}
</HeroSlide>
