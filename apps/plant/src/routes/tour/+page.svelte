<script lang="ts">
	import { GlassCard, GlassCarousel } from '@autumnsgrove/lattice/ui';
	import { stateIcons, navIcons, natureIcons, phaseIcons } from '@autumnsgrove/prism/icons';
	import { buildAdminUrl } from '$lib/tenant-url';

	let { data } = $props();

	// Tour state
	let currentStep = $state(0);
	let showSkipConfirm = $state(false);

	// Touch/swipe handling for mobile
	let touchStartX = $state(0);
	let touchEndX = $state(0);
	let isSwiping = $state(false);
	const SWIPE_THRESHOLD = 50; // Minimum swipe distance in pixels

	function handleTouchStart(e: TouchEvent) {
		touchStartX = e.touches[0].clientX;
		isSwiping = true;
	}

	function handleTouchMove(e: TouchEvent) {
		if (!isSwiping) return;
		touchEndX = e.touches[0].clientX;
	}

	function handleTouchEnd() {
		if (!isSwiping) return;
		isSwiping = false;

		const swipeDistance = touchStartX - touchEndX;

		if (Math.abs(swipeDistance) > SWIPE_THRESHOLD) {
			if (swipeDistance > 0 && currentStep < tourStops.length - 1) {
				// Swiped left → go forward
				nextStep();
			} else if (swipeDistance < 0 && currentStep > 0) {
				// Swiped right → go back
				prevStep();
			}
		}

		// Reset
		touchStartX = 0;
		touchEndX = 0;
	}

	// Tour stops configuration — `images` is empty for text-only stops (welcome/complete),
	// a single entry for a plain screenshot, or multiple entries to render as a GlassCarousel.
	const tourStops = [
		{
			id: 'welcome',
			title: 'Welcome to the Tour!',
			description: "Let's explore what Grove can do for you. We'll show you around using example blogs so you can see the possibilities.",
			location: 'intro',
			url: null,
			images: []
		},
		{
			id: 'homepage',
			title: 'Your Blog Homepage',
			description: "This is what visitors see when they arrive. Clean, focused, and beautiful by default — here's an example blog.",
			location: 'example.grove.place',
			url: 'https://example.grove.place?tour=1',
			images: [{ url: '/tour/homepage.webp', alt: 'Blog homepage' }]
		},
		{
			id: 'blog-listing',
			title: 'The Blog Page',
			description: "Every post you've published, all in one place — titles, dates, tags, and a short preview of each.",
			location: 'example.grove.place/garden',
			url: 'https://example.grove.place/garden?tour=1',
			images: [{ url: '/tour/blog-listing.webp', alt: 'Blog listing page' }]
		},
		{
			id: 'post',
			title: 'Blog Posts',
			description: "Your posts are the heart of your blog. Write in markdown, add images, and link related thoughts with margin notes.",
			location: 'example.grove.place/post/...',
			url: 'https://example.grove.place?tour=2',
			images: [
				{
					url: '/tour/post-1.webp',
					alt: 'A published blog post with a table of contents',
					caption: 'The full post — headings, pull quotes, and a table of contents for longer pieces.'
				},
				{
					url: '/tour/post-2.webp',
					alt: 'A margin note attached to a paragraph',
					caption: 'Margin notes ("Vines") add an aside without breaking the flow of the writing.'
				}
			]
		},
		{
			id: 'admin',
			title: 'Your Dashboard',
			description: "The admin panel is where you manage everything - write posts, upload media, and customize your blog.",
			location: 'your-blog.grove.place/admin',
			url: null,
			images: [
				{
					url: '/tour/admin-1.webp',
					alt: 'Opening the account menu to reach the dashboard',
					caption: 'Getting there: your account menu → Your Grove.'
				},
				{
					url: '/tour/admin-2.webp',
					alt: 'The Arbor dashboard',
					caption: 'Your dashboard — posts, tags, and quick actions in one place.'
				}
			]
		},
		{
			id: 'editor',
			title: 'The Post Editor',
			description: "Write in markdown with live preview. Add images by dragging them in. It's simple but powerful.",
			location: 'Admin → New Post',
			url: null,
			images: [
				{
					url: '/tour/editor-1.webp',
					alt: 'The markdown editor',
					caption: 'A clean writing surface — markdown in, formatted post out.'
				},
				{
					url: '/tour/editor-2.webp',
					alt: 'Post details panel with description, cover image, and tags',
					caption: 'Add a description, cover image, and tags without leaving the editor.'
				},
				{
					url: '/tour/editor-3.webp',
					alt: 'Vines panel open in the editor',
					caption: 'Vines (margin notes) attach right from the editor too.'
				}
			]
		},
		{
			id: 'lantern',
			title: 'Stay Connected',
			description: 'Add your friends on the blog page and view them from the Lantern.',
			location: 'The compass button, bottom-right',
			url: null,
			images: [
				{
					url: '/tour/lantern-1.webp',
					alt: 'Opening the Lantern from the compass button',
					caption: 'Open the Lantern from the compass button in the corner.'
				},
				{
					url: '/tour/lantern-2.webp',
					alt: 'The Lantern friends panel',
					caption: 'Add friends and jump straight to their blogs.'
				}
			]
		},
		{
			id: 'complete',
			title: "You're Ready!",
			description: 'placeholder', // Will be computed reactively
			location: 'Your blog',
			url: null,
			images: []
		}
	] as const;

	// Compute current tour stop with reactive description for final step
	const currentTourStop = $derived({
		...tourStops[currentStep],
		description: tourStops[currentStep].id === 'complete'
			? `Your blog is waiting at ${data.user?.username || 'your'}.grove.place. Time to write something beautiful.`
			: tourStops[currentStep].description
	});
	const isFirstStep = $derived(currentStep === 0);
	const isLastStep = $derived(currentStep === tourStops.length - 1);
	const progress = $derived(((currentStep + 1) / tourStops.length) * 100);

	function nextStep() {
		if (currentStep < tourStops.length - 1) {
			currentStep++;
		}
	}

	function prevStep() {
		if (currentStep > 0) {
			currentStep--;
		}
	}

	function skipTour() {
		showSkipConfirm = true;
	}

	function confirmSkip() {
		// Mark tour as skipped and redirect
		const subdomain = data.user?.username || 'example';
		window.location.href = buildAdminUrl(
			subdomain,
			new URL(window.location.href),
			'welcome=true&tour=skipped',
		);
	}

	function completeTour() {
		// Mark tour as complete and redirect
		const subdomain = data.user?.username || 'example';
		window.location.href = buildAdminUrl(
			subdomain,
			new URL(window.location.href),
			'welcome=true&tour=complete',
		);
	}

	// Keyboard navigation
	function handleKeydown(e: KeyboardEvent) {
		if (showSkipConfirm) return; // Don't navigate when modal is open

		if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
			e.preventDefault();
			nextStep();
		} else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
			e.preventDefault();
			prevStep();
		} else if (e.key === 'Escape') {
			e.preventDefault();
			if (showSkipConfirm) {
				showSkipConfirm = false;
			} else {
				skipTour();
			}
		}
	}

	$effect(() => {
		// Add keyboard listener
		window.addEventListener('keydown', handleKeydown);
		return () => window.removeEventListener('keydown', handleKeydown);
	});
</script>

<div class="animate-fade-in">
	<!-- Progress bar -->
	<div class="mb-8">
		<div class="h-1 bg-surface rounded-full overflow-hidden">
			<div
				class="h-full bg-primary transition-all duration-300"
				style="width: {progress}%"
			></div>
		</div>
		<div class="flex justify-between mt-2 text-xs text-foreground-subtle">
			<span>Step {currentStep + 1} of {tourStops.length}</span>
			<button onclick={skipTour} class="hover:text-foreground transition-colors">
				Skip tour
			</button>
		</div>
	</div>

	<!-- Tour content (touch-enabled for swipe navigation) -->
	<div
		ontouchstart={handleTouchStart}
		ontouchmove={handleTouchMove}
		ontouchend={handleTouchEnd}
		role="region"
		aria-label="Tour content - swipe left or right to navigate"
	>
	<GlassCard variant="frosted" class="max-w-2xl mx-auto">
		<!-- Header -->
		<div class="flex items-start justify-between mb-4">
			<div class="flex items-center gap-2">
				<navIcons.mapPin size={20} class="text-primary" />
				<span class="text-sm text-foreground-muted">{currentTourStop.location}</span>
			</div>
		</div>

		<!-- Title and description -->
		<h1 class="text-2xl font-medium text-foreground mb-3">
			{currentTourStop.title}
		</h1>
		<p class="text-foreground-muted mb-6">
			{currentTourStop.description}
		</p>

		<!-- Screenshots: a plain image for a single shot, a carousel when a stop needs more than one -->
		{#if currentTourStop.images.length > 1}
			<div class="mb-6">
				<GlassCarousel images={[...currentTourStop.images]} aspectRatio="4/3" variant="minimal" />
			</div>
		{:else if currentTourStop.images.length === 1}
			<div class="aspect-[4/3] rounded-lg overflow-hidden mb-6 border border-border/40">
				<img
					src={currentTourStop.images[0].url}
					alt={currentTourStop.images[0].alt}
					class="w-full h-full object-cover"
					loading="lazy"
				/>
			</div>
		{:else if currentStep === 0}
			<!-- Welcome illustration -->
			<div class="aspect-video bg-white/40 dark:bg-bark-800/20 backdrop-blur-sm rounded-lg mb-6 flex items-center justify-center border border-border/40">
				<div class="text-center">
					<natureIcons.sprout class="w-16 h-16 mx-auto mb-4 text-primary" />
					<p class="text-foreground-muted">Let's explore Grove together</p>
				</div>
			</div>
		{:else if isLastStep}
			<!-- Completion illustration -->
			<div class="aspect-video bg-white/40 dark:bg-bark-800/20 backdrop-blur-sm rounded-lg mb-6 flex items-center justify-center border border-border/40">
				<div class="text-center">
					<phaseIcons.partyPopper class="w-16 h-16 mx-auto mb-4 text-primary" />
					<p class="text-lg font-medium text-foreground mb-2">
						{data.user?.username || 'your-blog'}.grove.place
					</p>
					<p class="text-foreground-muted">Your blog is live and waiting</p>
				</div>
			</div>
		{/if}

		<!-- Navigation -->
		<div class="flex items-center justify-between pt-4 border-t border-border/40">
			<button
				onclick={prevStep}
				disabled={isFirstStep}
				class="btn-secondary"
				class:opacity-50={isFirstStep}
				class:cursor-not-allowed={isFirstStep}
			>
				<navIcons.chevronLeft size={18} />
				Back
			</button>

			<div class="flex gap-1.5 md:gap-1" role="tablist" aria-label="Tour steps">
				{#each tourStops as stop, i}
					<button
						onclick={() => (currentStep = i)}
						class="w-3 h-3 md:w-2 md:h-2 rounded-full transition-all backdrop-blur-sm {i !== currentStep ? 'bg-border/50' : ''}"
						class:bg-primary={i === currentStep}
						class:w-5={i === currentStep}
						class:md:w-4={i === currentStep}
						aria-label="Go to step {i + 1}: {stop.title}"
						aria-selected={i === currentStep}
						role="tab"
					></button>
				{/each}
			</div>

			{#if isLastStep}
				<button onclick={completeTour} class="btn-primary">
					Go to My Blog
					<navIcons.arrowRight size={18} />
				</button>
			{:else}
				<button onclick={nextStep} class="btn-primary">
					Next
					<navIcons.chevronRight size={18} />
				</button>
			{/if}
		</div>
	</GlassCard>
	</div>

	<!-- Mobile navigation hints (shown on first few steps) -->
	{#if currentStep < 3}
		<p class="text-center text-xs text-foreground-subtle mt-4 md:hidden">
			Swipe left or right to navigate
		</p>
		<p class="text-center text-xs text-foreground-subtle mt-4 hidden md:block">
			Use arrow keys to navigate
		</p>
	{/if}

	<!-- Skip confirmation modal -->
	{#if showSkipConfirm}
		<div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
			<GlassCard variant="frosted" class="max-w-sm w-full animate-slide-up">
				<div class="flex justify-between items-start mb-4">
					<h2 class="text-lg font-medium text-foreground">Skip the tour?</h2>
					<button onclick={() => (showSkipConfirm = false)} class="text-foreground-subtle hover:text-foreground">
						<stateIcons.x size={20} />
					</button>
				</div>
				<p class="text-foreground-muted mb-6">
					No problem! You can always revisit the tour from your Help menu.
				</p>
				<div class="flex gap-3">
					<button onclick={() => (showSkipConfirm = false)} class="btn-secondary flex-1">
						Continue Tour
					</button>
					<button onclick={confirmSkip} class="btn-primary flex-1">
						Skip to Blog
					</button>
				</div>
			</GlassCard>
		</div>
	{/if}
</div>
