<!--
  HeroSlide — Shared wrapper for hero carousel content slides.
  Handles layout grid, background gradient, Lexend typography, entrance
  animations (motion-safe gated), and semantic HTML for accessibility.
-->
<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { Season } from '@autumnsgrove/groveengine/ui/nature';
	import { getGradientClasses, type BgVariant } from './hero-types';
	import { Lexend } from '@autumnsgrove/groveengine/ui/typography';

	interface Props {
		season: Season;
		active: boolean;
		bgVariant?: BgVariant;
		ariaLabel: string;
		text: Snippet;
		scene: Snippet;
	}

	let {
		season,
		active,
		bgVariant = 'forest',
		ariaLabel,
		text,
		scene
	}: Props = $props();

	const gradientClass = $derived(getGradientClasses(bgVariant));
</script>

<div
	role="group"
	aria-roledescription="slide"
	aria-label={ariaLabel}
	class="relative w-full h-full overflow-hidden bg-gradient-to-br {gradientClass}"
>
	<!-- Mobile: stacked (scene top 40%, text bottom 60%). Desktop: two columns 55/45 -->
	<div class="grid grid-rows-[40%_60%] md:grid-rows-none md:grid-cols-[55%_45%] w-full h-full">
		<!-- Text column -->
		<div class="order-2 md:order-1 flex flex-col justify-center px-5 py-3 md:px-8 md:py-6 lg:px-10">
			<Lexend as="div" class="flex flex-col gap-2 md:gap-3">
				{@render text()}
			</Lexend>
		</div>

		<!-- Scene column -->
		<div class="order-1 md:order-2 relative overflow-hidden" aria-hidden="true">
			{@render scene()}
		</div>
	</div>
</div>
