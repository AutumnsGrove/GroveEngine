<script lang="ts">
	import { Header, Footer } from '@autumnsgrove/groveengine/ui/chrome';
	import SEO from '$lib/components/SEO.svelte';
	import { LogoGroveMark } from '$lib/components/logo-concepts';
</script>

<SEO
	title="The Grove Mark — Official Logo"
	description="The official Grove logo mark - a window into the grove with lantern, stars, and seasonal trees."
	url="https://grove.place/vineyard"
/>

<main class="min-h-screen flex flex-col bg-gradient-to-b from-violet-950 via-purple-950 to-indigo-950">
	<Header />

	<!-- Hero Section -->
	<section class="relative py-16 px-6 flex-1">
		<div class="max-w-4xl mx-auto text-center">
			<h1 class="text-4xl md:text-5xl font-serif text-white mb-4">
				The Grove Mark
			</h1>
			<p class="text-lg text-purple-200/80 max-w-2xl mx-auto mb-12">
				"There's a light on. Come home."
			</p>

			<!-- MASSIVE Logo Preview -->
			<div class="flex justify-center mb-16">
				<div class="p-8 rounded-3xl bg-black/20 backdrop-blur-sm border border-white/10">
					<LogoGroveMark class="w-80 h-80" title="The Grove Mark" />
				</div>
			</div>

			<!-- Size Variants -->
			<div class="flex flex-wrap justify-center items-end gap-8 mb-16">
				<div class="flex flex-col items-center gap-2">
					<LogoGroveMark class="w-24 h-24" />
					<span class="text-purple-300/60 text-sm">96px</span>
				</div>
				<div class="flex flex-col items-center gap-2">
					<LogoGroveMark class="w-16 h-16" />
					<span class="text-purple-300/60 text-sm">64px</span>
				</div>
				<div class="flex flex-col items-center gap-2">
					<LogoGroveMark class="w-12 h-12" />
					<span class="text-purple-300/60 text-sm">48px</span>
				</div>
				<div class="flex flex-col items-center gap-2">
					<LogoGroveMark class="w-8 h-8" />
					<span class="text-purple-300/60 text-sm">32px</span>
				</div>
			</div>

			<!-- Icon Inventory Table -->
			<div class="max-w-2xl mx-auto">
				<h2 class="text-2xl font-serif text-white mb-6">Icon Inventory</h2>
				<div class="rounded-xl bg-black/30 backdrop-blur-sm border border-white/10 overflow-hidden">
					<table class="w-full text-left">
						<thead>
							<tr class="border-b border-white/10">
								<th class="px-6 py-4 text-purple-200 font-medium">Icon</th>
								<th class="px-6 py-4 text-purple-200 font-medium">Source</th>
								<th class="px-6 py-4 text-purple-200 font-medium text-center">Count</th>
							</tr>
						</thead>
						<tbody class="text-purple-100/80">
							<!-- Sky Elements -->
							<tr class="border-b border-white/5">
								<td class="px-6 py-3">🌙 Moon Star</td>
								<td class="px-6 py-3 font-mono text-sm text-purple-300/60">lucide:moon-star</td>
								<td class="px-6 py-3 text-center">1</td>
							</tr>
							<tr class="border-b border-white/5">
								<td class="px-6 py-3">⭐ Star</td>
								<td class="px-6 py-3 font-mono text-sm text-purple-300/60">lucide:star</td>
								<td class="px-6 py-3 text-center">3</td>
							</tr>
							<tr class="border-b border-white/5">
								<td class="px-6 py-3">✨ Sparkles</td>
								<td class="px-6 py-3 font-mono text-sm text-purple-300/60">lucide:sparkles</td>
								<td class="px-6 py-3 text-center">2</td>
							</tr>
							<tr class="border-b border-white/5">
								<td class="px-6 py-3">✦ Sparkle</td>
								<td class="px-6 py-3 font-mono text-sm text-purple-300/60">lucide:sparkle</td>
								<td class="px-6 py-3 text-center">4</td>
							</tr>
							<!-- Lantern -->
							<tr class="border-b border-white/5">
								<td class="px-6 py-3">🏮 Lantern</td>
								<td class="px-6 py-3 font-mono text-sm text-purple-300/60">custom (v3)</td>
								<td class="px-6 py-3 text-center">1</td>
							</tr>
							<!-- Trees -->
							<tr class="border-b border-white/5">
								<td class="px-6 py-3">🌲 Tree Pine</td>
								<td class="px-6 py-3 font-mono text-sm text-purple-300/60">lucide:tree-pine</td>
								<td class="px-6 py-3 text-center">8</td>
							</tr>
							<tr class="border-b border-white/5">
								<td class="px-6 py-3">🌳 Tree Deciduous</td>
								<td class="px-6 py-3 font-mono text-sm text-purple-300/60">lucide:tree-deciduous</td>
								<td class="px-6 py-3 text-center">7</td>
							</tr>
							<!-- Middle Row -->
							<tr class="border-b border-white/5">
								<td class="px-6 py-3">🌿 Shrub</td>
								<td class="px-6 py-3 font-mono text-sm text-purple-300/60">lucide:shrub</td>
								<td class="px-6 py-3 text-center">1</td>
							</tr>
							<tr class="border-b border-white/5">
								<td class="px-6 py-3">🌲🌲 Trees</td>
								<td class="px-6 py-3 font-mono text-sm text-purple-300/60">lucide:trees</td>
								<td class="px-6 py-3 text-center">2</td>
							</tr>
							<tr class="border-b border-white/5">
								<td class="px-6 py-3">☀️ Solar Panel</td>
								<td class="px-6 py-3 font-mono text-sm text-purple-300/60">lucide:solar-panel</td>
								<td class="px-6 py-3 text-center">1</td>
							</tr>
							<tr class="border-b border-white/5">
								<td class="px-6 py-3">⛺ Tent Tree</td>
								<td class="px-6 py-3 font-mono text-sm text-purple-300/60">lucide:tent-tree</td>
								<td class="px-6 py-3 text-center">1</td>
							</tr>
						</tbody>
						<tfoot>
							<tr class="border-t border-white/10 bg-white/5">
								<td class="px-6 py-4 font-medium text-white" colspan="2">Total Icons</td>
								<td class="px-6 py-4 text-center font-bold text-white">31</td>
							</tr>
						</tfoot>
					</table>
				</div>
			</div>

			<!-- Concept Description -->
			<div class="mt-16 max-w-2xl mx-auto text-left">
				<h2 class="text-2xl font-serif text-white mb-4">About the Design</h2>
				<div class="prose prose-invert prose-purple">
					<p class="text-purple-200/80 leading-relaxed mb-4">
						The Grove Mark is a circular window into the grove. It layers three seasons of trees
						(summer greens at the top, autumn reds in the middle, spring pinks at the bottom)
						with a campsite scene featuring sustainable living icons.
					</p>
					<p class="text-purple-200/80 leading-relaxed mb-4">
						A lantern hangs in the canopy, casting a warm amber glow. Stars and sparkles
						fill the night sky. The "Grove" wordmark sits in a frosted glass pill,
						grounded in the scene.
					</p>
					<p class="text-purple-200/60 text-sm italic">
						Trees lean slightly inward — gathering around the warmth, creating shelter,
						saying "there's room for you here."
					</p>
				</div>
			</div>
		</div>
	</section>

	<Footer />
</main>
