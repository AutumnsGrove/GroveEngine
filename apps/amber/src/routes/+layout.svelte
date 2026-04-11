<script lang="ts">
	import "$lib/styles/theme.css";
	import type { Snippet } from "svelte";

	let { children }: { children: Snippet } = $props();
</script>

<svelte:head>
	<title>Amber - Storage Management</title>
	<meta name="viewport" content="width=device-width, initial-scale=1" />
	<link rel="preconnect" href="https://fonts.googleapis.com" />
	<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin="anonymous" />
	<link
		href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap"
		rel="stylesheet"
	/>
</svelte:head>

<!--
	Demo notice — visible on every page until Amber ships for real.
	Real users were opening amber.grove.place, seeing what looked like
	a functional storage manager, and getting confused when nothing
	they did actually touched live data. This glass banner makes the
	demo state legible at first glance.
-->
<aside class="demo-banner" role="status" aria-label="Demo notice">
	<span class="demo-dot" aria-hidden="true"></span>
	<p>
		<strong>Live demo.</strong>
		This is a preview of Amber — the real app is coming soon.
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
		background: rgba(251, 191, 36, 0.12);
		border-bottom: 1px solid rgba(251, 191, 36, 0.28);
		backdrop-filter: blur(10px);
		-webkit-backdrop-filter: blur(10px);
		font-size: 0.8125rem;
		line-height: 1.4;
		color: #fde68a;
		text-align: center;
	}

	.demo-banner p {
		margin: 0;
	}

	.demo-banner strong {
		font-weight: 600;
		color: #fcd34d;
	}

	.demo-dot {
		flex-shrink: 0;
		width: 0.5rem;
		height: 0.5rem;
		border-radius: 999px;
		background: #fbbf24;
		box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.55);
		animation: demo-pulse 2.2s ease-in-out infinite;
	}

	@keyframes demo-pulse {
		0%,
		100% {
			box-shadow: 0 0 0 0 rgba(251, 191, 36, 0.55);
		}
		50% {
			box-shadow: 0 0 0 6px rgba(251, 191, 36, 0);
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.demo-dot {
			animation: none;
		}
	}
</style>
