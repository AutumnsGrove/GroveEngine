<script lang="ts">
	import type { PageData } from "./$types";
	import { GlassCard } from "@autumnsgrove/lattice/ui";
	import { formatRelativeTime as _frt } from "@autumnsgrove/lattice/utils";
	import { stateIcons, metricIcons } from "@autumnsgrove/prism/icons";

	const AlertCircle = stateIcons.alertCircle;
	const Activity = metricIcons.activity;

	let { data }: { data: PageData } = $props();

	const formatRelativeTime = (v: number | null) => _frt(v, "Never");

	function segmentLabel(source: string): string {
		if (source === "organic") return "Organic";
		if (source === "monitor") return "Health Checks";
		if (source === "bot") return "Bot / Scanner";
		return source;
	}

	function segmentColor(source: string): string {
		if (source === "organic") return "text-accent-500";
		if (source === "monitor") return "text-foreground-subtle";
		if (source === "bot") return "text-error-foreground";
		return "text-foreground-muted";
	}
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
	{@const organicSeg = o.segments.find((s) => s.source === "organic")}

	<!-- Traffic Segments Overview -->
	<div class="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
		<GlassCard variant="frosted" class="p-5">
			<p class="text-xs uppercase tracking-wide text-foreground-subtle">
				Organic Requests (24h)
			</p>
			<p class="text-3xl font-serif text-foreground mt-1">
				{(organicSeg?.requests ?? 0).toLocaleString()}
			</p>
		</GlassCard>

		<GlassCard variant="frosted" class="p-5">
			<p class="text-xs uppercase tracking-wide text-foreground-subtle">
				Unique Visitors (24h)
			</p>
			<p class="text-3xl font-serif text-foreground mt-1">
				{o.uniqueVisitors24h.toLocaleString()}
			</p>
		</GlassCard>

		<GlassCard variant="frosted" class="p-5">
			<p class="text-xs uppercase tracking-wide text-foreground-subtle">
				Organic Error Rate (24h)
			</p>
			<p
				class="text-3xl font-serif text-foreground mt-1"
				class:text-error-foreground={o.errorRate24h > 5}
			>
				{o.errorRate24h.toFixed(2)}%
			</p>
		</GlassCard>
	</div>

	<!-- Segment Breakdown Bar -->
	<GlassCard variant="frosted" class="p-5 mb-6">
		<h2 class="text-sm font-medium text-foreground mb-3">Traffic Breakdown</h2>
		<div class="flex gap-1 h-3 rounded-full overflow-hidden mb-3">
			{#each o.segments as seg}
				{@const pct = o.totalRequests24h > 0 ? (seg.requests / o.totalRequests24h) * 100 : 0}
				<div
					class="h-full transition-all {seg.source === 'organic'
						? 'bg-accent-500'
						: seg.source === 'monitor'
							? 'bg-foreground/20'
							: 'bg-error-foreground/60'}"
					style="width: {pct}%"
					title="{segmentLabel(seg.source)}: {seg.requests} ({pct.toFixed(1)}%)"
				></div>
			{/each}
		</div>
		<div class="flex flex-wrap gap-4 text-xs">
			{#each o.segments as seg}
				{@const pct = o.totalRequests24h > 0 ? (seg.requests / o.totalRequests24h) * 100 : 0}
				<div class="flex items-center gap-2">
					<span class={segmentColor(seg.source)}>●</span>
					<span class="text-foreground">{segmentLabel(seg.source)}</span>
					<span class="text-foreground-muted font-mono">
						{seg.requests.toLocaleString()} ({pct.toFixed(1)}%)
					</span>
					{#if seg.errorCount > 0}
						<span class="text-error-foreground font-mono">
							{seg.errorCount} errors
						</span>
					{/if}
				</div>
			{/each}
		</div>
		<p class="text-xs text-foreground-subtle mt-2">
			{o.totalRequests24h.toLocaleString()} total requests across all sources
		</p>
	</GlassCard>

	<!-- Organic Traffic Section -->
	<div class="mb-8">
		<h2 class="text-lg font-serif text-foreground mb-4 flex items-center gap-2">
			<span class="text-accent-500">●</span> Organic Traffic
		</h2>

		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
			<!-- Top Routes -->
			<GlassCard variant="frosted" class="p-5">
				<h3 class="text-sm font-medium text-foreground mb-3">Top Routes</h3>
				{#if o.organicTopRoutes.length === 0}
					<p class="text-foreground-subtle text-sm">No organic traffic yet</p>
				{:else}
					<div class="space-y-2">
						{#each o.organicTopRoutes as route}
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
				<h3 class="text-sm font-medium text-foreground mb-3">Events by Category</h3>
				{#if o.organicEventsByCategory.length === 0}
					<p class="text-foreground-subtle text-sm">No data yet</p>
				{:else}
					<div class="space-y-2">
						{#each o.organicEventsByCategory as cat}
							<div class="flex items-center justify-between text-sm">
								<span class="text-foreground capitalize">{cat.category}</span>
								<span class="text-foreground-muted font-mono">{cat.count}</span>
							</div>
						{/each}
					</div>
				{/if}
			</GlassCard>
		</div>

		<!-- Recent Organic Errors -->
		<GlassCard variant="frosted" class="p-5">
			<h3 class="text-sm font-medium text-foreground mb-3">Recent Errors (Organic)</h3>
			{#if o.recentErrors.length === 0}
				<p class="text-foreground-subtle text-sm">No organic errors in the last 24 hours</p>
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
								<p class="text-xs text-foreground-muted mt-0.5 pl-5 truncate">
									{err.message}
								</p>
							{/if}
							<p class="text-xs text-foreground-subtle mt-0.5 pl-5">
								{formatRelativeTime(err.recorded_at)}
							</p>
						</div>
					{/each}
				</div>
			{/if}
		</GlassCard>
	</div>

	<!-- Health Checks Section -->
	<div class="mb-8">
		<h2 class="text-lg font-serif text-foreground mb-4 flex items-center gap-2">
			<span class="text-foreground/40">●</span> Health Checks
		</h2>

		<GlassCard variant="frosted" class="p-5">
			{#if o.monitorRoutes.length === 0}
				<p class="text-foreground-subtle text-sm">No health check traffic</p>
			{:else}
				<div class="space-y-2">
					{#each o.monitorRoutes as route}
						<div class="flex items-center justify-between text-sm">
							<span class="text-foreground truncate max-w-[60%]">
								<span class="text-foreground-subtle">{route.app}</span>
								{route.route}
							</span>
							<div class="flex items-center gap-3">
								<span class="text-foreground-muted font-mono">{route.count}</span>
								{#if route.errors > 0}
									<span class="text-error-foreground font-mono text-xs">
										{route.errors} failed
									</span>
								{:else}
									<span class="text-accent-600 font-mono text-xs">ok</span>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</GlassCard>
	</div>

	<!-- Bot / Scanner Section -->
	<div class="mb-8">
		<h2 class="text-lg font-serif text-foreground mb-4 flex items-center gap-2">
			<span class="text-error-foreground/60">●</span> Bot / Scanner Noise
		</h2>

		<GlassCard variant="frosted" class="p-5">
			{#if o.botRoutes.length === 0}
				<p class="text-foreground-subtle text-sm">No bot traffic detected</p>
			{:else}
				<div class="space-y-2">
					{#each o.botRoutes as route}
						<div class="flex items-center justify-between text-sm">
							<span class="text-foreground truncate max-w-[60%]">
								<span class="text-foreground-subtle">{route.app}</span>
								<span class="text-foreground-muted">{route.route}</span>
							</span>
							<div class="flex items-center gap-3">
								<span class="text-foreground-muted font-mono">{route.count}</span>
								{#if route.status}
									<span
										class="font-mono text-xs"
										class:text-error-foreground={route.status >= 400}
										class:text-foreground-subtle={route.status < 400}
									>
										{route.status}
									</span>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</GlassCard>
	</div>

	<!-- Nav to sub-pages -->
	<div class="mt-8 flex gap-3">
		<a href="/arbor/pulse/funnel" class="text-sm text-primary hover:underline">Signup Funnel →</a>
		<a href="/arbor/pulse/errors" class="text-sm text-primary hover:underline">Error Log →</a>
	</div>
{/if}
