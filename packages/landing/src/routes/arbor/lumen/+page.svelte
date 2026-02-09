<script lang="ts">
	import { onMount } from 'svelte';
	import { GlassCard } from '@autumnsgrove/groveengine/ui';
	import { Sparkles, Loader2, AlertTriangle, RefreshCw } from 'lucide-svelte';
	import { LumenAnalytics } from '@autumnsgrove/groveengine';

	interface LumenData {
		today: Array<{
			task: string;
			count: number;
			input_tokens: number;
			output_tokens: number;
			total_cost: number;
			avg_latency: number;
		}>;
		week: Array<{
			task: string;
			count: number;
			input_tokens: number;
			output_tokens: number;
			total_cost: number;
			avg_latency: number;
		}>;
		recent: Array<{
			id: number;
			task: string;
			model: string;
			provider: string;
			input_tokens: number;
			output_tokens: number;
			cost: number;
			latency_ms: number;
			cached: number;
			created_at: string;
		}>;
		providers: Array<{
			provider: string;
			count: number;
			total_cost: number;
		}>;
	}

	let data = $state<LumenData | null>(null);
	let loading = $state(true);
	let error = $state<string | null>(null);

	async function fetchData() {
		loading = true;
		error = null;
		try {
			const res = await fetch('/api/admin/lumen'); // csrf-ok - GET request
			if (!res.ok) {
				throw new Error('Failed to fetch Lumen analytics');
			}
			data = await res.json();
		} catch (err) {
			error = err instanceof Error ? err.message : 'Unknown error';
		} finally {
			loading = false;
		}
	}

	onMount(() => {
		fetchData();
	});
</script>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-serif text-foreground flex items-center gap-2">
				<Sparkles class="w-6 h-6 text-violet-500" />
				Lumen Analytics
			</h1>
			<p class="text-foreground-muted mt-1">
				AI gateway usage and observability
			</p>
		</div>
		<button
			onclick={fetchData}
			disabled={loading}
			class="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-foreground bg-white/50 dark:bg-slate-800/50 border border-grove-200 dark:border-grove-700 rounded-lg hover:bg-white/70 dark:hover:bg-slate-700/50 transition-colors disabled:opacity-50"
		>
			<RefreshCw class="w-4 h-4 {loading ? 'animate-spin' : ''}" />
			Refresh
		</button>
	</div>

	<!-- Loading State -->
	{#if loading && !data}
		<GlassCard variant="default" class="p-12">
			<div class="flex flex-col items-center justify-center text-foreground-subtle">
				<Loader2 class="w-8 h-8 animate-spin mb-4" />
				<p>Loading analytics...</p>
			</div>
		</GlassCard>
	{/if}

	<!-- Error State -->
	{#if error && !data}
		<GlassCard variant="default" class="p-8">
			<div class="flex flex-col items-center justify-center text-red-600 dark:text-red-400">
				<AlertTriangle class="w-8 h-8 mb-4" />
				<p class="font-medium">{error}</p>
				<button
					onclick={fetchData}
					class="mt-4 text-sm underline hover:no-underline"
				>
					Try again
				</button>
			</div>
		</GlassCard>
	{/if}

	<!-- Analytics Content -->
	{#if data}
		<LumenAnalytics
			today={data.today}
			week={data.week}
			recent={data.recent}
			providers={data.providers}
		/>
	{/if}
</div>
