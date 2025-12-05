<script lang="ts">
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	function formatDuration(seconds: number | null): string {
		if (!seconds) return '-';
		if (seconds < 60) return `${seconds}s`;
		const mins = Math.floor(seconds / 60);
		const secs = seconds % 60;
		return `${mins}m ${secs}s`;
	}

	function formatDate(dateStr: string): string {
		return new Date(dateStr).toLocaleDateString('en-US', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	function formatPrice(cents: number | null): string {
		if (!cents) return '-';
		return `$${(cents / 100).toFixed(2)}`;
	}

	function getStatusBadge(status: string): string {
		switch (status) {
			case 'running': return 'badge-info';
			case 'complete': return 'badge-success';
			case 'failed': return 'badge-error';
			case 'needs_followup': return 'badge-warning';
			default: return 'bg-bark/10 text-bark/60';
		}
	}

	function getPriceClass(category: string | null): string {
		switch (category) {
			case 'bundled': return 'text-grove-600';
			case 'recommended': return 'text-domain-600';
			case 'premium': return 'text-amber-600';
			default: return 'text-bark/60';
		}
	}

	// Group results by status
	const availableResults = $derived(data.results.filter(r => r.status === 'available').sort((a, b) => b.score - a.score));
	const unavailableResults = $derived(data.results.filter(r => r.status !== 'available'));
</script>

<svelte:head>
	<title>{data.job?.business_name || 'Job'} - History - Domain Finder</title>
</svelte:head>

{#if !data.job}
	<div class="card p-12 text-center">
		<p class="text-bark/60 font-sans">Job not found</p>
		<a href="/admin/history" class="btn-primary inline-block mt-4">
			Back to History
		</a>
	</div>
{:else}
	<div class="space-y-8">
		<!-- Page Header -->
		<div class="flex items-start justify-between">
			<div>
				<div class="flex items-center gap-3 mb-2">
					<a href="/admin/history" class="text-bark/50 hover:text-bark transition-colors" aria-label="Back to history">
						<svg class="w-5 h-5" viewBox="0 0 20 20" fill="currentColor">
							<path fill-rule="evenodd" d="M17 10a.75.75 0 01-.75.75H5.612l4.158 3.96a.75.75 0 11-1.04 1.08l-5.5-5.25a.75.75 0 010-1.08l5.5-5.25a.75.75 0 111.04 1.08L5.612 9.25H16.25A.75.75 0 0117 10z" clip-rule="evenodd" />
						</svg>
					</a>
					<h1 class="text-2xl font-serif text-bark">{data.job.business_name}</h1>
					<span class="badge {getStatusBadge(data.job.status)}">{data.job.status}</span>
				</div>
				<p class="text-bark/60 font-sans">{data.job.client_email}</p>
			</div>
		</div>

		<!-- Job Details -->
		<div class="grid md:grid-cols-2 lg:grid-cols-4 gap-4">
			<div class="card p-4">
				<div class="text-sm font-sans text-bark/60 mb-1">Domains Checked</div>
				<div class="text-2xl font-serif text-bark">{data.job.domains_checked}</div>
			</div>
			<div class="card p-4">
				<div class="text-sm font-sans text-bark/60 mb-1">Available Found</div>
				<div class="text-2xl font-serif text-grove-600">{data.job.good_results}</div>
			</div>
			<div class="card p-4">
				<div class="text-sm font-sans text-bark/60 mb-1">Duration</div>
				<div class="text-2xl font-serif text-bark">{formatDuration(data.job.duration_seconds)}</div>
			</div>
			<div class="card p-4">
				<div class="text-sm font-sans text-bark/60 mb-1">Batches</div>
				<div class="text-2xl font-serif text-bark">{data.job.batch_num} / 6</div>
			</div>
		</div>

		<!-- Search Parameters -->
		<div class="card p-6">
			<h2 class="font-serif text-lg text-bark mb-4">Search Parameters</h2>
			<div class="grid sm:grid-cols-2 gap-4 text-sm font-sans">
				<div>
					<span class="text-bark/60">Vibe:</span>
					<span class="text-bark ml-2 capitalize">{data.job.vibe}</span>
				</div>
				{#if data.job.domain_idea}
					<div>
						<span class="text-bark/60">Domain Idea:</span>
						<span class="text-bark ml-2 font-mono">{data.job.domain_idea}</span>
					</div>
				{/if}
				<div>
					<span class="text-bark/60">TLD Preferences:</span>
					<span class="text-bark ml-2">{JSON.parse(data.job.tld_preferences).join(', ')}</span>
				</div>
				{#if data.job.keywords}
					<div>
						<span class="text-bark/60">Keywords:</span>
						<span class="text-bark ml-2">{data.job.keywords}</span>
					</div>
				{/if}
				<div>
					<span class="text-bark/60">Created:</span>
					<span class="text-bark ml-2">{formatDate(data.job.created_at)}</span>
				</div>
				{#if data.job.completed_at}
					<div>
						<span class="text-bark/60">Completed:</span>
						<span class="text-bark ml-2">{formatDate(data.job.completed_at)}</span>
					</div>
				{/if}
			</div>
		</div>

		<!-- Available Domains -->
		{#if availableResults.length > 0}
			<div class="card">
				<div class="p-4 border-b border-grove-200 flex justify-between items-center">
					<h2 class="font-serif text-lg text-bark">Available Domains</h2>
					<span class="text-sm text-grove-600 font-sans">{availableResults.length} found</span>
				</div>
				<div class="overflow-x-auto">
					<table class="w-full">
						<thead class="bg-grove-50 border-b border-grove-200">
							<tr>
								<th class="text-left px-4 py-3 text-sm font-sans font-medium text-bark/70">Domain</th>
								<th class="text-center px-4 py-3 text-sm font-sans font-medium text-bark/70">Score</th>
								<th class="text-center px-4 py-3 text-sm font-sans font-medium text-bark/70">Category</th>
								<th class="text-right px-4 py-3 text-sm font-sans font-medium text-bark/70">Price</th>
								<th class="text-center px-4 py-3 text-sm font-sans font-medium text-bark/70 hidden md:table-cell">Batch</th>
							</tr>
						</thead>
						<tbody class="divide-y divide-grove-100">
							{#each availableResults as result}
								<tr class="hover:bg-grove-50 transition-colors">
									<td class="px-4 py-3">
										<span class="font-mono text-bark font-medium">{result.domain}</span>
									</td>
									<td class="px-4 py-3 text-center">
										<div class="w-full bg-grove-100 rounded-full h-2 max-w-[60px] mx-auto">
											<div
												class="bg-domain-500 h-2 rounded-full"
												style="width: {result.score * 100}%"
											></div>
										</div>
										<span class="text-xs text-bark/50 font-sans">{(result.score * 100).toFixed(0)}%</span>
									</td>
									<td class="px-4 py-3 text-center">
										{#if result.price_category}
											<span class="badge {result.price_category === 'bundled' ? 'badge-success' : result.price_category === 'recommended' ? 'badge-info' : 'badge-warning'}">
												{result.price_category}
											</span>
										{:else}
											<span class="text-bark/40">-</span>
										{/if}
									</td>
									<td class="px-4 py-3 text-right">
										<span class="{getPriceClass(result.price_category)} font-sans font-medium">
											{formatPrice(result.price_cents)}
										</span>
									</td>
									<td class="px-4 py-3 text-center text-sm text-bark/50 font-sans hidden md:table-cell">
										{result.batch_num}
									</td>
								</tr>
							{/each}
						</tbody>
					</table>
				</div>
			</div>
		{/if}

		<!-- Checked (Unavailable) Domains - Collapsed by default -->
		{#if unavailableResults.length > 0}
			<details class="card">
				<summary class="p-4 cursor-pointer hover:bg-grove-50 transition-colors flex justify-between items-center">
					<h2 class="font-serif text-lg text-bark">Checked Domains (Unavailable)</h2>
					<span class="text-sm text-bark/50 font-sans">{unavailableResults.length} domains</span>
				</summary>
				<div class="border-t border-grove-200 p-4">
					<div class="flex flex-wrap gap-2">
						{#each unavailableResults as result}
							<span class="px-2 py-1 bg-bark/5 rounded text-sm font-mono text-bark/50">
								{result.domain}
							</span>
						{/each}
					</div>
				</div>
			</details>
		{/if}
	</div>
{/if}
