<script lang="ts">
	import { VineyardLayout, FeatureCard, StatusBadge } from '@autumnsgrove/groveengine/vineyard';
	import SEO from '$lib/components/SEO.svelte';

	// Lucide Icons
	import {
		Sparkles,
		TreePine as TreeIcon,
		Palette,
		Type,
		Eye,
		MousePointer
	} from 'lucide-svelte';

	// Import Glass components
	import {
		Glass,
		GlassButton,
		GlassCard,
		GlassLogo,
		GlassOverlay,
		GlassCarousel,
		GlassLegend
	} from '@autumnsgrove/groveengine/ui';

	// Import nature assets
	import {
		Logo,
		TreePine, TreeCherry, TreeAspen, TreeBirch,
		Mushroom, MushroomCluster, Fern, Bush, GrassTuft, Rock, Stump, Log,
		FlowerWild, Tulip, Crocus, Daffodil,
		Firefly, Butterfly, Bird, BirdFlying, Cardinal, Chickadee, Robin, Bluebird,
		Bee, Rabbit, Deer, Owl, Squirrel,
		Cloud, CloudWispy, Sun, Moon, Star, StarCluster, StarShooting, Rainbow,
		Pond, LilyPad, Reeds, Stream,
		Leaf, LeafFalling, PetalFalling, Acorn, PineCone, Berry, DandelionPuff, Vine,
		Lattice as LatticeStructure, LatticeWithVine, Birdhouse, GardenGate, FencePost, StonePath, Bridge, Lantern,
		greens, bark, earth, natural, autumn, pinks, autumnReds, spring, springBlossoms, winter, midnightBloom
	} from '@autumnsgrove/groveengine/ui/nature';

	// Import typography components
	import {
		FontProvider,
		Lexend, Atkinson, OpenDyslexic,
		Quicksand, PlusJakartaSans,
		IBMPlexMono, Cozette,
		Alagard, Calistoga, Caveat,
		fonts,
		type FontId,
	} from '@autumnsgrove/groveengine/ui/typography';

	// Typography state
	let selectedFont = $state<FontId>('lexend');

	// Glass component demos state
	let glassVariant = $state<'surface' | 'overlay' | 'card' | 'tint' | 'accent' | 'muted'>('card');
	let glassIntensity = $state<'none' | 'light' | 'medium' | 'strong'>('medium');
	let buttonVariant = $state<'default' | 'accent' | 'dark' | 'ghost' | 'outline'>('default');
	let buttonSize = $state<'sm' | 'md' | 'lg' | 'icon'>('md');
	let cardVariant = $state<'default' | 'accent' | 'dark' | 'muted' | 'frosted'>('default');
	let cardHoverable = $state(false);
	let logoVariant = $state<'default' | 'accent' | 'frosted' | 'dark' | 'ethereal'>('default');
	let logoSeason = $state<'spring' | 'summer' | 'autumn' | 'winter'>('summer');

	// Gossamer state
	type GossamerPreset = 'grove-mist' | 'grove-fireflies' | 'grove-rain' | 'grove-dew' | 'winter-snow' | 'autumn-leaves' | 'spring-petals' | 'summer-heat' | 'ambient-static' | 'ambient-waves' | 'ambient-clouds';
	let glassGossamerEnabled = $state(false);
	let glassGossamerPreset = $state<GossamerPreset>('grove-mist');
	let cardGossamerEnabled = $state(false);
	let cardGossamerPreset = $state<GossamerPreset>('grove-fireflies');

	const gossamerPresets = [
		'grove-mist',
		'grove-fireflies',
		'grove-rain',
		'grove-dew',
		'winter-snow',
		'autumn-leaves',
		'spring-petals',
		'summer-heat',
		'ambient-static',
		'ambient-waves',
		'ambient-clouds'
	];

	// Overlay demo state
	let showOverlayDemo = $state(false);

	// Nature asset viewer state
	import type { Component } from 'svelte';

	type AssetInfo = {
		component: Component<Record<string, unknown>>;
		category: string;
		props: string[];
	};

	// Component render error state
	let componentError = $state<string | null>(null);

	// Debounced color input state
	let colorInputTimeout: ReturnType<typeof setTimeout> | null = null;
	let pendingColorValues = $state<Record<string, string>>({});

	function debouncedColorUpdate(prop: string, value: string) {
		pendingColorValues[prop] = value;
		if (colorInputTimeout) clearTimeout(colorInputTimeout);
		colorInputTimeout = setTimeout(() => {
			if (isValidHexColor(value) || value === '') {
				propValues[prop] = value || undefined;
			}
		}, 150);
	}

	function isValidHexColor(value: string): boolean {
		return /^#[0-9A-Fa-f]{6}$/.test(value);
	}

	function getColorInputError(prop: string): string | null {
		const value = pendingColorValues[prop];
		if (!value || value === '') return null;
		if (!isValidHexColor(value)) return 'Use format: #RRGGBB';
		return null;
	}

	// Numeric prop ranges configuration
	const numericPropRanges: Record<string, { min: number; max: number; step: number }> = {
		opacity: { min: 0, max: 1, step: 0.1 },
	};

	function getNumericRange(prop: string) {
		return numericPropRanges[prop] ?? { min: 0, max: 100, step: 1 };
	}

	const assets: Record<string, AssetInfo> = {
		'Logo': { component: Logo, category: 'Trees', props: ['season', 'size', 'rotation', 'shadow', 'interactive', 'monochromeColor', 'monochromeTrunk'] },
		'GlassLogo': { component: GlassLogo, category: 'Trees', props: ['variant', 'season', 'size', 'rotation', 'shadow', 'interactive', 'accentColor', 'monochromeTrunk'] },
		'TreePine': { component: TreePine, category: 'Trees', props: ['color', 'trunkColor', 'season', 'animate'] },
		'TreeCherry': { component: TreeCherry, category: 'Trees', props: ['color', 'trunkColor', 'season', 'animate'] },
		'TreeAspen': { component: TreeAspen, category: 'Trees', props: ['color', 'trunkColor', 'season', 'animate'] },
		'TreeBirch': { component: TreeBirch, category: 'Trees', props: ['color', 'trunkColor', 'season', 'animate'] },
		'Mushroom': { component: Mushroom, category: 'Ground', props: ['capColor', 'stemColor', 'spotted'] },
		'MushroomCluster': { component: MushroomCluster, category: 'Ground', props: ['capColor', 'stemColor'] },
		'Fern': { component: Fern, category: 'Ground', props: ['color', 'season', 'animate'] },
		'Bush': { component: Bush, category: 'Ground', props: ['color', 'season', 'animate'] },
		'GrassTuft': { component: GrassTuft, category: 'Ground', props: ['color', 'season', 'animate'] },
		'Rock': { component: Rock, category: 'Ground', props: ['color', 'variant'] },
		'Stump': { component: Stump, category: 'Ground', props: ['barkColor', 'ringColor'] },
		'Log': { component: Log, category: 'Ground', props: ['barkColor'] },
		'FlowerWild': { component: FlowerWild, category: 'Ground', props: ['petalColor', 'centerColor', 'stemColor', 'animate'] },
		'Tulip': { component: Tulip, category: 'Ground', props: ['petalColor', 'stemColor', 'variant', 'animate'] },
		'Crocus': { component: Crocus, category: 'Ground', props: ['petalColor', 'centerColor', 'stemColor', 'variant', 'animate'] },
		'Daffodil': { component: Daffodil, category: 'Ground', props: ['petalColor', 'trumpetColor', 'stemColor', 'animate'] },
		'Firefly': { component: Firefly, category: 'Creatures', props: ['glowColor', 'bodyColor', 'animate', 'intensity'] },
		'Butterfly': { component: Butterfly, category: 'Creatures', props: ['wingColor', 'accentColor', 'animate'] },
		'Bird': { component: Bird, category: 'Creatures', props: ['bodyColor', 'breastColor', 'beakColor', 'animate', 'facing'] },
		'BirdFlying': { component: BirdFlying, category: 'Creatures', props: ['color', 'animate', 'facing'] },
		'Cardinal': { component: Cardinal, category: 'Creatures', props: ['bodyColor', 'maskColor', 'beakColor', 'animate', 'facing'] },
		'Chickadee': { component: Chickadee, category: 'Creatures', props: ['capColor', 'cheekColor', 'bodyColor', 'animate', 'facing'] },
		'Robin': { component: Robin, category: 'Creatures', props: ['bodyColor', 'breastColor', 'beakColor', 'animate', 'facing'] },
		'Bluebird': { component: Bluebird, category: 'Creatures', props: ['bodyColor', 'breastColor', 'beakColor', 'animate', 'facing'] },
		'Bee': { component: Bee, category: 'Creatures', props: ['bodyColor', 'stripeColor', 'animate'] },
		'Rabbit': { component: Rabbit, category: 'Creatures', props: ['furColor', 'animate', 'facing'] },
		'Deer': { component: Deer, category: 'Creatures', props: ['furColor', 'animate', 'facing'] },
		'Owl': { component: Owl, category: 'Creatures', props: ['featherColor', 'animate', 'facing'] },
		'Squirrel': { component: Squirrel, category: 'Creatures', props: ['furColor', 'animate', 'facing'] },
		'Cloud': { component: Cloud, category: 'Sky', props: ['color', 'animate', 'speed'] },
		'CloudWispy': { component: CloudWispy, category: 'Sky', props: ['color', 'animate', 'speed'] },
		'Sun': { component: Sun, category: 'Sky', props: ['color', 'rays', 'animate'] },
		'Moon': { component: Moon, category: 'Sky', props: ['color', 'phase', 'animate'] },
		'Star': { component: Star, category: 'Sky', props: ['color', 'animate', 'variant', 'speed'] },
		'StarCluster': { component: StarCluster, category: 'Sky', props: ['color', 'animate', 'density'] },
		'StarShooting': { component: StarShooting, category: 'Sky', props: ['color', 'animate', 'direction'] },
		'Rainbow': { component: Rainbow, category: 'Sky', props: ['opacity', 'animate'] },
		'Pond': { component: Pond, category: 'Water', props: ['color', 'animate'] },
		'LilyPad': { component: LilyPad, category: 'Water', props: ['padColor', 'flowerColor', 'hasFlower', 'animate'] },
		'Reeds': { component: Reeds, category: 'Water', props: ['color', 'season', 'animate', 'variant'] },
		'Stream': { component: Stream, category: 'Water', props: ['color', 'animate'] },
		'Leaf': { component: Leaf, category: 'Botanical', props: ['color', 'season', 'variant'] },
		'LeafFalling': { component: LeafFalling, category: 'Botanical', props: ['color', 'season', 'animate', 'variant'] },
		'PetalFalling': { component: PetalFalling, category: 'Botanical', props: ['color', 'variant', 'animate', 'opacity'] },
		'Acorn': { component: Acorn, category: 'Botanical', props: ['capColor', 'nutColor'] },
		'PineCone': { component: PineCone, category: 'Botanical', props: ['color'] },
		'Berry': { component: Berry, category: 'Botanical', props: ['berryColor', 'variant'] },
		'DandelionPuff': { component: DandelionPuff, category: 'Botanical', props: ['seedColor', 'animate'] },
		'Vine': { component: Vine, category: 'Botanical', props: ['color', 'season', 'animate', 'variant'] },
		'Lattice': { component: LatticeStructure, category: 'Structural', props: ['color', 'variant'] },
		'LatticeWithVine': { component: LatticeWithVine, category: 'Structural', props: ['woodColor', 'vineColor', 'season', 'hasFlowers'] },
		'Birdhouse': { component: Birdhouse, category: 'Structural', props: ['bodyColor', 'roofColor'] },
		'GardenGate': { component: GardenGate, category: 'Structural', props: ['color', 'open'] },
		'FencePost': { component: FencePost, category: 'Structural', props: ['color', 'variant'] },
		'StonePath': { component: StonePath, category: 'Structural', props: ['stoneColor'] },
		'Bridge': { component: Bridge, category: 'Structural', props: ['woodColor'] },
		'Lantern': { component: Lantern, category: 'Structural', props: ['frameColor', 'lit', 'animate', 'variant'] },
	};

	// Color presets
	const colorPresets = [
		{ name: 'Grove Green', value: greens.grove },
		{ name: 'Deep Green', value: greens.deepGreen },
		{ name: 'Meadow', value: greens.meadow },
		{ name: 'Autumn Amber', value: autumn.amber },
		{ name: 'Autumn Rust', value: autumn.rust },
		{ name: 'Gold', value: autumn.gold },
		{ name: 'Cherry Pink', value: pinks.blush },
		{ name: 'Warm Bark', value: bark.warmBark },
		{ name: 'Stone', value: earth.stone },
		{ name: 'Cream', value: natural.cream },
	];

	// Prop options
	const propOptions: Record<string, string[]> = {
		season: ['spring', 'summer', 'autumn', 'winter'],
		variant: ['default'],
		facing: ['left', 'right'],
		phase: ['full', 'waning', 'crescent', 'new'],
		speed: ['slow', 'normal', 'fast'],
		breathingSpeed: ['slow', 'normal', 'fast'],
		intensity: ['subtle', 'normal', 'bright'],
		density: ['sparse', 'normal', 'dense'],
		direction: ['left', 'right'],
	};

	const assetVariants: Record<string, string[]> = {
		'GlassLogo': ['default', 'accent', 'frosted', 'dark', 'ethereal'],
		'Rock': ['round', 'flat', 'jagged'],
		'Leaf': ['oak', 'maple', 'simple', 'aspen'],
		'LeafFalling': ['simple', 'maple'],
		'PetalFalling': ['round', 'pointed', 'heart', 'curled', 'tiny'],
		'Berry': ['cluster', 'single', 'branch'],
		'Vine': ['tendril', 'ivy', 'flowering'],
		'Reeds': ['cattail', 'grass'],
		'Star': ['twinkle', 'point', 'burst', 'classic', 'tiny'],
		'Lattice': ['trellis', 'fence', 'archway'],
		'FencePost': ['pointed', 'flat', 'round'],
		'Lantern': ['hanging', 'standing', 'post'],
		'Tulip': ['red', 'pink', 'yellow', 'purple'],
		'Crocus': ['purple', 'yellow', 'white'],
	};

	let selectedAsset = $state('Logo');
	let propValues = $state<Record<string, any>>({});

	const categories = [...new Set(Object.values(assets).map(a => a.category))];

	function getAssetsByCategory(category: string) {
		return Object.entries(assets).filter(([_, a]) => a.category === category);
	}

	function getCurrentAsset() {
		return assets[selectedAsset as keyof typeof assets];
	}

	function isColorProp(prop: string): boolean {
		return prop.toLowerCase().includes('color');
	}

	function isBooleanProp(prop: string): boolean {
		return ['animate', 'animateEntrance', 'breathing', 'spotted', 'rays', 'hasFlower', 'hasFlowers', 'lit', 'open'].includes(prop);
	}

	function hasOptions(prop: string): boolean {
		return prop in propOptions || (prop === 'variant' && selectedAsset in assetVariants);
	}

	function getOptions(prop: string): string[] {
		if (prop === 'variant' && selectedAsset in assetVariants) {
			return assetVariants[selectedAsset];
		}
		return propOptions[prop] || [];
	}

	function isNumericProp(prop: string): boolean {
		return ['opacity'].includes(prop);
	}

	function onAssetChange() {
		propValues = {};
	}

	let CurrentComponent = $derived(getCurrentAsset()?.component);

	// Carousel demo images (placeholders)
	const carouselImages = [
		{ url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" fill="%2310b981"%3E%3Crect width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="white" font-size="20"%3ESlide 1%3C/text%3E%3C/svg%3E', alt: 'Placeholder slide 1', caption: 'First slide caption' },
		{ url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" fill="%23059669"%3E%3Crect width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="white" font-size="20"%3ESlide 2%3C/text%3E%3C/svg%3E', alt: 'Placeholder slide 2', caption: 'Second slide caption' },
		{ url: 'data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300" fill="%23047857"%3E%3Crect width="400" height="300"/%3E%3Ctext x="50%25" y="50%25" text-anchor="middle" dy=".3em" fill="white" font-size="20"%3ESlide 3%3C/text%3E%3C/svg%3E', alt: 'Placeholder slide 3', caption: 'Third slide caption' },
	];
</script>

<SEO
	title="Vineyard — Lattice Asset Showcase"
	description="Explore the components and assets that Lattice provides. Glass UI components, nature SVGs, and everything you need to build beautiful Grove experiences."
	url="https://grove.place/vineyard"
/>

<!-- Note: VineyardLayout uses tool="lattice" which isn't in the predefined list, but that's ok - it falls back gracefully -->
<VineyardLayout tool="lattice" tagline="Building blocks for beautiful Grove experiences" status="ready">
	<!-- Feature Overview -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-12">
		<FeatureCard
			title="Glass Components"
			description="9 glassmorphism UI elements with blur effects"
			status="ready"
			icon="Sparkles"
		/>
		<FeatureCard
			title="Nature Assets"
			description="{Object.keys(assets).length} SVG components across {categories.length} categories"
			status="ready"
			icon="TreePine"
		/>
		<FeatureCard
			title="Typography"
			description="10 curated font families for every mood"
			status="ready"
			icon="Type"
		/>
		<FeatureCard
			title="Color Palettes"
			description="12 seasonal and nature-inspired palettes"
			status="ready"
			icon="Palette"
		/>
	</div>

	<!-- Glass Components Section -->
	<section class="mb-16">
		<h2 class="text-2xl font-semibold mb-6 flex items-center gap-3">
			<Sparkles class="w-6 h-6 text-amber-600" />
			Glass Components
		</h2>

		<div class="grid gap-6">
			<!-- Glass Base -->
			<div class="p-6 rounded-xl bg-white/50 backdrop-blur-sm border border-white/40">
				<h3 class="text-lg font-semibold mb-4 flex items-center gap-2">
					<code class="text-sm px-2 py-1 rounded bg-stone-100">&lt;Glass&gt;</code>
					<span class="text-sm font-normal text-stone-600">Base glass container</span>
				</h3>

				<div class="grid md:grid-cols-2 gap-6">
					<div class="bg-gradient-to-br from-emerald-100 to-green-100 rounded-xl p-8 flex items-center justify-center min-h-[200px]">
						<Glass
							variant={glassVariant}
							intensity={glassIntensity}
							gossamer={glassGossamerEnabled ? glassGossamerPreset : false}
							class="p-6 rounded-xl"
						>
							<p class="text-stone-800 font-medium">Glass content here</p>
							<p class="text-sm text-stone-600 mt-1">With {glassVariant} variant</p>
						</Glass>
					</div>

					<div class="space-y-4">
						<div>
							<label for="glass-variant" class="block text-sm font-medium mb-2">Variant</label>
							<select id="glass-variant" bind:value={glassVariant} class="w-full px-3 py-2 rounded-lg border bg-white">
								<option value="surface">surface</option>
								<option value="overlay">overlay</option>
								<option value="card">card</option>
								<option value="tint">tint</option>
								<option value="accent">accent</option>
								<option value="muted">muted</option>
							</select>
						</div>
						<div>
							<label for="glass-intensity" class="block text-sm font-medium mb-2">Intensity</label>
							<select id="glass-intensity" bind:value={glassIntensity} class="w-full px-3 py-2 rounded-lg border bg-white">
								<option value="none">none</option>
								<option value="light">light</option>
								<option value="medium">medium</option>
								<option value="strong">strong</option>
							</select>
						</div>
					</div>
				</div>
			</div>

			<!-- GlassButton -->
			<div class="p-6 rounded-xl bg-white/50 backdrop-blur-sm border border-white/40">
				<h3 class="text-lg font-semibold mb-4"><code class="text-sm px-2 py-1 rounded bg-stone-100">&lt;GlassButton&gt;</code></h3>
				<div class="flex flex-wrap gap-4">
					<GlassButton variant="default">Default</GlassButton>
					<GlassButton variant="accent">Accent</GlassButton>
					<GlassButton variant="dark">Dark</GlassButton>
					<GlassButton variant="ghost">Ghost</GlassButton>
					<GlassButton variant="outline">Outline</GlassButton>
				</div>
			</div>

			<!-- GlassCard, GlassLogo, GlassOverlay Demo -->
			<div class="p-6 rounded-xl bg-white/50 backdrop-blur-sm border border-white/40">
				<h3 class="text-lg font-semibold mb-4"><code class="text-sm px-2 py-1 rounded bg-stone-100">&lt;GlassCard&gt;</code>, <code class="text-sm px-2 py-1 rounded bg-stone-100">&lt;GlassLogo&gt;</code>, <code class="text-sm px-2 py-1 rounded bg-stone-100">&lt;GlassOverlay&gt;</code></h3>
				<div class="grid md:grid-cols-3 gap-4 mb-4">
					<GlassCard title="Default" hoverable>
						<p class="text-sm">A warm, inviting card.</p>
					</GlassCard>
					<GlassCard title="Accent" variant="accent" hoverable>
						<p class="text-sm">With grove accent tones.</p>
					</GlassCard>
					<GlassCard title="Frosted" variant="frosted" hoverable>
						<p class="text-sm">Maximum frost effect.</p>
					</GlassCard>
				</div>
				<GlassButton onclick={() => showOverlayDemo = true}>
					<Eye class="w-4 h-4" />
					Show Overlay Demo
				</GlassButton>
			</div>

			<!-- GlassCarousel -->
			<div class="p-6 rounded-xl bg-white/50 backdrop-blur-sm border border-white/40">
				<h3 class="text-lg font-semibold mb-4"><code class="text-sm px-2 py-1 rounded bg-stone-100">&lt;GlassCarousel&gt;</code></h3>
				<div class="max-w-md mx-auto">
					<GlassCarousel images={carouselImages} variant="frosted" />
				</div>
			</div>
		</div>
	</section>

	<!-- Nature Assets Section -->
	<section class="mb-16">
		<h2 class="text-2xl font-semibold mb-6 flex items-center gap-3">
			<TreeIcon class="w-6 h-6 text-emerald-600" />
			Nature Assets ({Object.keys(assets).length} Components)
		</h2>

		<div class="p-6 rounded-xl bg-white/50 backdrop-blur-sm border border-white/40">
			<div class="grid md:grid-cols-2 gap-8">
				<!-- Preview Panel -->
				<div>
					<div class="bg-gradient-to-b from-sky-100 to-emerald-50 rounded-xl p-8 flex items-center justify-center min-h-[300px] border">
						{#if CurrentComponent}
							{#key selectedAsset + JSON.stringify(propValues)}
								<svelte:boundary onerror={(e) => { componentError = e instanceof Error ? e.message : String(e); }}>
									<CurrentComponent class="w-32 h-32" {...propValues} />
									{#snippet failed()}
										<div class="text-center text-red-500">
											<p class="text-sm font-medium">Component error</p>
											<p class="text-xs mt-1 opacity-75">{componentError ?? 'Failed to render'}</p>
										</div>
									{/snippet}
								</svelte:boundary>
							{/key}
						{/if}
					</div>
					<p class="text-center mt-4 text-stone-600 font-mono text-sm">
						&lt;{selectedAsset} /&gt;
					</p>
				</div>

				<!-- Controls Panel -->
				<div class="space-y-6">
					<div>
						<label for="asset-selector" class="block text-sm font-medium mb-2">Select Asset</label>
						<select
							id="asset-selector"
							bind:value={selectedAsset}
							onchange={onAssetChange}
							class="w-full px-4 py-2 rounded-lg border bg-white"
						>
							{#each categories as category}
								<optgroup label={category}>
									{#each getAssetsByCategory(category) as [name, _]}
										<option value={name}>{name}</option>
									{/each}
								</optgroup>
							{/each}
						</select>
					</div>

					<!-- Props Controls -->
					{#if getCurrentAsset()}
						<div class="space-y-4 max-h-[400px] overflow-y-auto pr-2">
							<h4 class="text-sm font-medium uppercase tracking-wide">Properties</h4>

							{#each getCurrentAsset().props as prop}
								<div class="space-y-2">
									<label for="prop-{prop}" class="block text-sm font-medium">{prop}</label>

									{#if isColorProp(prop)}
										{@const colorError = getColorInputError(prop)}
										<div class="space-y-2">
											<div class="flex gap-2 items-center">
												<input
													id="prop-{prop}"
													type="color"
													value={propValues[prop] ?? '#16a34a'}
													oninput={(e) => propValues[prop] = e.currentTarget.value}
													class="w-10 h-10 rounded cursor-pointer border"
												/>
												<input
													type="text"
													value={pendingColorValues[prop] ?? propValues[prop] ?? ''}
													oninput={(e) => debouncedColorUpdate(prop, e.currentTarget.value)}
													placeholder="#16a34a"
													class="flex-1 px-3 py-2 rounded-lg border bg-white font-mono text-sm {colorError ? 'border-red-400' : ''}"
												/>
											</div>
											{#if colorError}
												<p class="text-xs text-red-500">{colorError}</p>
											{/if}
											<div class="flex flex-wrap gap-1">
												{#each colorPresets as preset}
													<button
														type="button"
														onclick={() => { propValues[prop] = preset.value; pendingColorValues[prop] = preset.value; }}
														class="w-6 h-6 rounded-full border-2 border-white shadow-sm hover:scale-110 transition-transform"
														style="background-color: {preset.value}"
														title={preset.name}
													></button>
												{/each}
											</div>
										</div>
									{:else if isBooleanProp(prop)}
										<label class="flex items-center gap-3 cursor-pointer">
											<input type="checkbox" bind:checked={propValues[prop]} class="w-5 h-5 rounded" />
											<span class="text-sm">{propValues[prop] !== false ? 'Enabled' : 'Disabled'}</span>
										</label>
									{:else if hasOptions(prop)}
										<select
											id="prop-{prop}"
											bind:value={propValues[prop]}
											class="w-full px-3 py-2 rounded-lg border bg-white text-sm"
										>
											<option value={undefined}>Default</option>
											{#each getOptions(prop) as option}
												<option value={option}>{option}</option>
											{/each}
										</select>
									{:else if isNumericProp(prop)}
										{@const range = getNumericRange(prop)}
										<div class="space-y-1">
											<input
												id="prop-{prop}"
												type="range"
												min={range.min}
												max={range.max}
												step={range.step}
												bind:value={propValues[prop]}
												class="w-full"
											/>
											<div class="flex justify-between text-xs text-stone-500">
												<span>{range.min}</span>
												<span class="font-medium">{propValues[prop]?.toFixed(range.step < 1 ? 1 : 0) ?? 'default'}</span>
												<span>{range.max}</span>
											</div>
										</div>
									{:else}
										<input
											id="prop-{prop}"
											type="text"
											bind:value={propValues[prop]}
											placeholder="Default"
											class="w-full px-3 py-2 rounded-lg border bg-white text-sm"
										/>
									{/if}
								</div>
							{/each}
						</div>
					{/if}

					<button
						type="button"
						onclick={() => propValues = {}}
						class="w-full px-4 py-2 rounded-lg border text-sm hover:bg-stone-50 transition-colors"
					>
						Reset to Defaults
					</button>
				</div>
			</div>
		</div>
	</section>

	<!-- Typography Section -->
	<section class="mb-16">
		<h2 class="text-2xl font-semibold mb-6 flex items-center gap-3">
			<Type class="w-6 h-6 text-purple-600" />
			Typography (10 Fonts)
		</h2>

		<div class="space-y-6">
			<!-- FontProvider -->
			<div class="p-6 rounded-xl bg-white/50 backdrop-blur-sm border border-white/40">
				<h3 class="text-lg font-semibold mb-4"><code class="text-sm px-2 py-1 rounded bg-stone-100">&lt;FontProvider&gt;</code></h3>
				<div class="space-y-4">
					<div class="flex flex-wrap gap-2">
						{#each fonts as f}
							<button
								class="px-2 py-1 text-xs rounded transition-colors {selectedFont === f.id ? 'bg-purple-600 text-white' : 'bg-stone-100 hover:bg-stone-200'}"
								onclick={() => selectedFont = f.id as FontId}
							>{f.name}</button>
						{/each}
					</div>
					<div class="p-6 bg-white/60 rounded-lg border">
						<FontProvider font={selectedFont} as="p" class="text-2xl">
							The quick brown fox jumps over the lazy dog.
						</FontProvider>
						<p class="text-sm text-stone-600 mt-2">
							{fonts.find(f => f.id === selectedFont)?.description}
						</p>
					</div>
				</div>
			</div>

			<!-- Display Fonts -->
			<div class="p-6 rounded-xl bg-white/50 backdrop-blur-sm border border-white/40">
				<h4 class="font-semibold mb-4">Display Fonts</h4>
				<div class="space-y-4">
					<div class="p-4 bg-gradient-to-r from-purple-100 to-pink-100 rounded-lg">
						<Alagard as="h3" class="text-2xl text-purple-900 mb-2">
							Welcome to the Fantasy Realm
						</Alagard>
						<p class="text-sm text-purple-700">Alagard - pixel art medieval display font</p>
					</div>
					<div class="p-4 bg-gradient-to-r from-amber-50 to-orange-50 rounded-lg">
						<Calistoga as="h3" class="text-2xl text-amber-900 mb-2">
							Friendly Headlines Welcome You
						</Calistoga>
						<p class="text-sm text-amber-700">Calistoga - casual brush serif</p>
					</div>
				</div>
			</div>
		</div>
	</section>

	<!-- Color Palettes Section -->
	<section class="mb-16">
		<h2 class="text-2xl font-semibold mb-6 flex items-center gap-3">
			<Palette class="w-6 h-6 text-pink-600" />
			Color Palettes
		</h2>

		<div class="grid gap-6">
			<!-- Spring Growth -->
			<div class="p-4 rounded-xl bg-white/40 backdrop-blur-sm border border-white/60">
				<h3 class="text-sm font-medium uppercase tracking-wide mb-3">Spring Growth</h3>
				<div class="flex flex-wrap gap-2">
					{#each Object.entries(spring) as [name, color]}
						<div class="flex flex-col items-center gap-1">
							<div
								class="w-8 h-8 rounded-lg shadow-sm border border-black/10"
								style="background-color: {color};"
								title={name}
							></div>
							<span class="text-xs text-stone-500">{name}</span>
						</div>
					{/each}
				</div>
			</div>

			<!-- Summer Greens -->
			<div class="p-4 rounded-xl bg-white/40 backdrop-blur-sm border border-white/60">
				<h3 class="text-sm font-medium uppercase tracking-wide mb-3">Summer Greens</h3>
				<div class="flex flex-wrap gap-2">
					{#each Object.entries(greens) as [name, color]}
						<div class="flex flex-col items-center gap-1">
							<div
								class="w-8 h-8 rounded-lg shadow-sm border border-black/10"
								style="background-color: {color};"
								title={name}
							></div>
							<span class="text-xs text-stone-500">{name}</span>
						</div>
					{/each}
				</div>
			</div>

			<!-- Autumn Colors -->
			<div class="p-4 rounded-xl bg-white/40 backdrop-blur-sm border border-white/60">
				<h3 class="text-sm font-medium uppercase tracking-wide mb-3">Autumn Colors</h3>
				<div class="flex flex-wrap gap-2">
					{#each Object.entries(autumn) as [name, color]}
						<div class="flex flex-col items-center gap-1">
							<div
								class="w-8 h-8 rounded-lg shadow-sm border border-black/10"
								style="background-color: {color};"
								title={name}
							></div>
							<span class="text-xs text-stone-500">{name}</span>
						</div>
					{/each}
				</div>
			</div>

			<!-- More palettes... showing just a few for brevity -->
			<div class="p-4 rounded-xl bg-white/40 backdrop-blur-sm border border-white/60">
				<h3 class="text-sm font-medium uppercase tracking-wide mb-3">Midnight Bloom</h3>
				<div class="flex flex-wrap gap-2">
					{#each Object.entries(midnightBloom) as [name, color]}
						<div class="flex flex-col items-center gap-1">
							<div
								class="w-8 h-8 rounded-lg shadow-sm border border-black/10"
								style="background-color: {color};"
								title={name}
							></div>
							<span class="text-xs text-stone-500">{name}</span>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</section>
</VineyardLayout>

<!-- Overlay Demo -->
{#if showOverlayDemo}
	<GlassOverlay onclick={() => showOverlayDemo = false}>
		<div class="flex items-center justify-center h-full">
			<GlassCard variant="frosted" class="max-w-sm mx-4" title="Overlay Demo">
				<p>Click anywhere on the backdrop to close this overlay.</p>
				<div class="mt-4">
					<GlassButton variant="accent" onclick={() => showOverlayDemo = false}>Close</GlassButton>
				</div>
			</GlassCard>
		</div>
	</GlassOverlay>
{/if}
