<script lang="ts">
	// SearchResults.svelte
	// Results list rendering with expandable domain cards

	import { GlassCard } from "@autumnsgrove/lattice/ui";
	import DomainCard from "./DomainCard.svelte";
	import type { DomainResult } from "./types.js";

	interface Props {
		results: DomainResult[];
		isLoading: boolean;
		jobStatus: string;
		expandedDomains: Set<string>;
		onToggleExpanded: (domain: string) => void;
	}

	let { results, isLoading, jobStatus, expandedDomains, onToggleExpanded }: Props = $props();

	const availableResults = $derived(
		results.filter((r) => r.status === "available").sort((a, b) => b.score - a.score),
	);
</script>

{#if results.length > 0}
	<GlassCard>
		<div class="px-3 py-3 sm:p-4 border-b border-grove-200 flex justify-between items-center">
			<h2 class="font-serif text-base sm:text-lg text-bark dark:text-foreground">
				Available Domains
			</h2>
			<span class="text-xs sm:text-sm text-foreground-muted font-sans">
				{#if isLoading}
					Loading...
				{:else}
					{availableResults.length} available
				{/if}
			</span>
		</div>
		<div class="max-h-[600px] overflow-y-auto divide-y divide-grove-100">
			{#each availableResults as result}
				<DomainCard {result} isExpanded={expandedDomains.has(result.domain)} {onToggleExpanded} />
			{/each}
		</div>
	</GlassCard>
{:else if jobStatus === "complete" && !isLoading}
	<GlassCard variant="muted" class="p-8 text-center">
		<p class="text-foreground-muted font-sans">
			No available domains found. Try adjusting your search criteria.
		</p>
	</GlassCard>
{/if}
