<!--
  SeasonSwitcher — Interactive demo showing Grove's seasonal theming.
  Visitors click season buttons to see the nature scene transform.
  Pure client-side, no API dependencies.
-->
<script lang="ts">
	import type { Season } from '@autumnsgrove/groveengine/ui/nature';
	import {
		TreePine,
		TreeCherry,
		Bush,
		GrassTuft,
		Mushroom,
		Firefly,
		Cardinal,
		Butterfly,
		Snowflake,
		Leaf,
		Fern,
		Rock
	} from '@autumnsgrove/groveengine/ui/nature';

	let season = $state<Season>('autumn');

	const seasons: { id: Season; label: string; color: string }[] = [
		{ id: 'spring', label: 'Spring', color: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' },
		{ id: 'summer', label: 'Summer', color: 'bg-amber-100 text-amber-800 hover:bg-amber-200' },
		{ id: 'autumn', label: 'Autumn', color: 'bg-orange-100 text-orange-800 hover:bg-orange-200' },
		{ id: 'winter', label: 'Winter', color: 'bg-blue-100 text-blue-800 hover:bg-blue-200' }
	];

	const bgGradients: Record<string, string> = {
		spring: 'linear-gradient(135deg, #ecfdf5 0%, #fce7f3 100%)',
		summer: 'linear-gradient(135deg, #f0fdf4 0%, #fefce8 100%)',
		autumn: 'linear-gradient(135deg, #fffbeb 0%, #fff7ed 100%)',
		winter: 'linear-gradient(135deg, #eff6ff 0%, #f1f5f9 100%)'
	};
</script>

<div class="relative w-full overflow-hidden rounded-2xl transition-all duration-700 ease-out"
	style="background: {bgGradients[season]};"
>
	<!-- Scene container -->
	<div class="relative w-full h-[280px] sm:h-[320px] md:h-[360px]">

		<!-- Far layer: Trees -->
		<div class="absolute bottom-[10%] left-[10%] md:left-[15%] transition-transform duration-500">
			<TreePine {season} animate class="w-16 h-28 md:w-20 md:h-36 opacity-70" />
		</div>
		<div class="absolute bottom-[10%] left-[35%] md:left-[40%]">
			<TreeCherry {season} animate class="w-14 h-24 md:w-18 md:h-32 opacity-60" />
		</div>
		<div class="absolute bottom-[10%] right-[10%] md:right-[15%]">
			<TreePine {season} animate class="w-18 h-32 md:w-24 md:h-44 opacity-75" />
		</div>
		<div class="absolute bottom-[10%] right-[30%] hidden md:block">
			<TreeCherry {season} animate class="w-14 h-28 opacity-50" />
		</div>

		<!-- Mid layer: Bushes & foliage -->
		<div class="absolute bottom-[6%] left-[22%]">
			<Bush {season} class="w-14 h-10 md:w-16 md:h-12 opacity-60" />
		</div>
		<div class="absolute bottom-[6%] right-[22%]">
			<Fern class="w-10 h-8 md:w-12 md:h-10 opacity-50" />
		</div>
		<div class="absolute bottom-[6%] left-[50%] -translate-x-1/2">
			<Bush {season} class="w-12 h-8 opacity-45" />
		</div>

		<!-- Ground layer -->
		<div class="absolute bottom-[3%] left-[18%]">
			<GrassTuft class="w-10 h-5 opacity-55" />
		</div>
		<div class="absolute bottom-[2%] right-[35%]">
			<Mushroom class="w-6 h-6 md:w-7 md:h-7 opacity-65" />
		</div>
		<div class="absolute bottom-[3%] left-[45%]">
			<GrassTuft class="w-8 h-4 opacity-40" />
		</div>
		<div class="absolute bottom-[2%] right-[18%]">
			<Rock class="w-8 h-5 opacity-40" />
		</div>

		<!-- Seasonal creatures -->
		{#if season === 'spring'}
			<div class="absolute top-[20%] right-[25%] motion-safe:animate-bounce" style="animation-duration: 3s;">
				<Butterfly animate class="w-6 h-6 md:w-8 md:h-8" />
			</div>
			<div class="absolute top-[35%] left-[30%] motion-safe:animate-bounce" style="animation-duration: 4s; animation-delay: 0.5s;">
				<Butterfly animate class="w-5 h-5" />
			</div>
		{:else if season === 'summer'}
			<div class="absolute top-[15%] right-[20%]">
				<Cardinal animate class="w-7 h-7 md:w-8 md:h-8" />
			</div>
			<div class="absolute top-[30%] right-[40%]">
				<Firefly animate class="w-2.5 h-2.5" intensity="subtle" />
			</div>
		{:else if season === 'autumn'}
			<div class="absolute top-[15%] left-[25%]">
				<div class="motion-safe:animate-spin" style="animation-duration: 8s;"><Leaf class="w-5 h-5 opacity-70" /></div>
			</div>
			<div class="absolute top-[25%] right-[30%]">
				<div class="motion-safe:animate-spin" style="animation-duration: 6s; animation-delay: 1s;"><Leaf class="w-4 h-4 opacity-50" /></div>
			</div>
			<div class="absolute top-[18%] right-[18%]">
				<Cardinal animate class="w-7 h-7" />
			</div>
		{:else if season === 'winter'}
			<div class="absolute top-[12%] left-[20%]">
				<Snowflake class="w-4 h-4 opacity-60 motion-safe:animate-pulse" />
			</div>
			<div class="absolute top-[25%] right-[25%]">
				<div class="motion-safe:animate-pulse" style="animation-delay: 0.5s;"><Snowflake class="w-3 h-3 opacity-40" /></div>
			</div>
			<div class="absolute top-[18%] left-[50%]">
				<div class="motion-safe:animate-pulse" style="animation-delay: 1s;"><Snowflake class="w-5 h-5 opacity-50" /></div>
			</div>
		{/if}

		<!-- Ambient fireflies (all seasons except winter) -->
		{#if season !== 'winter'}
			<div class="absolute top-[22%] left-[55%]">
				<Firefly animate class="w-2 h-2" intensity="subtle" />
			</div>
			<div class="absolute top-[40%] right-[15%]">
				<Firefly animate class="w-2.5 h-2.5" intensity="subtle" />
			</div>
		{/if}
	</div>

	<!-- Season selector buttons -->
	<div class="absolute bottom-4 left-1/2 -translate-x-1/2 z-10 flex items-center gap-2">
		{#each seasons as s}
			<button
				onclick={() => season = s.id}
				class="px-3 py-1.5 rounded-full text-xs font-sans font-medium transition-all duration-200
					{season === s.id
						? s.color + ' ring-2 ring-offset-1 ring-current shadow-sm scale-105'
						: 'bg-white/60 text-foreground-muted hover:bg-white/80 backdrop-blur-sm'}"
				aria-pressed={season === s.id}
			>
				{s.label}
			</button>
		{/each}
	</div>
</div>
