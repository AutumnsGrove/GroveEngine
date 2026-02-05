<!--
  HeroRefuge — Slide 1: "A grove for people who lost their groves"
  The emotional hook. Grove Logo center, TreePine + TreeCherry flanking,
  Fireflies ambient, GrassTuft + Mushroom on the ground.
-->
<script lang="ts">
	import type { HeroSlideContentProps } from './hero-types';
	import HeroSlide from './HeroSlide.svelte';
	import { Sprout } from 'lucide-svelte';
	import {
		Logo,
		TreePine,
		TreeCherry,
		Firefly,
		GrassTuft,
		Mushroom
	} from '@autumnsgrove/groveengine/ui/nature';

	let { season, active, index }: HeroSlideContentProps = $props();
</script>

<HeroSlide {season} {active} bgVariant="forest" ariaLabel="A grove for people who lost their groves">
	{#snippet text()}
		<h2 class="text-display-sm md:text-display lg:text-display-lg text-foreground motion-safe:animate-fade-in-up">
			A grove for people who lost their groves.
		</h2>
		<p class="text-body-sm md:text-body text-foreground-muted motion-safe:animate-fade-in" style="animation-delay: 150ms;">
			No ads. No algorithms. Just your words, growing in soil you own.
		</p>
		<a
			href="https://plant.grove.place"
			class="btn-primary inline-flex items-center gap-2 text-sm md:text-base px-5 py-2.5 w-fit mt-2 motion-safe:animate-bloom"
			style="animation-delay: 300ms;"
		>
			Plant Your Blog
			<Sprout class="w-4 h-4" aria-hidden="true" />
		</a>
	{/snippet}

	{#snippet scene()}
		<div class="relative w-full h-full flex items-end justify-center">
			<!-- Background trees -->
			<div class="absolute bottom-[10%] left-[8%]">
				<TreePine {season} animate={active} class="w-12 h-20 md:w-16 md:h-28 opacity-60" />
			</div>
			<div class="absolute bottom-[10%] right-[8%] hidden md:block">
				<TreeCherry {season} animate={active} class="w-14 h-22 md:w-16 md:h-28 opacity-60" />
			</div>

			<!-- Center logo -->
			<div class="absolute bottom-[25%] left-1/2 -translate-x-1/2">
				<Logo size={64} {season} />
			</div>

			<!-- Ground elements -->
			<div class="absolute bottom-[6%] left-[20%]">
				<GrassTuft class="w-8 h-4 md:w-10 md:h-5 opacity-70" />
			</div>
			<div class="absolute bottom-[4%] right-[25%]">
				<Mushroom class="w-5 h-5 md:w-6 md:h-6" />
			</div>
			<div class="absolute bottom-[6%] right-[15%] hidden md:block">
				<GrassTuft class="w-6 h-3 opacity-50" />
			</div>

			<!-- Fireflies (ambient) -->
			<div class="absolute top-[20%] left-[25%]">
				<Firefly animate={active} class="w-2.5 h-2.5" intensity="subtle" />
			</div>
			<div class="absolute top-[35%] right-[20%]">
				<Firefly animate={active} class="w-2 h-2" intensity="subtle" />
			</div>
			<div class="absolute top-[15%] right-[35%] hidden md:block">
				<Firefly animate={active} class="w-3 h-3" intensity="normal" />
			</div>
		</div>
	{/snippet}
</HeroSlide>
