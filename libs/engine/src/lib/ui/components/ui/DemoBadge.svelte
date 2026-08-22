<script lang="ts">
	import { cn } from "$lib/ui/utils";
	import { blazeIcons } from "@autumnsgrove/prism/icons";
	import type { Snippet } from "svelte";

	/**
	 * DemoBadge - A small inline badge indicating demo mode is active.
	 *
	 * Matches BetaBadge's shape and sizing exactly, with a green palette and
	 * a camera icon instead of blue/flask, so the two read as siblings when
	 * both show together (e.g. local dev on the beta branch with demo mode on).
	 *
	 * @example
	 * ```svelte
	 * <DemoBadge />
	 * ```
	 */

	interface Props {
		/** Additional CSS classes */
		class?: string;
		/** Custom badge content (defaults to "Demo") */
		children?: Snippet;
		/** Custom title/tooltip text */
		title?: string;
	}

	let {
		class: className,
		children,
		title: titleProp = "Demo mode is active — auth is bypassed for screenshots and local exploration",
	}: Props = $props();

	const badgeClass = $derived(
		cn(
			"demo-badge inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium transition-colors",
			className,
		),
	);
</script>

<span class={badgeClass} title={titleProp} role="status">
	<blazeIcons.camera class="w-3.5 h-3.5" />
	{#if children}
		{@render children()}
	{:else}
		Demo
	{/if}
</span>

<style>
	.demo-badge {
		background: var(--grove-accent-15);
		color: var(--grove-accent);
	}
</style>
