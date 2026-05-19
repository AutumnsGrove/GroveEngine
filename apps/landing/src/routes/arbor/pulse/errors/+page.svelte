<script lang="ts">
	import type { PageData } from "./$types";
	import { GlassCard } from "@autumnsgrove/lattice/ui";
	import { formatRelativeTime as _frt } from "@autumnsgrove/lattice/utils";
	import { stateIcons } from "@autumnsgrove/prism/icons";

	const AlertCircle = stateIcons.alertCircle;

	let { data }: { data: PageData } = $props();
	let expanded = $state<number | null>(null);

	const formatRelativeTime = (v: number | null) => _frt(v, "Never");

	function toggle(i: number) {
		expanded = expanded === i ? null : i;
	}
</script>

<svelte:head>
	<title>Error Log — Pulse</title>
</svelte:head>

<div class="mb-8">
	<a href="/arbor/pulse" class="text-sm text-primary hover:underline">← Pulse</a>
	<h1 class="text-2xl font-serif text-foreground mt-2">Error Log</h1>
	<p class="text-foreground-muted font-sans mt-1">
		{data.total} total errors
		{#if data.appFilter}
			<span class="text-primary">filtered: {data.appFilter}</span>
			<a href="/arbor/pulse/errors" class="text-foreground-subtle ml-2 hover:underline">clear</a>
		{/if}
	</p>
</div>

{#if !data.dbAvailable}
	<GlassCard variant="frosted" class="p-6">
		<p class="text-foreground-muted">OBS_DB binding not available.</p>
	</GlassCard>
{:else if data.errors.length === 0}
	<GlassCard variant="frosted" class="p-6">
		<p class="text-foreground-subtle">No errors recorded. That's good news.</p>
	</GlassCard>
{:else}
	<div class="space-y-2">
		{#each data.errors as err, i}
			<GlassCard variant="frosted" class="p-4 cursor-pointer" onclick={() => toggle(i)}>
				<div class="flex items-center gap-2 text-sm">
					<AlertCircle class="w-3.5 h-3.5 text-error-foreground shrink-0" />
					<a
						href="/arbor/pulse/errors?app={err.app}"
						class="text-foreground-subtle hover:underline"
						onclick={(e) => e.stopPropagation()}>{err.app}</a
					>
					<span class="text-foreground truncate">{err.route}</span>
					{#if err.method}
						<span class="text-foreground-subtle font-mono text-xs">{err.method}</span>
					{/if}
					{#if err.status}
						<span class="text-error-foreground font-mono text-xs">{err.status}</span>
					{/if}
					<span class="text-foreground-subtle text-xs ml-auto shrink-0"
						>{formatRelativeTime(err.recorded_at)}</span
					>
				</div>
				{#if err.message}
					<p class="text-xs text-foreground-muted mt-1 pl-5">{err.message}</p>
				{/if}
				{#if expanded === i && err.stack}
					<pre
						class="text-xs text-foreground-subtle mt-2 pl-5 font-mono whitespace-pre-wrap overflow-x-auto">{err.stack}</pre>
				{/if}
			</GlassCard>
		{/each}
	</div>
{/if}
