<script lang="ts">
	import type { PageData } from "./$types";
	import { GlassCard } from "@autumnsgrove/lattice/ui";
	import { formatRelativeTime as _frt } from "@autumnsgrove/lattice/utils";
	import { stateIcons, metricIcons } from "@autumnsgrove/prism/icons";

	const AlertCircle = stateIcons.alertCircle;
	const Activity = metricIcons.activity;

	let { data }: { data: PageData } = $props();

	const formatRelativeTime = (v: number | null) => _frt(v, "Never");
</script>

<svelte:head>
	<title>Pulse — Grove Admin</title>
</svelte:head>

<div class="mb-8">
	<h1 class="text-2xl font-serif text-foreground">Pulse</h1>
	<p class="text-foreground-muted font-sans mt-1">
		Product observability — what's happening across Grove
	</p>
</div>

{#if !data.dbAvailable}
	<GlassCard variant="frosted" class="p-6">
		<p class="text-foreground-muted">OBS_DB binding not available. Pulse data cannot be loaded.</p>
	</GlassCard>
{:else if data.overview}
	{@const o = data.overview}

	<!-- Key Metrics -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
		<GlassCard variant="frosted" class="p-5">
			<p class="text-xs uppercase tracking-wide text-foreground-subtle">Requests (24h)</p>
			<p class="text-3xl font-serif text-foreground mt-1">{o.totalRequests24h.toLocaleString()}</p>
		</GlassCard>

		<GlassCard variant="frosted" class="p-5">
			<p class="text-xs uppercase tracking-wide text-foreground-subtle">Unique Visitors (24h)</p>
			<p class="text-3xl font-serif text-foreground mt-1">{o.uniqueVisitors24h.toLocaleString()}</p>
		</GlassCard>

		<GlassCard variant="frosted" class="p-5">
			<p class="text-xs uppercase tracking-wide text-foreground-subtle">Error Rate (24h)</p>
			<p
				class="text-3xl font-serif text-foreground mt-1"
				class:text-error-foreground={o.errorRate24h > 5}
			>
				{o.errorRate24h.toFixed(2)}%
			</p>
		</GlassCard>
	</div>

	<!-- Two-column: Top Routes + Categories -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
		<!-- Top Routes -->
		<GlassCard variant="frosted" class="p-5">
			<h2 class="text-sm font-medium text-foreground mb-3">Top Routes</h2>
			{#if o.topRoutes.length === 0}
				<p class="text-foreground-subtle text-sm">No data yet</p>
			{:else}
				<div class="space-y-2">
					{#each o.topRoutes as route}
						<div class="flex items-center justify-between text-sm">
							<span class="text-foreground truncate max-w-[70%]">
								<span class="text-foreground-subtle">{route.app}</span>
								{route.route}
							</span>
							<span class="text-foreground-muted font-mono">{route.count}</span>
						</div>
					{/each}
				</div>
			{/if}
		</GlassCard>

		<!-- Events by Category -->
		<GlassCard variant="frosted" class="p-5">
			<h2 class="text-sm font-medium text-foreground mb-3">Events by Category</h2>
			{#if o.eventsByCategory.length === 0}
				<p class="text-foreground-subtle text-sm">No data yet</p>
			{:else}
				<div class="space-y-2">
					{#each o.eventsByCategory as cat}
						<div class="flex items-center justify-between text-sm">
							<span class="text-foreground capitalize">{cat.category}</span>
							<span class="text-foreground-muted font-mono">{cat.count}</span>
						</div>
					{/each}
				</div>
			{/if}
		</GlassCard>
	</div>

	<!-- Recent Errors -->
	<GlassCard variant="frosted" class="p-5">
		<h2 class="text-sm font-medium text-foreground mb-3">Recent Errors</h2>
		{#if o.recentErrors.length === 0}
			<p class="text-foreground-subtle text-sm">No errors in the last 24 hours</p>
		{:else}
			<div class="space-y-3">
				{#each o.recentErrors as err}
					<div class="border-b border-foreground/5 pb-2 last:border-0">
						<div class="flex items-center gap-2 text-sm">
							<AlertCircle class="w-3.5 h-3.5 text-error-foreground shrink-0" />
							<span class="text-foreground-subtle">{err.app}</span>
							<span class="text-foreground truncate">{err.route}</span>
							{#if err.status}
								<span class="text-error-foreground font-mono text-xs">{err.status}</span>
							{/if}
						</div>
						{#if err.message}
							<p class="text-xs text-foreground-muted mt-0.5 pl-5 truncate">{err.message}</p>
						{/if}
						<p class="text-xs text-foreground-subtle mt-0.5 pl-5">
							{formatRelativeTime(err.recorded_at)}
						</p>
					</div>
				{/each}
			</div>
		{/if}
	</GlassCard>

	<!-- Nav to sub-pages -->
	<div class="mt-8 flex gap-3">
		<a href="/arbor/pulse/funnel" class="text-sm text-primary hover:underline">Signup Funnel →</a>
		<a href="/arbor/pulse/errors" class="text-sm text-primary hover:underline">Error Log →</a>
	</div>
{/if}
