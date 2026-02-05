<!--
  HeroOwnership — Slide 2: "Your words. Your space. Forever."
  Personal space — the domain. TreeAspen growing tall, GardenGate,
  Butterfly, Fern + Bush, monospace domain display.
-->
<script lang="ts">
	import type { HeroSlideContentProps } from './hero-types';
	import HeroSlide from './HeroSlide.svelte';
	import { ArrowRight } from 'lucide-svelte';
	import {
		TreeAspen,
		GardenGate,
		Butterfly,
		Fern,
		Bush
	} from '@autumnsgrove/groveengine/ui/nature';

	let { season, active, index }: HeroSlideContentProps = $props();
</script>

<HeroSlide {season} {active} bgVariant="mist" ariaLabel="Your words, your space, forever">
	{#snippet text()}
		<h2 class="text-display-sm md:text-display lg:text-display-lg text-foreground motion-safe:animate-fade-in-up">
			Your words. Your space. Forever.
		</h2>
		<p class="text-body-sm md:text-body text-foreground-muted motion-safe:animate-fade-in" style="animation-delay: 150ms;">
			Get your own corner of the internet at
			<span class="font-mono text-accent-muted font-medium">you.grove.place</span>
		</p>
		<a
			href="/pricing"
			class="btn-primary inline-flex items-center gap-2 text-sm md:text-base px-5 py-2.5 w-fit mt-2 motion-safe:animate-bloom"
			style="animation-delay: 300ms;"
		>
			Claim Yours
			<ArrowRight class="w-4 h-4" aria-hidden="true" />
		</a>
	{/snippet}

	{#snippet scene()}
		<div class="relative w-full h-full flex items-end justify-center">
			<!-- Tall aspen -->
			<div class="absolute bottom-[10%] left-1/2 -translate-x-1/2">
				<TreeAspen {season} animate={active} class="w-14 h-28 md:w-18 md:h-36" />
			</div>

			<!-- Garden gate -->
			<div class="absolute bottom-[8%] left-[15%]">
				<GardenGate class="w-12 h-14 md:w-16 md:h-18 opacity-80" />
			</div>

			<!-- Butterfly -->
			<div class="absolute top-[30%] right-[25%]">
				<Butterfly animate={active} class="w-6 h-6 md:w-8 md:h-8" />
			</div>

			<!-- Foliage -->
			<div class="absolute bottom-[6%] right-[12%]">
				<Fern class="w-8 h-6 md:w-10 md:h-8 opacity-70" />
			</div>
			<div class="absolute bottom-[8%] left-[5%] hidden md:block">
				<Bush {season} class="w-14 h-10 opacity-60" />
			</div>
		</div>
	{/snippet}
</HeroSlide>
