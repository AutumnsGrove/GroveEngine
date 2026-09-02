<script lang="ts">
	/**
	 * GroveTour — the guided walkthrough of what Grove can do.
	 *
	 * Originally hand-rolled inside apps/plant/src/routes/tour/+page.svelte
	 * (shown once during signup). Extracted so the same tour can also be
	 * opened later from Arbor ("View Tutorial") without a second copy of the
	 * stops, swipe/keyboard handling, and skip-confirm dialog to keep in sync.
	 *
	 * Completion/skip behavior is left to the consumer via onComplete/onSkip —
	 * Plant redirects into onboarding, Arbor just closes the tour — so this
	 * component has no navigation opinions of its own.
	 *
	 * This wrapper picks between GroveTourDesktop (swipe + keyboard + clickable
	 * step-dots) and GroveTourMobile (buttons only, no swipe, no dots) based on
	 * viewport width — touch and pointer input need genuinely different
	 * navigation here, not just a resized version of the same layout. See
	 * GroveTourMobile's doc comment for why. currentStep/showSkipConfirm live
	 * here rather than in either variant so resizing across the breakpoint
	 * mid-tour (the standard way to test this locally) doesn't reset progress.
	 */
	import GroveTourDesktop from "./GroveTourDesktop.svelte";
	import GroveTourMobile from "./GroveTourMobile.svelte";

	interface Props {
		/** Personalizes the final step and its "go to blog" description */
		username?: string;
		/** Called when the user finishes the last step */
		onComplete: () => void;
		/** Called when the user confirms "Skip to Blog" in the skip dialog */
		onSkip: () => void;
	}

	let { username, onComplete, onSkip }: Props = $props();

	let currentStep = $state(0);
	let showSkipConfirm = $state(false);

	// Tailwind's default `md` breakpoint (768px) — matches the rest of this component tree
	const MOBILE_QUERY = "(max-width: 767px)";
	let isMobile = $state(false);

	$effect(() => {
		const mql = window.matchMedia(MOBILE_QUERY);
		isMobile = mql.matches;

		const handleChange = (e: MediaQueryListEvent) => {
			isMobile = e.matches;
		};
		mql.addEventListener("change", handleChange);
		return () => mql.removeEventListener("change", handleChange);
	});
</script>

{#if isMobile}
	<GroveTourMobile {username} {onComplete} {onSkip} bind:currentStep bind:showSkipConfirm />
{:else}
	<GroveTourDesktop {username} {onComplete} {onSkip} bind:currentStep bind:showSkipConfirm />
{/if}
