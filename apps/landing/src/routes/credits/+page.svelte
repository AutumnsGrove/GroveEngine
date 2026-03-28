<script lang="ts">
	import Header from "$lib/components/Header.svelte";
	import Footer from "$lib/components/Footer.svelte";
	import SEO from "$lib/components/SEO.svelte";
	import { chromeIcons, natureIcons, featureIcons, stateIcons, actionIcons, toolIcons, authIcons } from "@autumnsgrove/prism/icons";

	import CreditsSupporters from "./CreditsSupporters.svelte";
	import CreditsTechStack from "./CreditsTechStack.svelte";
	import CreditsLibraries from "./CreditsLibraries.svelte";
	import CreditsFonts from "./CreditsFonts.svelte";
	import CreditsProtocols from "./CreditsProtocols.svelte";

	const Heart = natureIcons.heart;
	const Cpu = toolIcons.vista;
	const Layers = featureIcons.layers;
	const Package = featureIcons.package;
	const Smile = stateIcons.smile;
	const Type = actionIcons.type;
	const Fingerprint = authIcons.fingerprint;

	let { data } = $props();

	// TOC state
	let isTocOpen = $state(false);

	// TOC items with icons for the floating nav
	const tocItems = [
		{ id: "supporters", text: "Supporters", icon: Heart },
		{ id: "ai-tools", text: "AI Tools", icon: Cpu },
		{ id: "tech-stack", text: "Tech Stack", icon: Layers },
		{ id: "libraries", text: "Libraries", icon: Package },
		{ id: "icons", text: "Icons", icon: Smile },
		{ id: "fonts", text: "Fonts", icon: Type },
		{ id: "protocols", text: "Protocols", icon: Fingerprint },
	];
</script>

<SEO
	title="Credits — Grove"
	description="The people, projects, and tools that make Grove possible."
	url="/credits"
/>

<main class="min-h-screen flex flex-col">
	<Header user={data.user} />

	<!-- Content with TOC -->
	<div class="flex-1 px-6 py-12">
		<div class="credits-layout">
			<!-- Main Content -->
			<article class="credits-content">
				<!-- Header -->
				<header class="mb-12 text-center">
					<h1 class="text-4xl md:text-5xl font-serif text-foreground mb-4">Credits</h1>
					<p class="text-lg text-foreground-subtle font-sans">
						The people, projects, and tools that make Grove possible.
					</p>
					<div class="flex items-center justify-center gap-4 mt-6">
						<div class="w-12 h-px bg-divider"></div>
						<svg class="w-4 h-4 text-accent-subtle" viewBox="0 0 20 20" fill="currentColor">
							<circle cx="10" cy="10" r="4" />
						</svg>
						<div class="w-12 h-px bg-divider"></div>
					</div>
				</header>

				<!-- Intro -->
				<p class="text-foreground-muted font-sans leading-relaxed mb-12 text-center">
					Grove is built on the shoulders of incredible open source projects, thoughtful design
					work, and most importantly—the people who believed in this vision from the start.
				</p>

				<CreditsSupporters />
				<CreditsTechStack />
				<CreditsLibraries />
				<CreditsFonts />
				<CreditsProtocols />
			</article>
		</div>
	</div>

	<!-- Floating TOC (Desktop) -->
	<nav
		class="fixed top-1/2 right-6 -translate-y-1/2 z-grove-fab hidden lg:flex flex-col gap-3"
		aria-label="Page navigation"
	>
		{#each tocItems as item}
			{@const Icon = item.icon}
			<a
				href="#{item.id}"
				class="flex items-center justify-center w-10 h-10 rounded-full bg-white dark:bg-card shadow-md border border-border hover:bg-surface-hover transition-all duration-200 group"
				aria-label="Jump to {item.text}"
				title={item.text}
			>
				<Icon class="w-5 h-5 text-warning group-hover:scale-110 transition-transform" />
			</a>
		{/each}
	</nav>

	<!-- Floating TOC Button & Dropdown (Mobile + always visible) -->
	<div class="fixed bottom-6 right-6 z-grove-fab lg:hidden">
		<button
			type="button"
			onclick={() => (isTocOpen = !isTocOpen)}
			class="w-12 h-12 rounded-full bg-warning text-white shadow-lg flex items-center justify-center hover:opacity-90 transition-colors"
			aria-expanded={isTocOpen}
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

		{#if isTocOpen}
			<div
				class="absolute bottom-16 right-0 w-56 bg-white dark:bg-card rounded-xl shadow-xl border border-border overflow-hidden"
			>
				<div class="px-4 py-3 border-b border-border flex items-center justify-between">
					<span class="font-medium text-foreground">Navigate</span>
					<button
						type="button"
						onclick={() => (isTocOpen = false)}
						class="text-foreground-muted hover:text-foreground"
						aria-label="Close"
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
					{#each tocItems as item}
						{@const Icon = item.icon}
						<a
							href="#{item.id}"
							onclick={() => (isTocOpen = false)}
							class="flex items-center gap-3 px-4 py-2 text-foreground-muted hover:text-foreground hover:bg-surface-hover transition-colors"
						>
							<Icon class="w-5 h-5 text-warning" />
							<span>{item.text}</span>
						</a>
					{/each}
				</div>
			</div>
		{/if}
	</div>

	<Footer />
</main>

<style>
	.bg-divider {
		background-color: var(--color-divider);
	}

	.credits-layout {
		max-width: 800px;
		margin: 0 auto;
	}

	.credits-content {
		max-width: 800px;
	}
</style>
