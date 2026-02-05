<!--
  HeroCentennial — Slide 4: "Some trees outlive the people who planted them"
  Legacy — 100-year guarantee. Large TreePine, Lantern at base,
  StonePath, MushroomCluster, Stars in sky, twilight mood.
-->
<script lang="ts">
	import type { HeroSlideContentProps } from './hero-types';
	import HeroSlide from './HeroSlide.svelte';
	import { ArrowRight } from 'lucide-svelte';
	import {
		TreePine,
		Lantern,
		StonePath,
		MushroomCluster,
		Star
	} from '@autumnsgrove/groveengine/ui/nature';

	let { season, active, index }: HeroSlideContentProps = $props();
</script>

<HeroSlide {season} {active} bgVariant="twilight" ariaLabel="Some trees outlive the people who planted them — 100 year guarantee">
	{#snippet text()}
		<h2 class="text-display-sm md:text-display lg:text-display-lg text-foreground motion-safe:animate-fade-in-up">
			Some trees outlive the people who planted them.
		</h2>
		<p class="text-body-sm md:text-body text-foreground-muted motion-safe:animate-fade-in" style="animation-delay: 150ms;">
			After 12 months, your blog earns Centennial status — archived for 100 years, no matter what.
		</p>
		<a
			href="/knowledge/features/centennial"
			class="btn-primary inline-flex items-center gap-2 text-sm md:text-base px-5 py-2.5 w-fit mt-2 motion-safe:animate-bloom"
			style="animation-delay: 300ms;"
		>
			Plant Your Legacy
			<ArrowRight class="w-4 h-4" aria-hidden="true" />
		</a>
	{/snippet}

	{#snippet scene()}
		<div class="relative w-full h-full flex items-end justify-center">
			<!-- Stars in the sky -->
			<div class="absolute top-[10%] left-[20%]">
				<Star class="w-2.5 h-2.5 opacity-60" />
			</div>
			<div class="absolute top-[8%] right-[30%]">
				<Star class="w-2 h-2 opacity-40" />
			</div>
			<div class="absolute top-[18%] left-[45%] hidden md:block">
				<Star class="w-3 h-3 opacity-50" />
			</div>
			<div class="absolute top-[14%] right-[15%] hidden md:block">
				<Star class="w-2 h-2 opacity-30" />
			</div>

			<!-- Large central pine -->
			<div class="absolute bottom-[10%] left-1/2 -translate-x-1/2">
				<TreePine {season} animate={active} class="w-16 h-28 md:w-22 md:h-40" />
			</div>

			<!-- Lantern at base -->
			<div class="absolute bottom-[8%] left-[35%]">
				<Lantern animate={active} class="w-4 h-7 md:w-5 md:h-8" variant="standing" />
			</div>

			<!-- Stone path -->
			<div class="absolute bottom-[2%] left-[20%] hidden md:block">
				<StonePath class="w-28 h-6 opacity-60" />
			</div>

			<!-- Mushroom cluster -->
			<div class="absolute bottom-[6%] right-[20%]">
				<MushroomCluster class="w-8 h-6 md:w-10 md:h-8" />
			</div>
		</div>
	{/snippet}
</HeroSlide>
