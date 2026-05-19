<script lang="ts">
	import type { PageData } from "./$types";
	import { GlassCard } from "@autumnsgrove/lattice/ui";

	let { data }: { data: PageData } = $props();

	const stepLabels: Record<string, string> = {
		"signup.oauth_complete": "OAuth Complete",
		"signup.profile_done": "Profile Done",
		"signup.email_verified": "Email Verified",
		"signup.plan_selected": "Plan Selected",
		"signup.checkout_complete": "Checkout Complete",
		"signup.tenant_created": "Tenant Created",
	};
</script>

<svelte:head>
	<title>Signup Funnel — Pulse</title>
</svelte:head>

<div class="mb-8">
	<a href="/arbor/pulse" class="text-sm text-primary hover:underline">← Pulse</a>
	<h1 class="text-2xl font-serif text-foreground mt-2">Signup Funnel</h1>
	<p class="text-foreground-muted font-sans mt-1">Last 30 days — where do signups drop off?</p>
</div>

{#if !data.dbAvailable}
	<GlassCard variant="frosted" class="p-6">
		<p class="text-foreground-muted">OBS_DB binding not available.</p>
	</GlassCard>
{:else if data.funnel}
	<GlassCard variant="frosted" class="p-5">
		<div class="space-y-4">
			{#each data.funnel as step, i}
				{@const maxCount = data.funnel[0]?.count ?? 1}
				{@const barWidth = maxCount > 0 ? (step.count / maxCount) * 100 : 0}
				<div>
					<div class="flex items-center justify-between text-sm mb-1">
						<span class="text-foreground font-medium">
							{stepLabels[step.step] ?? step.step}
						</span>
						<span class="text-foreground-muted font-mono">
							{step.count}
							{#if step.conversion !== null && i > 0}
								<span class="text-foreground-subtle ml-2">({step.conversion.toFixed(0)}%)</span>
							{/if}
						</span>
					</div>
					<div class="h-6 bg-surface-secondary rounded-md overflow-hidden">
						<div
							class="h-full bg-accent-500/60 rounded-md transition-all"
							style="width: {barWidth}%"
						></div>
					</div>
				</div>
			{/each}
		</div>
	</GlassCard>

	{#if data.funnel.every((s) => s.count === 0)}
		<p class="text-foreground-subtle text-sm mt-4">
			No signup events recorded yet. Deploy the pulse-collector and data will appear here.
		</p>
	{/if}
{/if}
