<script lang="ts">
	/**
	 * CurioHitcounter — Retro-style page visit counter
	 *
	 * Fetches the current hit count from the API (auto-increments on load)
	 * and displays it as a row of digit cells, like those old-school
	 * "You are visitor #000042" counters from the '90s web.
	 */

	let { arg = '' }: { arg?: string } = $props();

	let data = $state<{
		count: number;
		formattedCount: string;
		digits: string[];
		style: string;
		label: string;
		showSinceDate: boolean;
		startedAt: string;
	} | null>(null);
	let loading = $state(true);
	let error = $state(false);

	$effect(() => {
		const page = arg || window.location.pathname;
		fetch(`/api/curios/hitcounter?page=${encodeURIComponent(page)}&increment=true`) // csrf-ok
			.then((r) => {
				if (!r.ok) throw new Error(`HTTP ${r.status}`);
				return r.json() as Promise<typeof data>;
			})
			.then((d) => {
				data = d;
				loading = false;
			})
			.catch(() => {
				error = true;
				loading = false;
			});
	});
</script>

{#if loading}
	<div class="grove-curio-skeleton" role="status">
		<span class="sr-only">Loading hit counter…</span>
		<div class="hitcounter-skeleton">
			{#each Array(6) as _}
				<span class="hitcounter-digit-placeholder">&nbsp;</span>
			{/each}
		</div>
	</div>
{:else if error}
	<span class="grove-curio-error">Hit counter unavailable</span>
{:else if data}
	<div class="hitcounter" role="img" aria-label="{data.label} number {data.formattedCount}">
		<span class="hitcounter-label">{data.label}</span>
		<div class="hitcounter-digits">
			{#each data.digits as digit}
				<span class="hitcounter-digit">{digit}</span>
			{/each}
		</div>
		{#if data.showSinceDate && data.startedAt}
			<span class="hitcounter-since">
				since {new Date(data.startedAt).toLocaleDateString(undefined, { year: 'numeric', month: 'short' })}
			</span>
		{/if}
	</div>
{/if}

<style>
	.hitcounter {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.25rem;
		padding: 0.75rem 1rem;
		font-family: 'Courier New', Consolas, monospace;
	}

	.hitcounter-label {
		font-size: 0.75rem;
		text-transform: uppercase;
		letter-spacing: 0.1em;
		opacity: 0.7;
	}

	.hitcounter-digits {
		display: flex;
		gap: 2px;
	}

	.hitcounter-digit {
		display: inline-flex;
		align-items: center;
		justify-content: center;
		width: 1.75rem;
		height: 2.25rem;
		background: #1a1a2e;
		color: #4ade80;
		font-size: 1.25rem;
		font-weight: bold;
		border-radius: 3px;
		border: 1px solid #333;
	}

	.hitcounter-since {
		font-size: 0.625rem;
		opacity: 0.5;
		font-style: italic;
	}

	.hitcounter-skeleton {
		display: flex;
		gap: 2px;
		justify-content: center;
	}

	.hitcounter-digit-placeholder {
		display: inline-block;
		width: 1.75rem;
		height: 2.25rem;
		background: rgba(0, 0, 0, 0.1);
		border-radius: 3px;
	}

	.sr-only {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		border: 0;
	}
</style>
