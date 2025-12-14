<script lang="ts">
	import Header from '$lib/components/Header.svelte';
	import Footer from '$lib/components/Footer.svelte';
</script>

<svelte:head>
	<title>Credits — Grove</title>
	<meta name="description" content="The people, projects, and tools that make Grove possible." />
</svelte:head>

<main class="min-h-screen flex flex-col">
	<Header />

	<!-- Content -->
	<article class="flex-1 px-6 py-12">
		<div class="max-w-3xl mx-auto">
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
				Grove is built on the shoulders of incredible open source projects and thoughtful design work.
				This page exists to honor and thank the creators whose work makes ours possible.
			</p>

			<!-- AI Coding Tools -->
			<section class="mb-12">
				<h2 class="text-2xl font-serif text-foreground mb-2">AI Coding Assistants</h2>
				<p class="text-foreground-subtle font-sans text-sm mb-6">
					The AI tools that helped write and refine Grove's code.
				</p>

				<div class="grid gap-4">
					<div class="card p-5">
						<div class="flex items-start justify-between gap-4">
							<div>
								<h3 class="text-lg font-serif text-foreground mb-1">Claude Code</h3>
								<p class="text-foreground-subtle font-sans text-sm mb-2">by Anthropic</p>
								<p class="text-foreground-muted font-sans text-sm">
									Primary development tool. Used with Claude Haiku, Sonnet, and Opus 4.5 models—primarily Opus for complex architectural decisions and implementation.
								</p>
							</div>
						</div>
						<a href="https://claude.ai/code" target="_blank" rel="noopener noreferrer" class="text-accent-muted text-sm font-sans hover:underline mt-3 inline-block">
							claude.ai/code →
						</a>
					</div>

					<div class="card p-5">
						<div class="flex items-start justify-between gap-4">
							<div>
								<h3 class="text-lg font-serif text-foreground mb-1">Kilo Code</h3>
								<p class="text-foreground-subtle font-sans text-sm mb-2">VS Code Extension</p>
								<p class="text-foreground-muted font-sans text-sm">
									Secondary development tool. Used with DeepSeek V3.2 and Kimi K2 (0905 and thinking models) for additional perspectives and rapid iteration.
								</p>
							</div>
						</div>
						<a href="https://kilocode.ai" target="_blank" rel="noopener noreferrer" class="text-accent-muted text-sm font-sans hover:underline mt-3 inline-block">
							kilocode.ai →
						</a>
					</div>
				</div>
			</section>

			<!-- Tech Stack -->
			<section class="mb-12">
				<h2 class="text-2xl font-serif text-foreground mb-2">Tech Stack</h2>
				<p class="text-foreground-subtle font-sans text-sm mb-6">
					The core technologies powering Grove.
				</p>

				<div class="grid gap-4">
					<div class="card p-5">
						<h3 class="text-lg font-serif text-foreground mb-1">SvelteKit</h3>
						<p class="text-foreground-muted font-sans text-sm">
							Full-stack framework for building fast, modern web applications. The foundation of Grove's frontend and server-side rendering.
						</p>
						<a href="https://kit.svelte.dev" target="_blank" rel="noopener noreferrer" class="text-accent-muted text-sm font-sans hover:underline mt-2 inline-block">
							kit.svelte.dev →
						</a>
					</div>

					<div class="card p-5">
						<h3 class="text-lg font-serif text-foreground mb-1">Cloudflare</h3>
						<p class="text-foreground-muted font-sans text-sm">
							Edge computing platform. Grove runs on Workers, stores data in D1 (SQLite), caches with KV, and hosts media on R2.
						</p>
						<a href="https://developers.cloudflare.com" target="_blank" rel="noopener noreferrer" class="text-accent-muted text-sm font-sans hover:underline mt-2 inline-block">
							developers.cloudflare.com →
						</a>
					</div>

					<div class="card p-5">
						<h3 class="text-lg font-serif text-foreground mb-1">Tailwind CSS</h3>
						<p class="text-foreground-muted font-sans text-sm">
							Utility-first CSS framework. Enables rapid, consistent styling across the entire platform.
						</p>
						<a href="https://tailwindcss.com" target="_blank" rel="noopener noreferrer" class="text-accent-muted text-sm font-sans hover:underline mt-2 inline-block">
							tailwindcss.com →
						</a>
					</div>

					<div class="card p-5">
						<h3 class="text-lg font-serif text-foreground mb-1">Stripe</h3>
						<p class="text-foreground-muted font-sans text-sm">
							Payment processing. Handles subscriptions, billing, and secure payment flows.
						</p>
						<a href="https://stripe.com" target="_blank" rel="noopener noreferrer" class="text-accent-muted text-sm font-sans hover:underline mt-2 inline-block">
							stripe.com →
						</a>
					</div>

					<div class="card p-5">
						<h3 class="text-lg font-serif text-foreground mb-1">Resend</h3>
						<p class="text-foreground-muted font-sans text-sm">
							Email delivery service. Powers transactional emails, magic link authentication, and notifications.
						</p>
						<a href="https://resend.com" target="_blank" rel="noopener noreferrer" class="text-accent-muted text-sm font-sans hover:underline mt-2 inline-block">
							resend.com →
						</a>
					</div>
				</div>
			</section>

			<!-- Open Source Libraries -->
			<section class="mb-12">
				<h2 class="text-2xl font-serif text-foreground mb-2">Open Source Libraries</h2>
				<p class="text-foreground-subtle font-sans text-sm mb-6">
					The packages that power Grove's features.
				</p>

				<div class="grid gap-3">
					<a href="https://github.com/markedjs/marked" target="_blank" rel="noopener noreferrer" class="card p-4 hover:border-accent transition-colors group">
						<div class="flex items-center justify-between">
							<div>
								<span class="font-serif text-foreground group-hover:text-accent-muted transition-colors">Marked</span>
								<span class="text-foreground-subtle font-sans text-sm ml-2">— Markdown parser</span>
							</div>
							<span class="text-foreground-faint text-xs font-sans">MIT</span>
						</div>
					</a>

					<a href="https://github.com/chartjs/Chart.js" target="_blank" rel="noopener noreferrer" class="card p-4 hover:border-accent transition-colors group">
						<div class="flex items-center justify-between">
							<div>
								<span class="font-serif text-foreground group-hover:text-accent-muted transition-colors">Chart.js</span>
								<span class="text-foreground-subtle font-sans text-sm ml-2">— Data visualization</span>
							</div>
							<span class="text-foreground-faint text-xs font-sans">MIT</span>
						</div>
					</a>

					<a href="https://github.com/cure53/DOMPurify" target="_blank" rel="noopener noreferrer" class="card p-4 hover:border-accent transition-colors group">
						<div class="flex items-center justify-between">
							<div>
								<span class="font-serif text-foreground group-hover:text-accent-muted transition-colors">DOMPurify</span>
								<span class="text-foreground-subtle font-sans text-sm ml-2">— HTML sanitization</span>
							</div>
							<span class="text-foreground-faint text-xs font-sans">Apache 2.0</span>
						</div>
					</a>

					<a href="https://github.com/jonschlinkert/gray-matter" target="_blank" rel="noopener noreferrer" class="card p-4 hover:border-accent transition-colors group">
						<div class="flex items-center justify-between">
							<div>
								<span class="font-serif text-foreground group-hover:text-accent-muted transition-colors">gray-matter</span>
								<span class="text-foreground-subtle font-sans text-sm ml-2">— Frontmatter parsing</span>
							</div>
							<span class="text-foreground-faint text-xs font-sans">MIT</span>
						</div>
					</a>

					<a href="https://github.com/huntabyte/bits-ui" target="_blank" rel="noopener noreferrer" class="card p-4 hover:border-accent transition-colors group">
						<div class="flex items-center justify-between">
							<div>
								<span class="font-serif text-foreground group-hover:text-accent-muted transition-colors">Bits UI</span>
								<span class="text-foreground-subtle font-sans text-sm ml-2">— Headless UI components</span>
							</div>
							<span class="text-foreground-faint text-xs font-sans">MIT</span>
						</div>
					</a>

					<a href="https://github.com/wobsoriano/svelte-sonner" target="_blank" rel="noopener noreferrer" class="card p-4 hover:border-accent transition-colors group">
						<div class="flex items-center justify-between">
							<div>
								<span class="font-serif text-foreground group-hover:text-accent-muted transition-colors">svelte-sonner</span>
								<span class="text-foreground-subtle font-sans text-sm ml-2">— Toast notifications</span>
							</div>
							<span class="text-foreground-faint text-xs font-sans">MIT</span>
						</div>
					</a>

					<a href="https://github.com/dcastil/tailwind-merge" target="_blank" rel="noopener noreferrer" class="card p-4 hover:border-accent transition-colors group">
						<div class="flex items-center justify-between">
							<div>
								<span class="font-serif text-foreground group-hover:text-accent-muted transition-colors">tailwind-merge</span>
								<span class="text-foreground-subtle font-sans text-sm ml-2">— Class merging utility</span>
							</div>
							<span class="text-foreground-faint text-xs font-sans">MIT</span>
						</div>
					</a>

					<a href="https://github.com/lukeed/clsx" target="_blank" rel="noopener noreferrer" class="card p-4 hover:border-accent transition-colors group">
						<div class="flex items-center justify-between">
							<div>
								<span class="font-serif text-foreground group-hover:text-accent-muted transition-colors">clsx</span>
								<span class="text-foreground-subtle font-sans text-sm ml-2">— Classname utility</span>
							</div>
							<span class="text-foreground-faint text-xs font-sans">MIT</span>
						</div>
					</a>
				</div>
			</section>

			<!-- Icons -->
			<section class="mb-12">
				<h2 class="text-2xl font-serif text-foreground mb-2">Icons</h2>
				<p class="text-foreground-subtle font-sans text-sm mb-6">
					The icon set used throughout Grove.
				</p>

				<div class="card p-5">
					<h3 class="text-lg font-serif text-foreground mb-1">Lucide</h3>
					<p class="text-foreground-muted font-sans text-sm">
						Beautiful, consistent icon set. Open source fork of Feather Icons with an expanded library and active community.
					</p>
					<div class="flex items-center gap-4 mt-3">
						<a href="https://lucide.dev" target="_blank" rel="noopener noreferrer" class="text-accent-muted text-sm font-sans hover:underline">
							lucide.dev →
						</a>
						<span class="text-foreground-faint text-xs font-sans">ISC License</span>
					</div>
				</div>
			</section>

			<!-- Fonts -->
			<section class="mb-12">
				<h2 class="text-2xl font-serif text-foreground mb-2">Fonts</h2>
				<p class="text-foreground-subtle font-sans text-sm mb-6">
					The typefaces available for Grove blogs. All are open source or free for use.
				</p>

				<div class="grid gap-4">
					<!-- Atkinson Hyperlegible -->
					<div class="card p-5">
						<h3 class="text-xl text-accent-muted mb-2" style="font-family: 'Atkinson Hyperlegible', sans-serif;">
							Atkinson Hyperlegible
						</h3>
						<p class="text-foreground-muted leading-relaxed mb-4" style="font-family: 'Atkinson Hyperlegible', sans-serif;">
							Designed for greater legibility and readability, especially for low vision readers. Every character is distinct and clear.
						</p>
						<div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
							<span class="text-foreground-subtle">Author</span>
							<span class="text-foreground-muted">Braille Institute of America</span>
							<span class="text-foreground-subtle">Source</span>
							<a href="https://brailleinstitute.org/freefont" target="_blank" rel="noopener noreferrer" class="text-accent-muted hover:underline">Braille Institute</a>
							<span class="text-foreground-subtle">License</span>
							<span class="text-foreground-muted">SIL Open Font License 1.1</span>
						</div>
					</div>

					<!-- OpenDyslexic -->
					<div class="card p-5">
						<h3 class="text-xl text-accent-muted mb-2" style="font-family: 'OpenDyslexic', sans-serif;">
							OpenDyslexic
						</h3>
						<p class="text-foreground-muted leading-relaxed mb-4" style="font-family: 'OpenDyslexic', sans-serif;">
							A typeface designed to mitigate some of the common reading errors caused by dyslexia. Features weighted bottoms to help indicate direction.
						</p>
						<div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
							<span class="text-foreground-subtle">Author</span>
							<span class="text-foreground-muted">Abbie Gonzalez</span>
							<span class="text-foreground-subtle">Source</span>
							<a href="https://opendyslexic.org" target="_blank" rel="noopener noreferrer" class="text-accent-muted hover:underline">OpenDyslexic.org</a>
							<span class="text-foreground-subtle">License</span>
							<span class="text-foreground-muted">SIL Open Font License</span>
						</div>
					</div>

					<!-- Lexend -->
					<div class="card p-5">
						<h3 class="text-xl text-accent-muted mb-2" style="font-family: 'Lexend', sans-serif;">
							Lexend
						</h3>
						<p class="text-foreground-muted leading-relaxed mb-4" style="font-family: 'Lexend', sans-serif;">
							A variable font designed to improve reading fluency. Research shows it can increase reading speed by up to 20% for struggling readers.
						</p>
						<div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
							<span class="text-foreground-subtle">Author</span>
							<span class="text-foreground-muted">Bonnie Shaver-Troup & Thomas Jockin</span>
							<span class="text-foreground-subtle">Source</span>
							<a href="https://www.lexend.com" target="_blank" rel="noopener noreferrer" class="text-accent-muted hover:underline">Lexend.com</a>
							<span class="text-foreground-subtle">License</span>
							<span class="text-foreground-muted">SIL Open Font License</span>
						</div>
					</div>

					<!-- Quicksand -->
					<div class="card p-5">
						<h3 class="text-xl text-accent-muted mb-2" style="font-family: 'Quicksand', sans-serif;">
							Quicksand
						</h3>
						<p class="text-foreground-muted leading-relaxed mb-4" style="font-family: 'Quicksand', sans-serif;">
							A geometric sans-serif with rounded terminals. Friendly, modern, and highly readable at any size.
						</p>
						<div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
							<span class="text-foreground-subtle">Author</span>
							<span class="text-foreground-muted">Andrew Paglinawan</span>
							<span class="text-foreground-subtle">Source</span>
							<a href="https://github.com/andrew-paglinawan/QuicksandFamily" target="_blank" rel="noopener noreferrer" class="text-accent-muted hover:underline">GitHub</a>
							<span class="text-foreground-subtle">License</span>
							<span class="text-foreground-muted">SIL Open Font License</span>
						</div>
					</div>

					<!-- Cormorant -->
					<div class="card p-5">
						<h3 class="text-xl text-accent-muted mb-2" style="font-family: 'Cormorant', serif;">
							Cormorant
						</h3>
						<p class="text-foreground-muted leading-relaxed mb-4" style="font-family: 'Cormorant', serif;">
							An elegant display serif inspired by Claude Garamond's work. Perfect for long-form reading and fantasy-themed content.
						</p>
						<div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
							<span class="text-foreground-subtle">Author</span>
							<span class="text-foreground-muted">Christian Thalmann (Catharsis Fonts)</span>
							<span class="text-foreground-subtle">Source</span>
							<a href="https://github.com/CatharsisFonts/Cormorant" target="_blank" rel="noopener noreferrer" class="text-accent-muted hover:underline">GitHub</a>
							<span class="text-foreground-subtle">License</span>
							<span class="text-foreground-muted">SIL Open Font License 1.1</span>
						</div>
					</div>

					<!-- Bodoni Moda -->
					<div class="card p-5">
						<h3 class="text-xl text-accent-muted mb-2" style="font-family: 'Bodoni Moda', serif;">
							Bodoni Moda
						</h3>
						<p class="text-foreground-muted leading-relaxed mb-4" style="font-family: 'Bodoni Moda', serif;">
							A high-contrast display serif inspired by Giambattista Bodoni's work. Features dramatic thick-thin strokes for elegant, sophisticated headings.
						</p>
						<div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
							<span class="text-foreground-subtle">Author</span>
							<span class="text-foreground-muted">Owen Earl (Indestructible Type)</span>
							<span class="text-foreground-subtle">Source</span>
							<a href="https://github.com/indestructible-type/Bodoni" target="_blank" rel="noopener noreferrer" class="text-accent-muted hover:underline">GitHub</a>
							<span class="text-foreground-subtle">License</span>
							<span class="text-foreground-muted">SIL Open Font License 1.1</span>
						</div>
					</div>

					<!-- IBM Plex Mono -->
					<div class="card p-5">
						<h3 class="text-xl text-accent-muted mb-2" style="font-family: 'IBM Plex Mono', monospace;">
							IBM Plex Mono
						</h3>
						<p class="text-foreground-muted leading-relaxed mb-4" style="font-family: 'IBM Plex Mono', monospace;">
							IBM's open-source monospace typeface designed for technical content and coding. Clean lines with excellent legibility at all sizes.
						</p>
						<div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
							<span class="text-foreground-subtle">Author</span>
							<span class="text-foreground-muted">IBM</span>
							<span class="text-foreground-subtle">Source</span>
							<a href="https://github.com/IBM/plex" target="_blank" rel="noopener noreferrer" class="text-accent-muted hover:underline">GitHub</a>
							<span class="text-foreground-subtle">License</span>
							<span class="text-foreground-muted">SIL Open Font License 1.1</span>
						</div>
					</div>

					<!-- Cozette -->
					<div class="card p-5">
						<h3 class="text-xl text-accent-muted mb-2" style="font-family: 'Cozette', monospace;">
							Cozette
						</h3>
						<p class="text-foreground-muted leading-relaxed mb-4" style="font-family: 'Cozette', monospace;">
							A bitmap programming font with excellent readability at small sizes. Perfect for that retro terminal aesthetic.
						</p>
						<div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
							<span class="text-foreground-subtle">Author</span>
							<span class="text-foreground-muted">slavfox</span>
							<span class="text-foreground-subtle">Source</span>
							<a href="https://github.com/slavfox/Cozette" target="_blank" rel="noopener noreferrer" class="text-accent-muted hover:underline">GitHub</a>
							<span class="text-foreground-subtle">License</span>
							<span class="text-foreground-muted">MIT License</span>
						</div>
					</div>

					<!-- Alagard -->
					<div class="card p-5">
						<h3 class="text-2xl text-accent-muted mb-2" style="font-family: 'Alagard', fantasy;">
							Alagard
						</h3>
						<p class="text-foreground-muted leading-relaxed mb-4" style="font-family: 'Alagard', fantasy; font-size: 1.1rem;">
							A medieval-style pixel font perfect for fantasy and game-inspired designs. Adventure awaits.
						</p>
						<div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
							<span class="text-foreground-subtle">Author</span>
							<span class="text-foreground-muted">Hewett Tsoi</span>
							<span class="text-foreground-subtle">Source</span>
							<a href="https://www.dafont.com/alagard.font" target="_blank" rel="noopener noreferrer" class="text-accent-muted hover:underline">DaFont</a>
							<span class="text-foreground-subtle">License</span>
							<span class="text-foreground-muted">Free for personal and commercial use</span>
						</div>
					</div>

					<!-- Calistoga -->
					<div class="card p-5">
						<h3 class="text-xl text-accent-muted mb-2" style="font-family: 'Calistoga', serif;">
							Calistoga
						</h3>
						<p class="text-foreground-muted leading-relaxed mb-4" style="font-family: 'Calistoga', serif;">
							A cheerful, space-saving display typeface with an adventurous spirit. Bold statements without aggression.
						</p>
						<div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
							<span class="text-foreground-subtle">Author</span>
							<span class="text-foreground-muted">Yvonne Schüttler, Eben Sorkin</span>
							<span class="text-foreground-subtle">Source</span>
							<a href="https://github.com/nickshanks/Calistoga" target="_blank" rel="noopener noreferrer" class="text-accent-muted hover:underline">GitHub</a>
							<span class="text-foreground-subtle">License</span>
							<span class="text-foreground-muted">SIL Open Font License 1.1</span>
						</div>
					</div>

					<!-- Caveat -->
					<div class="card p-5">
						<h3 class="text-2xl text-accent-muted mb-2" style="font-family: 'Caveat', cursive;">
							Caveat
						</h3>
						<p class="text-foreground-muted leading-relaxed mb-4" style="font-family: 'Caveat', cursive; font-size: 1.2rem;">
							Like a conversation written on paper by a friend. Beautiful handwriting with a carefree, personal feel.
						</p>
						<div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
							<span class="text-foreground-subtle">Author</span>
							<span class="text-foreground-muted">Pablo Impallari</span>
							<span class="text-foreground-subtle">Source</span>
							<a href="https://fonts.google.com/specimen/Caveat" target="_blank" rel="noopener noreferrer" class="text-accent-muted hover:underline">Google Fonts</a>
							<span class="text-foreground-subtle">License</span>
							<span class="text-foreground-muted">SIL Open Font License 1.1</span>
						</div>
					</div>

					<!-- Fraunces -->
					<div class="card p-5">
						<h3 class="text-xl text-accent-muted mb-2" style="font-family: 'Fraunces', serif;">
							Fraunces
						</h3>
						<p class="text-foreground-muted leading-relaxed mb-4" style="font-family: 'Fraunces', serif;">
							A variable font with organic warmth and quirky personality. The "softness" axis lets you control how fluid it feels.
						</p>
						<div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
							<span class="text-foreground-subtle">Author</span>
							<span class="text-foreground-muted">Phaedra Charles, Flavia Zimbardi (Undercase Type)</span>
							<span class="text-foreground-subtle">Source</span>
							<a href="https://github.com/undercasetype/Fraunces" target="_blank" rel="noopener noreferrer" class="text-accent-muted hover:underline">GitHub</a>
							<span class="text-foreground-subtle">License</span>
							<span class="text-foreground-muted">SIL Open Font License 1.1</span>
						</div>
					</div>

					<!-- Nunito -->
					<div class="card p-5">
						<h3 class="text-xl text-accent-muted mb-2" style="font-family: 'Nunito', sans-serif;">
							Nunito
						</h3>
						<p class="text-foreground-muted leading-relaxed mb-4" style="font-family: 'Nunito', sans-serif;">
							A rounded sans-serif that conveys warmth and approachability. Well-balanced and excellent for accessibility.
						</p>
						<div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
							<span class="text-foreground-subtle">Author</span>
							<span class="text-foreground-muted">Vernon Adams, Jacques Le Bailly</span>
							<span class="text-foreground-subtle">Source</span>
							<a href="https://fonts.google.com/specimen/Nunito" target="_blank" rel="noopener noreferrer" class="text-accent-muted hover:underline">Google Fonts</a>
							<span class="text-foreground-subtle">License</span>
							<span class="text-foreground-muted">SIL Open Font License 1.1</span>
						</div>
					</div>

					<!-- Luciole -->
					<div class="card p-5">
						<h3 class="text-xl text-accent-muted mb-2" style="font-family: 'Luciole', sans-serif;">
							Luciole
						</h3>
						<p class="text-foreground-muted leading-relaxed mb-4" style="font-family: 'Luciole', sans-serif;">
							French for "firefly." Developed specifically for visually impaired people with 12 design criteria for optimal legibility.
						</p>
						<div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
							<span class="text-foreground-subtle">Author</span>
							<span class="text-foreground-muted">typographies.fr & CTRDV</span>
							<span class="text-foreground-subtle">Source</span>
							<a href="https://www.luciole-vision.com" target="_blank" rel="noopener noreferrer" class="text-accent-muted hover:underline">Luciole Vision</a>
							<span class="text-foreground-subtle">License</span>
							<span class="text-foreground-muted">Creative Commons Attribution 4.0</span>
						</div>
					</div>

					<!-- Merriweather -->
					<div class="card p-5">
						<h3 class="text-xl text-accent-muted mb-2" style="font-family: 'Merriweather', serif;">
							Merriweather
						</h3>
						<p class="text-foreground-muted leading-relaxed mb-4" style="font-family: 'Merriweather', serif;">
							A fresh breath of air designed for digital reading. Renaissance warmth meets space-saving proportions.
						</p>
						<div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
							<span class="text-foreground-subtle">Author</span>
							<span class="text-foreground-muted">Eben Sorkin</span>
							<span class="text-foreground-subtle">Source</span>
							<a href="https://github.com/SorkinType/Merriweather" target="_blank" rel="noopener noreferrer" class="text-accent-muted hover:underline">GitHub</a>
							<span class="text-foreground-subtle">License</span>
							<span class="text-foreground-muted">SIL Open Font License 1.1</span>
						</div>
					</div>

					<!-- EB Garamond -->
					<div class="card p-5">
						<h3 class="text-xl text-accent-muted mb-2" style="font-family: 'EB Garamond', serif;">
							EB Garamond
						</h3>
						<p class="text-foreground-muted leading-relaxed mb-4" style="font-family: 'EB Garamond', serif;">
							Revival of Claude Garamont's famous 16th-century humanist typeface. Classic literary warmth for settling in with a beloved novel.
						</p>
						<div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
							<span class="text-foreground-subtle">Author</span>
							<span class="text-foreground-muted">Georg Duffner</span>
							<span class="text-foreground-subtle">Source</span>
							<a href="https://github.com/georgd/EB-Garamond" target="_blank" rel="noopener noreferrer" class="text-accent-muted hover:underline">GitHub</a>
							<span class="text-foreground-subtle">License</span>
							<span class="text-foreground-muted">SIL Open Font License 1.1</span>
						</div>
					</div>

					<!-- Lora -->
					<div class="card p-5">
						<h3 class="text-xl text-accent-muted mb-2" style="font-family: 'Lora', serif;">
							Lora
						</h3>
						<p class="text-foreground-muted leading-relaxed mb-4" style="font-family: 'Lora', serif;">
							The typographic voice of a modern-day story. Contemporary serif with roots in calligraphy for storybook-like warmth.
						</p>
						<div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
							<span class="text-foreground-subtle">Author</span>
							<span class="text-foreground-muted">Cyreal</span>
							<span class="text-foreground-subtle">Source</span>
							<a href="https://fonts.google.com/specimen/Lora" target="_blank" rel="noopener noreferrer" class="text-accent-muted hover:underline">Google Fonts</a>
							<span class="text-foreground-subtle">License</span>
							<span class="text-foreground-muted">SIL Open Font License 1.1</span>
						</div>
					</div>

					<!-- Plus Jakarta Sans -->
					<div class="card p-5">
						<h3 class="text-xl text-accent-muted mb-2" style="font-family: 'Plus Jakarta Sans', sans-serif;">
							Plus Jakarta Sans
						</h3>
						<p class="text-foreground-muted leading-relaxed mb-4" style="font-family: 'Plus Jakarta Sans', sans-serif;">
							Contemporary geometric sans with sharp curves. Designed for a city collaboration project, embodying community and cooperation.
						</p>
						<div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
							<span class="text-foreground-subtle">Author</span>
							<span class="text-foreground-muted">Gumpita Rahayu (Tokotype)</span>
							<span class="text-foreground-subtle">Source</span>
							<a href="https://fonts.google.com/specimen/Plus+Jakarta+Sans" target="_blank" rel="noopener noreferrer" class="text-accent-muted hover:underline">Google Fonts</a>
							<span class="text-foreground-subtle">License</span>
							<span class="text-foreground-muted">SIL Open Font License 1.1</span>
						</div>
					</div>

					<!-- Manrope -->
					<div class="card p-5">
						<h3 class="text-xl text-accent-muted mb-2" style="font-family: 'Manrope', sans-serif;">
							Manrope
						</h3>
						<p class="text-foreground-muted leading-relaxed mb-4" style="font-family: 'Manrope', sans-serif;">
							Geometric sans-serif that blends professional tone with friendly, modern feel. Perfect for authoritative but approachable content.
						</p>
						<div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
							<span class="text-foreground-subtle">Author</span>
							<span class="text-foreground-muted">Mikhail Sharanda</span>
							<span class="text-foreground-subtle">Source</span>
							<a href="https://fonts.google.com/specimen/Manrope" target="_blank" rel="noopener noreferrer" class="text-accent-muted hover:underline">Google Fonts</a>
							<span class="text-foreground-subtle">License</span>
							<span class="text-foreground-muted">SIL Open Font License 1.1</span>
						</div>
					</div>

					<!-- Instrument Sans -->
					<div class="card p-5">
						<h3 class="text-xl text-accent-muted mb-2" style="font-family: 'Instrument Sans', sans-serif;">
							Instrument Sans
						</h3>
						<p class="text-foreground-muted leading-relaxed mb-4" style="font-family: 'Instrument Sans', sans-serif;">
							A highly legible font with a minimalist feel. Clean, geometric, and friendly with variable weight control.
						</p>
						<div class="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
							<span class="text-foreground-subtle">Author</span>
							<span class="text-foreground-muted">Jordan Egstad and others</span>
							<span class="text-foreground-subtle">Source</span>
							<a href="https://fonts.google.com/specimen/Instrument+Sans" target="_blank" rel="noopener noreferrer" class="text-accent-muted hover:underline">Google Fonts</a>
							<span class="text-foreground-subtle">License</span>
							<span class="text-foreground-muted">SIL Open Font License 1.1</span>
						</div>
					</div>
				</div>
			</section>

			<!-- Closing -->
			<section class="text-center py-8 border-t border-default">
				<p class="text-foreground-subtle font-sans text-sm mb-4">
					Grove is open source. View the code and contribute on GitHub.
				</p>
				<a
					href="https://github.com/AutumnsGrove/GroveEngine"
					target="_blank"
					rel="noopener noreferrer"
					class="inline-flex items-center gap-2 text-accent-muted font-sans hover:underline"
				>
					<svg class="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
						<path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
					</svg>
					AutumnsGrove/GroveEngine
				</a>
			</section>
		</div>
	</article>

	<Footer />
</main>

<style>
	.bg-divider { background-color: var(--color-divider); }
</style>
