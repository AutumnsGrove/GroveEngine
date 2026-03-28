<script lang="ts">
	import Header from "$lib/components/Header.svelte";
	import Footer from "$lib/components/Footer.svelte";
	import { GroveTerm } from "@autumnsgrove/lattice/ui";
	import SEO from "$lib/components/SEO.svelte";
	import { stateIcons, resolveAnyIcon } from "@autumnsgrove/prism/icons";
	import { Lantern } from "@autumnsgrove/lattice/ui/nature";
	import WorkshopToolCard from "./WorkshopToolCard.svelte";
	import { categories, categoryIds, tocItems, getCardClass, getToolId } from "./workshop-data";

	let { data } = $props();

	function getToolIcon(iconKey: string) {
		return resolveAnyIcon(iconKey, stateIcons.circle);
	}

	// TOC state
	let isMobileTocOpen = $state(false);
</script>

<SEO
	title="The Workshop — Grove Roadmap"
	description="Tools being built in the Grove workshop. Domain discovery, Minecraft servers, and more."
	url="/workshop"
	accentColor="f59e0b"
/>

<main class="min-h-screen flex flex-col bg-surface">
	<Header user={data.user} />

	<!-- Hero -->
	<section
		class="relative py-16 px-6 text-center overflow-hidden bg-gradient-to-b from-surface-subtle to-surface"
	>
		<!-- Lanterns -->
		<div class="absolute top-8 left-[15%] opacity-60" aria-hidden="true">
			<Lantern class="w-8 h-12" variant="hanging" lit animate />
		</div>
		<div class="absolute top-12 right-[20%] opacity-50" aria-hidden="true">
			<Lantern class="w-6 h-10" variant="hanging" lit animate />
		</div>

		<div class="max-w-3xl mx-auto relative z-10">
			<a
				href="/roadmap"
				class="inline-flex items-center gap-2 text-sm text-foreground-muted hover:text-foreground mb-6 transition-colors"
			>
				← Back to Roadmap
			</a>
			<h1 class="text-4xl md:text-5xl font-serif text-foreground mb-4">The Workshop</h1>
			<p class="text-lg text-foreground-muted max-w-xl mx-auto">
				Tools being crafted alongside <GroveTerm interactive term="your-grove">Grove</GroveTerm>. Some integrate
				directly, some stand alone—all built with the same care.
			</p>
		</div>
	</section>

	<!-- Floating TOC Icon Navigation with Tools -->
	<nav class="fixed top-1/2 right-6 -translate-y-1/2 z-grove-fab hidden lg:flex flex-col gap-3">
		{#each tocItems as item, itemIndex}
			{@const categoryTools = categories[itemIndex]?.tools ?? []}
			{@const ItemIcon = getToolIcon(item.icon)}
			<div class="relative group">
				<a
					href="#{item.id}"
					class="flex items-center justify-center w-10 h-10 rounded-full bg-surface shadow-md border border-border hover:bg-warning-bg transition-all duration-200"
					aria-label="Jump to {item.text}"
					title={item.text}
				>
					<ItemIcon class="w-5 h-5 text-warning group-hover:scale-110 transition-transform" />
				</a>

				<!-- Tools revealed on hover -->
				{#if categoryTools.length > 0}
					<div
						class="absolute right-full mr-3 top-1/2 -translate-y-1/2 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 flex items-center gap-2 flex-wrap justify-end max-w-xs"
					>
						{#each categoryTools as tool}
							{@const ToolIconComponent = getToolIcon(tool.icon)}
							<a
								href="#{getToolId(tool.name)}"
								class="flex items-center gap-1.5 px-2 py-1 rounded-lg bg-surface shadow-md border border-border text-warning hover:bg-warning-bg transition-colors whitespace-nowrap"
								title={tool.tagline}
							>
								<ToolIconComponent class="w-3.5 h-3.5" />
								<span class="text-xs font-medium">{tool.name}</span>
							</a>
						{/each}
					</div>
				{/if}
			</div>
		{/each}
	</nav>

	<!-- Floating TOC Button & Dropdown with Tools (visible on all screen sizes) -->
	<div class="fixed bottom-6 right-6 z-grove-fab">
		<button
			type="button"
			onclick={() => (isMobileTocOpen = !isMobileTocOpen)}
			class="w-12 h-12 rounded-full bg-warning text-white shadow-lg flex items-center justify-center hover:bg-warning/90 transition-colors"
			aria-expanded={isMobileTocOpen}
			aria-label="Table of contents"
		>
			<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M4 6h16M4 12h16M4 18h7"
				/>
			</svg>
		</button>

		{#if isMobileTocOpen}
			<div
				class="absolute bottom-16 right-0 w-72 bg-surface rounded-xl shadow-xl border border-border overflow-hidden max-h-[70vh] overflow-y-auto"
			>
				<div
					class="px-4 py-3 border-b border-border flex items-center justify-between sticky top-0 bg-surface"
				>
					<span class="font-medium text-foreground">Navigate</span>
					<button
						type="button"
						onclick={() => (isMobileTocOpen = false)}
						class="text-foreground-muted hover:text-foreground"
						aria-label="Close table of contents"
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M6 18L18 6M6 6l12 12"
							/>
						</svg>
					</button>
				</div>
				<div class="py-2">
					{#each tocItems as item, itemIndex}
						{@const categoryTools = categories[itemIndex]?.tools ?? []}
						{@const ItemIcon = getToolIcon(item.icon)}
						<div class="mb-2">
							<a
								href="#{item.id}"
								onclick={() => (isMobileTocOpen = false)}
								class="flex items-center gap-3 px-4 py-2 text-foreground-muted hover:text-foreground hover:bg-surface-hover transition-colors"
							>
								<ItemIcon class="w-5 h-5 text-warning" />
								<span class="font-medium">{item.text}</span>
							</a>

							<!-- Tools for this category -->
							{#if categoryTools.length > 0}
								<div class="ml-8 mt-1 space-y-1">
									{#each categoryTools as tool}
										{@const ToolIconComponent = getToolIcon(tool.icon)}
										<a
											href="#{getToolId(tool.name)}"
											onclick={() => (isMobileTocOpen = false)}
											class="flex items-center gap-2 px-4 py-1.5 text-sm text-foreground-muted hover:text-foreground hover:bg-surface-subtle transition-colors"
										>
											<ToolIconComponent class="w-4 h-4 text-warning-foreground" />
											<span>{tool.name}</span>
										</a>
									{/each}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<!-- Categories -->
	<section class="flex-1 py-12 px-6">
		<div class="max-w-5xl mx-auto space-y-16">
			{#each categories as category, index}
				<div id={categoryIds[index]}>
					<!-- Category Header -->
					<div class="mb-8">
						<h2 class="text-2xl font-serif text-foreground mb-2">{category.name}</h2>
						<p class="text-foreground-muted">{category.description}</p>
					</div>

					<!-- Tools Grid -->
					<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
						{#each category.tools as tool}
							<WorkshopToolCard {tool} cardClass={getCardClass(category.name)} />
						{/each}
					</div>
				</div>
			{/each}

			<!-- More tools coming -->
			<div
				class="text-center p-8 rounded-xl bg-warning-bg backdrop-blur-md border border-dashed border-border"
			>
				<p class="text-foreground-muted">More tools are always being dreamed up in the workshop.</p>
				<p class="text-sm text-foreground-subtle mt-2">
					Have an idea? <a href="mailto:hello@grove.place" class="text-accent hover:underline"
						>Let's talk</a
					>
				</p>
			</div>
		</div>
	</section>

	<!-- Links -->
	<section class="py-8 px-6 bg-surface border-t border-border">
		<div class="max-w-4xl mx-auto flex flex-wrap justify-center gap-4">
			<a
				href="/roadmap"
				class="px-4 py-2 rounded-lg bg-surface-subtle text-foreground-muted hover:text-foreground transition-colors"
			>
				← Main Roadmap
			</a>
			<a
				href="/beyond"
				class="px-4 py-2 rounded-lg bg-surface-subtle text-foreground-muted hover:text-foreground transition-colors"
			>
				Beyond the Grove →
			</a>
		</div>
	</section>

	<Footer />
</main>
