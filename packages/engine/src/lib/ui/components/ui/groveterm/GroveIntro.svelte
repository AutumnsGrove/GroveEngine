<script lang="ts">
	import GroveTerm from './GroveTerm.svelte';
	import { groveModeStore } from '$lib/ui/stores';
	import type { GroveTermManifest } from './types';

	import defaultManifestData from '$lib/data/grove-term-manifest.json';
	const defaultManifest = defaultManifestData as GroveTermManifest;

	// GroveIntro - Standardized "we call it X" page introduction
	//
	// Renders below a page title when Grove Mode is OFF, introducing the
	// Grove term for the feature. Hidden entirely when Grove Mode is ON.
	//
	// Usage:
	//   <h1>Support</h1>
	//   <GroveIntro term="porch" />
	//   <!-- Renders: "we call it the Porch" with Porch as interactive GroveTerm -->

	interface Props {
		/** Term slug to look up (e.g., "porch", "arbor") */
		term: string;
		/** Optional manifest override */
		manifest?: GroveTermManifest;
		/** Additional CSS classes */
		class?: string;
	}

	let {
		term,
		manifest = defaultManifest,
		class: className
	}: Props = $props();

	// Find the entry from manifest
	function findEntry(slug: string) {
		if (slug in manifest) return manifest[slug];
		if (`your-${slug}` in manifest) return manifest[`your-${slug}`];
		if (`${slug}s` in manifest) return manifest[`${slug}s`];
		if (slug.endsWith('s') && slug.slice(0, -1) in manifest) return manifest[slug.slice(0, -1)];
		return null;
	}

	const entry = $derived(findEntry(term));

	// Only show when: Grove Mode is OFF, and the term has a standardTerm, and is not alwaysGrove
	const shouldShow = $derived(
		!groveModeStore.current && entry && entry.standardTerm && !entry.alwaysGrove
	);
</script>

{#if shouldShow && entry}
	<p class="grove-intro text-sm text-foreground-subtle italic {className || ''}">
		we call it the <GroveTerm term={term} {manifest} />
	</p>
{/if}

<style>
	.grove-intro {
		margin-top: 0.25rem;
		margin-bottom: 0;
	}
</style>
