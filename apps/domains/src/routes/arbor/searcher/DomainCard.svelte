<script lang="ts">
	// DomainCard.svelte
	// Individual domain result card with expandable evaluation details

	import type { DomainResult } from "./types.js";

	interface Props {
		result: DomainResult;
		isExpanded: boolean;
		onToggleExpanded: (domain: string) => void;
	}

	let { result, isExpanded, onToggleExpanded }: Props = $props();

	const evalData = $derived(result.evaluation_data);

	function formatPrice(cents: number | null | undefined): string {
		if (!cents) return "-";
		return `$${(cents / 100).toFixed(2)}`;
	}

	function getPriceClass(category: string | null | undefined): string {
		switch (category) {
			case "bundled":
				return "text-grove-600 dark:text-grove-400";
			case "recommended":
				return "text-domain-600 dark:text-domain-400";
			case "premium":
				return "text-warning";
			default:
				return "text-foreground-muted";
		}
	}

	function formatExpiration(dateStr?: string): string {
		if (!dateStr) return "";
		try {
			const date = new Date(dateStr);
			return date.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
		} catch {
			return dateStr;
		}
	}
</script>

<div class="hover:bg-grove-50 transition-colors">
	<!-- Main row - clickable to expand -->
	<button
		type="button"
		onclick={() => onToggleExpanded(result.domain)}
		aria-expanded={isExpanded}
		class="w-full px-3 py-3 sm:p-4 text-left flex items-start sm:items-center justify-between gap-2"
	>
		<div class="flex-1 min-w-0">
			<div class="flex flex-wrap items-center gap-1.5 sm:gap-2">
				<span
					class="font-mono text-bark dark:text-foreground font-medium text-sm sm:text-base break-all"
					>{result.domain}</span
				>
				{#if result.pricing_category || evalData?.pricing_category}
					{@const category = result.pricing_category || evalData?.pricing_category}
					<span
						class="flex-shrink-0 px-1.5 sm:px-2 py-0.5 text-[10px] sm:text-xs font-sans rounded-full
						{category === 'bundled'
							? 'bg-grove-100 text-grove-700'
							: category === 'recommended'
								? 'bg-domain-100 text-domain-700'
								: category === 'premium'
									? 'bg-surface-subtle text-warning'
									: 'bg-bark/10 dark:bg-surface-subtle text-foreground-muted'}"
					>
						{category}
					</span>
				{/if}
			</div>
			<div class="flex flex-wrap items-center gap-2 sm:gap-3 mt-1.5">
				<span class="text-[11px] sm:text-xs font-sans text-foreground-subtle"
					>Score: {(result.score * 100).toFixed(0)}%</span
				>
				<!-- Evaluation indicators -->
				{#if evalData}
					<div class="flex items-center gap-1">
						{#if evalData.pronounceable}
							<span
								class="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center rounded-full bg-grove-100 text-grove-600"
								title="Easy to pronounce"
							role="img"
							aria-label="Easy to pronounce"
							>
								<svg class="w-2.5 h-2.5 sm:w-3 sm:h-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
									><path
										d="M10 2a8 8 0 100 16 8 8 0 000-16zm0 14a6 6 0 110-12 6 6 0 010 12z"
									/><path
										d="M10 5a1 1 0 011 1v4a1 1 0 01-2 0V6a1 1 0 011-1zm0 8a1 1 0 100 2 1 1 0 000-2z"
									/></svg
								>
							</span>
						{/if}
						{#if evalData.memorable}
							<span
								class="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center rounded-full bg-domain-100 text-domain-600"
								title="Memorable"
							role="img"
							aria-label="Memorable"
							>
								<svg class="w-2.5 h-2.5 sm:w-3 sm:h-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
									><path
										fill-rule="evenodd"
										d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
										clip-rule="evenodd"
									/></svg
								>
							</span>
						{/if}
						{#if evalData.brand_fit}
							<span
								class="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center rounded-full bg-amber-100 text-warning"
								title="Good brand fit"
							role="img"
							aria-label="Good brand fit"
							>
								<svg class="w-2.5 h-2.5 sm:w-3 sm:h-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
									><path
										d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z"
									/></svg
								>
							</span>
						{/if}
						{#if evalData.email_friendly}
							<span
								class="w-4 h-4 sm:w-5 sm:h-5 flex items-center justify-center rounded-full bg-surface-subtle text-info"
								title="Email-friendly"
							role="img"
							aria-label="Email-friendly"
							>
								<svg class="w-2.5 h-2.5 sm:w-3 sm:h-3" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true"
									><path
										d="M2.003 5.884L10 9.882l7.997-3.998A2 2 0 0016 4H4a2 2 0 00-1.997 1.884z"
									/><path d="M18 8.118l-8 4-8-4V14a2 2 0 002 2h12a2 2 0 002-2V8.118z" /></svg
								>
							</span>
						{/if}
					</div>
				{/if}
			</div>
		</div>
		<div class="text-right flex-shrink-0 ml-3 sm:ml-4 flex items-center gap-2 sm:gap-3">
			<span
				class="{getPriceClass(
					result.pricing_category || evalData?.pricing_category,
				)} font-sans font-medium text-sm sm:text-base whitespace-nowrap"
			>
				{result.price_display || formatPrice(result.price_cents)}/yr
			</span>
			<svg
				class="w-5 h-5 text-foreground-faint transition-transform flex-shrink-0 {isExpanded
					? 'rotate-180'
					: ''}"
				viewBox="0 0 20 20"
				fill="currentColor"
			>
				<path
					fill-rule="evenodd"
					d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z"
					clip-rule="evenodd"
				/>
			</svg>
		</div>
	</button>

	<!-- Expanded details -->
	{#if isExpanded && evalData}
		<div class="px-3 sm:px-4 pb-3 sm:pb-4 pt-0 border-t border-grove-100 bg-grove-50/50">
			<div class="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 mt-3">
				<!-- Evaluation scores -->
				<div class="space-y-2">
					<h4 class="text-xs font-sans font-medium text-foreground-muted uppercase tracking-wide">
						Evaluation
					</h4>
					<div class="space-y-1.5">
						<div class="flex items-center justify-between text-sm font-sans">
							<span class="text-foreground-muted">Pronounceable</span>
							<span class={evalData.pronounceable ? "text-grove-600" : "text-foreground-faint"}
								>{evalData.pronounceable ? "Yes" : "No"}</span
							>
						</div>
						<div class="flex items-center justify-between text-sm font-sans">
							<span class="text-foreground-muted">Memorable</span>
							<span class={evalData.memorable ? "text-grove-600" : "text-foreground-faint"}
								>{evalData.memorable ? "Yes" : "No"}</span
							>
						</div>
						<div class="flex items-center justify-between text-sm font-sans">
							<span class="text-foreground-muted">Brand Fit</span>
							<span class={evalData.brand_fit ? "text-grove-600" : "text-foreground-faint"}
								>{evalData.brand_fit ? "Yes" : "No"}</span
							>
						</div>
						<div class="flex items-center justify-between text-sm font-sans">
							<span class="text-foreground-muted">Email Friendly</span>
							<span class={evalData.email_friendly ? "text-grove-600" : "text-foreground-faint"}
								>{evalData.email_friendly ? "Yes" : "No"}</span
							>
						</div>
					</div>
				</div>

				<!-- Pricing & RDAP info -->
				<div class="space-y-2">
					<h4 class="text-xs font-sans font-medium text-foreground-muted uppercase tracking-wide">
						Details
					</h4>
					<div class="space-y-1.5">
						{#if evalData.renewal_cents}
							<div class="flex items-center justify-between text-sm font-sans">
								<span class="text-foreground-muted">Renewal</span>
								<span class="text-bark dark:text-foreground"
									>{formatPrice(evalData.renewal_cents)}/yr</span
								>
							</div>
						{/if}
						{#if evalData.rdap_registrar}
							<div class="flex items-center justify-between text-sm font-sans">
								<span class="text-foreground-muted">Registrar</span>
								<span
									class="text-bark dark:text-foreground truncate max-w-[150px]"
									title={evalData.rdap_registrar}>{evalData.rdap_registrar}</span
								>
							</div>
						{/if}
						{#if evalData.rdap_expiration}
							<div class="flex items-center justify-between text-sm font-sans">
								<span class="text-foreground-muted">Expires</span>
								<span class="text-bark dark:text-foreground"
									>{formatExpiration(evalData.rdap_expiration)}</span
								>
							</div>
						{/if}
					</div>
				</div>
			</div>

			<!-- AI Notes -->
			{#if evalData.notes}
				<div class="mt-3 pt-3 border-t border-grove-200">
					<p class="text-sm text-foreground-muted font-sans italic">
						&ldquo;{evalData.notes}&rdquo;
					</p>
				</div>
			{/if}

			<!-- Flags -->
			{#if result.flags && result.flags.length > 0}
				<div class="mt-3 flex flex-wrap gap-1">
					{#each result.flags as flag}
						<span
							class="px-2 py-0.5 text-xs font-sans bg-bark/10 dark:bg-surface-subtle text-foreground-muted rounded"
							>{flag}</span
						>
					{/each}
				</div>
			{/if}
		</div>
	{/if}
</div>
