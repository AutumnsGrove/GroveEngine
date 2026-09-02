<script lang="ts">
	/**
	 * GroveTourMobile — touch-oriented tour navigation.
	 *
	 * Deliberately has no swipe-to-advance and no clickable step-dots.
	 * On the desktop variant, swiping to advance the tour and swiping a
	 * nested GlassCarousel (post/admin/editor/lantern stops) both listen on
	 * touchstart/move/end, and touch events bubble — so a swipe meant for the
	 * inner gallery also advanced the whole tour a step. And the step-dots
	 * were small enough (12px, 6px gaps) that a thumb aiming for "Next" would
	 * often land on a dot instead and jump to a different step entirely.
	 * Rather than patch both interactions to coexist, mobile navigates via
	 * large Back/Next buttons only — unambiguous, and it leaves swipe
	 * gestures entirely to the nested GlassCarousel where one exists.
	 */
	import GlassCard from "../ui/GlassCard.svelte";
	import GlassCarousel from "../ui/GlassCarousel.svelte";
	import Button from "../ui/Button.svelte";
	import { stateIcons, navIcons, natureIcons, phaseIcons } from "@autumnsgrove/prism/icons";
	import { tourStops } from "./tourStops";

	interface Props {
		/** Personalizes the final step and its "go to blog" description */
		username?: string;
		/** Called when the user finishes the last step */
		onComplete: () => void;
		/** Called when the user confirms "Skip to Blog" in the skip dialog */
		onSkip: () => void;
		/** Lifted to GroveTour.svelte so switching breakpoints mid-tour doesn't reset progress */
		currentStep?: number;
		showSkipConfirm?: boolean;
	}

	let {
		username,
		onComplete,
		onSkip,
		currentStep = $bindable(0),
		showSkipConfirm = $bindable(false),
	}: Props = $props();

	// Compute current tour stop with reactive description for final step
	const currentTourStop = $derived({
		...tourStops[currentStep],
		description:
			tourStops[currentStep].id === "complete"
				? `Your blog is waiting at ${username || "your"}.grove.place. Time to write something beautiful.`
				: tourStops[currentStep].description,
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
		showSkipConfirm = false;
		onSkip();
	}
</script>

<div class="animate-fade-in">
	<!-- Progress bar -->
	<div class="mb-6">
		<div class="h-1 bg-surface rounded-full overflow-hidden">
			<div class="h-full bg-primary transition-all duration-300" style="width: {progress}%"></div>
		</div>
		<div class="flex justify-between items-center mt-2 text-xs text-foreground-subtle">
			<span>Step {currentStep + 1} of {tourStops.length}</span>
			<button onclick={skipTour} class="py-2 -my-2 hover:text-foreground transition-colors">
				Skip tour
			</button>
		</div>
	</div>

	<!-- Tour content -->
	<GlassCard variant="frosted">
		<!-- Header -->
		<div class="flex items-center gap-2 mb-4">
			<navIcons.mapPin size={20} class="text-primary shrink-0" />
			<span class="text-sm text-foreground-muted">{currentTourStop.location}</span>
		</div>

		<!-- Title and description -->
		<h1 class="text-xl font-medium text-foreground mb-3">
			{currentTourStop.title}
		</h1>
		<p class="text-foreground-muted mb-6">
			{currentTourStop.description}
		</p>

		<!-- Screenshots: a plain image for a single shot, a carousel when a stop needs more than one.
		     The nested GlassCarousel owns its own swipe/tap/arrow navigation — there's no outer
		     swipe handler here to fight it for the same gesture. -->
		{#if currentTourStop.images.length > 1}
			<div class="mb-6">
				<GlassCarousel images={[...currentTourStop.images]} aspectRatio="4/3" variant="minimal" />
			</div>
		{:else if currentTourStop.images.length === 1}
			<div
				class="rounded-lg overflow-hidden mb-6 border border-border/40"
				style="aspect-ratio: {currentTourStop.images[0].aspect ?? '4/3'}"
			>
				<img
					src={currentTourStop.images[0].url}
					alt={currentTourStop.images[0].alt}
					class="w-full h-full object-cover"
					loading="lazy"
				/>
			</div>
		{:else if currentStep === 0}
			<!-- Welcome illustration -->
			<div
				class="aspect-video bg-white/40 dark:bg-bark-800/20 backdrop-blur-sm rounded-lg mb-6 flex items-center justify-center border border-border/40"
			>
				<div class="text-center">
					<natureIcons.sprout class="w-16 h-16 mx-auto mb-4 text-primary" />
					<p class="text-foreground-muted">Let's explore Grove together</p>
				</div>
			</div>
		{:else if isLastStep}
			<!-- Completion illustration -->
			<div
				class="aspect-video bg-white/40 dark:bg-bark-800/20 backdrop-blur-sm rounded-lg mb-6 flex items-center justify-center border border-border/40"
			>
				<div class="text-center">
					<phaseIcons.partyPopper class="w-16 h-16 mx-auto mb-4 text-primary" />
					<p class="text-lg font-medium text-foreground mb-2">
						{username || "your-blog"}.grove.place
					</p>
					<p class="text-foreground-muted">Your blog is live and waiting</p>
				</div>
			</div>
		{/if}

		<!-- Navigation: two large full-width buttons, nothing else sharing the row -->
		<div class="flex gap-3 pt-4 border-t border-border/40">
			<Button
				variant="secondary"
				size="lg"
				class="flex-1"
				onclick={prevStep}
				disabled={isFirstStep}
			>
				<navIcons.chevronLeft size={18} />
				Back
			</Button>

			{#if isLastStep}
				<Button variant="primary" size="lg" class="flex-1" onclick={onComplete}>
					Go to My Blog
					<navIcons.arrowRight size={18} />
				</Button>
			{:else}
				<Button variant="primary" size="lg" class="flex-1" onclick={nextStep}>
					Next
					<navIcons.chevronRight size={18} />
				</Button>
			{/if}
		</div>
	</GlassCard>

	<!-- Skip confirmation modal -->
	{#if showSkipConfirm}
		<div class="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
			<GlassCard variant="frosted" class="max-w-sm w-full animate-slide-up">
				<div class="flex justify-between items-start mb-4">
					<h2 class="text-lg font-medium text-foreground">Skip the tour?</h2>
					<button
						onclick={() => (showSkipConfirm = false)}
						class="p-2 -m-2 text-foreground-subtle hover:text-foreground"
						aria-label="Continue tour"
					>
						<stateIcons.x size={20} />
					</button>
				</div>
				<p class="text-foreground-muted mb-6">
					No problem! You can always revisit the tour from your Help menu.
				</p>
				<div class="flex gap-3">
					<Button
						variant="secondary"
						size="lg"
						class="flex-1"
						onclick={() => (showSkipConfirm = false)}
					>
						Continue Tour
					</Button>
					<Button variant="primary" size="lg" class="flex-1" onclick={confirmSkip}>
						Skip to Blog
					</Button>
				</div>
			</GlassCard>
		</div>
	{/if}
</div>
