<!--
  HeroShade — Slide 3: "Your words are not a dataset"
  AI protection — the shield. Dense canopy with 2× TreePine + TreeCherry,
  Cardinal perched, falling leaves, bushes, warm/amber mood.
-->
<script lang="ts">
	import type { HeroSlideContentProps } from './hero-types';
	import HeroSlide from './HeroSlide.svelte';
	import { Shield } from 'lucide-svelte';
	import {
		TreePine,
		TreeCherry,
		Cardinal,
		Bush,
		LeafFalling
	} from '@autumnsgrove/groveengine/ui/nature';

	let { season, active, index }: HeroSlideContentProps = $props();
</script>

<HeroSlide {season} {active} bgVariant="warm" ariaLabel="Your words are not a dataset — Shade AI protection">
	{#snippet text()}
		<h2 class="text-display-sm md:text-display lg:text-display-lg text-foreground motion-safe:animate-fade-in-up">
			Your words are not a dataset.
		</h2>
		<p class="text-body-sm md:text-body text-foreground-muted motion-safe:animate-fade-in" style="animation-delay: 150ms;">
			Shade blocks AI scrapers automatically. Your creativity stays human.
		</p>
		<a
			href="/knowledge/features/shade"
			class="btn-primary inline-flex items-center gap-2 text-sm md:text-base px-5 py-2.5 w-fit mt-2 motion-safe:animate-bloom"
			style="animation-delay: 300ms;"
		>
			Learn About Shade
			<Shield class="w-4 h-4" aria-hidden="true" />
		</a>
	{/snippet}

	{#snippet scene()}
		<div class="relative w-full h-full flex items-end justify-center">
			<!-- Dense canopy — two pines + cherry for shelter feel -->
			<div class="absolute bottom-[10%] left-[10%]">
				<TreePine {season} animate={active} class="w-14 h-24 md:w-18 md:h-32" />
			</div>
			<div class="absolute bottom-[10%] right-[10%]">
				<TreePine {season} animate={active} class="w-12 h-20 md:w-16 md:h-28 opacity-80" />
			</div>
			<div class="absolute bottom-[10%] left-1/2 -translate-x-1/2">
				<TreeCherry {season} animate={active} class="w-16 h-26 md:w-20 md:h-34" />
			</div>

			<!-- Cardinal perched -->
			<div class="absolute top-[25%] right-[22%]">
				<Cardinal animate={active} class="w-6 h-6 md:w-8 md:h-8" facing="left" />
			</div>

			<!-- Falling leaves -->
			<div class="absolute top-[15%] left-[30%]">
				<LeafFalling {season} animate={active} class="w-4 h-4" variant="maple" delay={0} />
			</div>
			<div class="absolute top-[10%] right-[35%] hidden md:block">
				<LeafFalling {season} animate={active} class="w-3 h-3" variant="cherry" delay={1.5} />
			</div>

			<!-- Ground bushes -->
			<div class="absolute bottom-[6%] left-[25%]">
				<Bush {season} class="w-12 h-8 md:w-16 md:h-10 opacity-70" />
			</div>
			<div class="absolute bottom-[4%] right-[20%] hidden md:block">
				<Bush {season} class="w-10 h-7 opacity-50" />
			</div>
		</div>
	{/snippet}
</HeroSlide>
