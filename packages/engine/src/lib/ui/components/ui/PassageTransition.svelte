<script lang="ts">
	import { cn } from "$lib/ui/utils";
	import Logo from "./Logo.svelte";

	/**
	 * PassageTransition - A warm navigation overlay for cross-origin Grove transitions
	 *
	 * Shows a glassmorphism overlay with the Grove logo breathing animation and
	 * floating light motes while the browser navigates between Grove properties
	 * (e.g., from Canopy to a wanderer's garden).
	 *
	 * Named after the Passage — Grove's subdomain router that guides wanderers
	 * between gardens.
	 *
	 * @example
	 * ```svelte
	 * {#if navigating}
	 *   <PassageTransition name={wandererName} />
	 * {/if}
	 * ```
	 */

	interface Props {
		/** Display name of the destination (e.g., the wanderer's name) */
		name?: string;
		/** Additional CSS classes */
		class?: string;
	}

	let { name, class: className }: Props = $props();

	// Mote configuration — staggered floating particles for ambient life
	const motes = Array.from({ length: 8 }, (_, i) => ({
		delay: `${i * 0.35}s`,
		x: `${18 + ((i * 11) % 65)}%`,
		drift: `${-20 + ((i * 7) % 40)}px`,
		size: `${2 + (i % 3)}px`,
		duration: `${2.5 + (i % 3) * 0.5}s`,
	}));
</script>

<div
	class={cn(
		"fixed inset-0 z-grove-overlay flex flex-col items-center justify-center",
		"passage-overlay",
		className,
	)}
	role="alert"
	aria-live="polite"
>
	<!-- Warm glassmorphism backdrop -->
	<div class="absolute inset-0 passage-backdrop" />

	<!-- Centered content -->
	<div class="relative z-10 flex flex-col items-center gap-5">
		<div class="passage-breathe">
			<Logo class="w-16 h-16 drop-shadow-lg" />
		</div>
		<p class="passage-label text-white/90 text-base font-sans font-medium tracking-wide">
			{#if name}
				Wandering to {name}&rsquo;s garden&hellip;
			{:else}
				Following the path&hellip;
			{/if}
		</p>
	</div>

	<!-- Floating light motes — like fireflies guiding through the forest -->
	<div class="absolute inset-0 pointer-events-none overflow-hidden" aria-hidden="true">
		{#each motes as mote, i (i)}
			<div
				class="passage-mote"
				style="
					--mote-delay: {mote.delay};
					--mote-x: {mote.x};
					--mote-drift: {mote.drift};
					--mote-size: {mote.size};
					--mote-duration: {mote.duration};
				"
			/>
		{/each}
	</div>
</div>

<style>
	/* Backdrop — warm bark tones with blur */
	.passage-backdrop {
		background: rgba(59, 36, 20, 0.78);
		backdrop-filter: blur(12px);
		-webkit-backdrop-filter: blur(12px);
		animation: passage-backdrop-in 300ms ease-out forwards;
	}

	:global(.dark) .passage-backdrop {
		background: rgba(10, 10, 10, 0.85);
	}

	@keyframes passage-backdrop-in {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}

	/* Logo breathing — gentle scale pulse */
	.passage-breathe {
		animation: passage-breathe 2s ease-in-out infinite;
		animation-delay: 200ms;
	}

	@keyframes passage-breathe {
		0%,
		100% {
			transform: scale(1);
			opacity: 0.85;
		}
		50% {
			transform: scale(1.08);
			opacity: 1;
		}
	}

	/* Text label — fades up after backdrop settles */
	.passage-label {
		animation: passage-label-in 400ms ease-out 200ms both;
	}

	@keyframes passage-label-in {
		from {
			opacity: 0;
			transform: translateY(8px);
		}
		to {
			opacity: 1;
			transform: translateY(0);
		}
	}

	/* Floating motes — tiny light particles drifting upward */
	.passage-mote {
		position: absolute;
		bottom: 35%;
		left: var(--mote-x);
		width: var(--mote-size);
		height: var(--mote-size);
		border-radius: 50%;
		background: rgba(255, 255, 255, 0.5);
		box-shadow: 0 0 4px rgba(255, 255, 255, 0.3);
		animation: passage-float var(--mote-duration) ease-in-out var(--mote-delay) infinite;
	}

	@keyframes passage-float {
		0% {
			transform: translateY(0) translateX(0);
			opacity: 0;
		}
		15% {
			opacity: 0.7;
		}
		80% {
			opacity: 0.35;
		}
		100% {
			transform: translateY(-130px) translateX(var(--mote-drift));
			opacity: 0;
		}
	}

	/* Reduced motion — respect user preferences */
	@media (prefers-reduced-motion: reduce) {
		.passage-breathe {
			animation: none;
			opacity: 1;
		}

		.passage-mote {
			animation: none;
			display: none;
		}

		.passage-backdrop {
			animation: none;
			opacity: 1;
		}

		.passage-label {
			animation: none;
			opacity: 1;
			transform: none;
		}
	}
</style>
