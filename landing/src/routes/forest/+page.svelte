<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';

	// Tree variations with different sizes and green shades
	const greenShades = {
		darkForest: '#0d4a1c',
		deepGreen: '#166534',
		grove: '#16a34a',
		meadow: '#22c55e',
		spring: '#4ade80',
		mint: '#86efac',
		pale: '#bbf7d0'
	};

	// Tree types with different characteristics
	interface Tree {
		id: number;
		x: number;
		y: number;
		size: number;
		color: string;
		rotation?: number;
		opacity?: number;
		zIndex?: number;
	}

	// Generate forest trees with layered depth
	function generateForest(): Tree[] {
		const trees: Tree[] = [];
		let id = 0;

		// Back row (smallest, darkest, furthest away)
		const backColors = [greenShades.darkForest, greenShades.deepGreen];
		for (let i = 0; i < 12; i++) {
			trees.push({
				id: id++,
				x: 5 + (i * 8) + (Math.random() * 4 - 2),
				y: 8 + (Math.random() * 4),
				size: 28 + Math.random() * 12,
				color: backColors[Math.floor(Math.random() * backColors.length)],
				rotation: Math.random() * 6 - 3,
				opacity: 0.7 + Math.random() * 0.2,
				zIndex: 1
			});
		}

		// Middle-back row
		const midBackColors = [greenShades.deepGreen, greenShades.grove];
		for (let i = 0; i < 10; i++) {
			trees.push({
				id: id++,
				x: 2 + (i * 10) + (Math.random() * 6 - 3),
				y: 18 + (Math.random() * 6),
				size: 40 + Math.random() * 15,
				color: midBackColors[Math.floor(Math.random() * midBackColors.length)],
				rotation: Math.random() * 8 - 4,
				opacity: 0.8 + Math.random() * 0.15,
				zIndex: 2
			});
		}

		// Middle row
		const midColors = [greenShades.grove, greenShades.meadow];
		for (let i = 0; i < 8; i++) {
			trees.push({
				id: id++,
				x: 0 + (i * 13) + (Math.random() * 8 - 4),
				y: 32 + (Math.random() * 8),
				size: 55 + Math.random() * 20,
				color: midColors[Math.floor(Math.random() * midColors.length)],
				rotation: Math.random() * 10 - 5,
				opacity: 0.85 + Math.random() * 0.1,
				zIndex: 3
			});
		}

		// Middle-front row
		const midFrontColors = [greenShades.meadow, greenShades.spring];
		for (let i = 0; i < 6; i++) {
			trees.push({
				id: id++,
				x: -3 + (i * 18) + (Math.random() * 10 - 5),
				y: 48 + (Math.random() * 10),
				size: 75 + Math.random() * 25,
				color: midFrontColors[Math.floor(Math.random() * midFrontColors.length)],
				rotation: Math.random() * 12 - 6,
				opacity: 0.9 + Math.random() * 0.1,
				zIndex: 4
			});
		}

		// Front row (largest, brightest)
		const frontColors = [greenShades.spring, greenShades.mint];
		for (let i = 0; i < 4; i++) {
			trees.push({
				id: id++,
				x: -5 + (i * 28) + (Math.random() * 12 - 6),
				y: 68 + (Math.random() * 12),
				size: 100 + Math.random() * 40,
				color: frontColors[Math.floor(Math.random() * frontColors.length)],
				rotation: Math.random() * 15 - 7.5,
				opacity: 0.95,
				zIndex: 5
			});
		}

		return trees.sort((a, b) => (a.zIndex ?? 0) - (b.zIndex ?? 0));
	}

	const forestTrees = generateForest();

	// Tree path from the logo
	const treePath = "M171.274 344.942h74.09v167.296h-74.09V344.942zM0 173.468h126.068l-89.622-85.44 49.591-50.985 85.439 87.829V0h74.086v124.872L331 37.243l49.552 50.785-89.58 85.24H417v70.502H290.252l90.183 87.629L331 381.192 208.519 258.11 86.037 381.192l-49.591-49.591 90.218-87.631H0v-70.502z";
</script>

<svelte:head>
	<title>The Forest — Grove</title>
	<meta name="description" content="A forest of Grove trees, growing together." />
</svelte:head>

<main class="min-h-screen flex flex-col bg-gradient-to-b from-sky-100 via-sky-50 to-emerald-50 dark:from-slate-900 dark:via-slate-800 dark:to-emerald-950">
	<Header />

	<article class="flex-1 relative overflow-hidden">
		<!-- Sky background gradient -->
		<div class="absolute inset-0 bg-gradient-to-b from-sky-200/50 via-transparent to-transparent dark:from-sky-900/20"></div>

		<!-- Distant mountains/hills silhouette -->
		<div class="absolute inset-x-0 top-20 h-40">
			<svg class="w-full h-full" viewBox="0 0 1200 160" preserveAspectRatio="none">
				<path
					d="M0 160 L0 100 Q150 40 300 80 Q450 120 600 70 Q750 20 900 90 Q1050 140 1200 60 L1200 160 Z"
					class="fill-emerald-200/40 dark:fill-emerald-900/30"
				/>
				<path
					d="M0 160 L0 120 Q200 70 400 100 Q600 130 800 80 Q1000 50 1200 100 L1200 160 Z"
					class="fill-emerald-300/30 dark:fill-emerald-800/20"
				/>
			</svg>
		</div>

		<!-- Forest container -->
		<div class="relative w-full h-[70vh] min-h-[500px]">
			{#each forestTrees as tree (tree.id)}
				<svg
					class="absolute transform -translate-x-1/2 transition-transform duration-1000 hover:scale-110"
					style="
						left: {tree.x}%;
						top: {tree.y}%;
						width: {tree.size}px;
						height: {tree.size * 1.23}px;
						opacity: {tree.opacity};
						z-index: {tree.zIndex};
						transform: translateX(-50%) rotate({tree.rotation}deg);
						filter: drop-shadow(0 4px 6px rgba(0, 0, 0, 0.1));
					"
					viewBox="0 0 417 512.238"
					xmlns="http://www.w3.org/2000/svg"
				>
					<path d={treePath} fill={tree.color} />
				</svg>
			{/each}
		</div>

		<!-- Ground -->
		<div class="absolute bottom-0 inset-x-0 h-20 bg-gradient-to-t from-emerald-800 via-emerald-700 to-transparent dark:from-emerald-950 dark:via-emerald-900"></div>

		<!-- Content overlay -->
		<div class="absolute inset-x-0 top-8 text-center z-10 px-6">
			<h1 class="text-4xl md:text-6xl font-serif text-foreground drop-shadow-lg mb-4">
				The Grove Forest
			</h1>
			<p class="text-lg md:text-xl text-foreground-muted font-sans max-w-xl mx-auto drop-shadow">
				A community of trees, each one unique, all growing together.
			</p>
		</div>

		<!-- Color palette legend -->
		<div class="absolute bottom-24 left-1/2 transform -translate-x-1/2 z-10">
			<div class="card bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-4 rounded-xl">
				<p class="text-xs text-foreground-faint font-sans uppercase tracking-wide mb-3 text-center">Grove Green Palette</p>
				<div class="flex gap-2 items-end">
					{#each Object.entries(greenShades) as [name, color]}
						<div class="flex flex-col items-center gap-1">
							<div
								class="w-6 h-6 md:w-8 md:h-8 rounded-full shadow-sm border border-white/20"
								style="background-color: {color};"
								title={name}
							></div>
							<span class="text-[8px] md:text-[10px] text-foreground-faint font-mono hidden md:block">{name}</span>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</article>

	<Footer class="relative z-10 bg-white/80 dark:bg-slate-900/80 backdrop-blur-sm" />
</main>

<style>
	/* Gentle sway animation for trees */
	@keyframes sway {
		0%, 100% { transform: translateX(-50%) rotate(var(--rotation, 0deg)); }
		50% { transform: translateX(-50%) rotate(calc(var(--rotation, 0deg) + 2deg)); }
	}
</style>
