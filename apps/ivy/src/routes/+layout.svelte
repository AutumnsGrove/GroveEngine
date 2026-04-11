<script lang="ts">
	import "$lib/styles/theme.css";
	import type { Snippet } from "svelte";

	let { children }: { children: Snippet } = $props();
</script>

<svelte:head>
	<title>Ivy Mail</title>
	<!--
		Preconnect + preload Lexend (Grove's default typeface) from the
		canonical Grove CDN. Ivy used to pull Inter from Google Fonts
		here, but Grove's convention is Lexend everywhere — theme.css
		now declares the face and references it via `--font-sans`.
	-->
	<link rel="preconnect" href="https://cdn.grove.place" crossorigin="anonymous" />
	<link rel="dns-prefetch" href="https://cdn.grove.place" />
	<link
		rel="preload"
		href="https://cdn.grove.place/fonts/Lexend-Regular.ttf"
		as="font"
		type="font/ttf"
		crossorigin="anonymous"
	/>
</svelte:head>

<!--
	Demo notice — visible on every page until Ivy ships for real.
	Mirrors the one in apps/amber so both preview apps wear the same
	"not production yet" label. Styled to match Ivy's grove-green
	palette instead of Amber's warm yellows.
-->
<aside class="demo-banner" role="status" aria-label="Demo notice">
	<span class="demo-dot" aria-hidden="true"></span>
	<p>
		<strong>Live demo.</strong>
		This is a preview of Ivy — the real app is coming soon.
	</p>
</aside>

{@render children()}

<style>
	.demo-banner {
		position: sticky;
		top: 0;
		z-index: 100;
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.625rem;
		margin: 0;
		padding: 0.625rem 1.25rem;
		background: var(--grove-accent-12);
		border-bottom: 1px solid var(--grove-accent-30);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		font-size: 0.8125rem;
		line-height: 1.4;
		color: var(--grove-accent-light);
		text-align: center;
	}

	.demo-banner p {
		margin: 0;
	}

	.demo-banner strong {
		font-weight: 600;
		color: var(--grove-accent-light);
	}

	.demo-dot {
		flex-shrink: 0;
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 999px;
		background: var(--grove-accent);
		box-shadow: 0 0 0 0 var(--grove-accent-50);
		animation: demo-pulse 2.2s ease-in-out infinite;
	}

	@keyframes demo-pulse {
		0%,
		100% {
			box-shadow: 0 0 0 0 var(--grove-accent-50);
		}
		50% {
			box-shadow: 0 0 0 6px transparent;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.demo-dot {
			animation: none;
		}
	}
</style>
