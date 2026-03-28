<script lang="ts">
	import GlassCard from "@autumnsgrove/lattice/ui/components/ui/GlassCard.svelte";
	import { stateIcons, actionIcons, metricIcons, authIcons } from "@autumnsgrove/prism/icons";
	import { formatRelativeTime } from "@autumnsgrove/lattice/curios/guestbook";

	interface PendingEntry {
		id: string;
		name: string;
		message: string;
		emoji: string | null;
		createdAt: string;
		entryStyle: string | null;
		entryColor: string | null;
	}

	interface Props {
		pendingEntries: PendingEntry[];
		loadingPending: boolean;
		onApprove: (id: string) => void;
		onDelete: (id: string) => void;
	}

	let { pendingEntries, loadingPending, onApprove, onDelete }: Props = $props();
</script>

<GlassCard class="moderation-card">
	{#if loadingPending}
		<div class="loading-state">
			<metricIcons.clock class="w-5 h-5 spin" />
			<span>Loading pending entries...</span>
		</div>
	{:else if pendingEntries.length === 0}
		<div class="empty-state">
			<authIcons.shield class="w-8 h-8" />
			<p>No entries awaiting approval</p>
			<span class="empty-hint">New entries will appear here when visitors sign your guestbook</span>
		</div>
	{:else}
		<div class="pending-list">
			{#each pendingEntries as entry}
				<div class="pending-entry">
					<div class="entry-header">
						<span class="entry-name">
							{#if entry.emoji}<span class="entry-emoji">{entry.emoji}</span>{/if}
							{entry.name}
						</span>
						<span class="entry-date">{formatRelativeTime(entry.createdAt)}</span>
					</div>
					<p class="entry-message">{entry.message}</p>
					{#if entry.entryStyle || entry.entryColor}
						<div class="entry-meta-badges">
							{#if entry.entryStyle}
								<span class="meta-badge">{entry.entryStyle}</span>
							{/if}
							{#if entry.entryColor}
								<span class="meta-color-dot" style:background={entry.entryColor}></span>
							{/if}
						</div>
					{/if}
					<div class="entry-actions">
						<button class="action-btn approve" onclick={() => onApprove(entry.id)} aria-label="Approve entry from {entry.name}">
							<stateIcons.check class="w-4 h-4" />
							Approve
						</button>
						<button class="action-btn delete" onclick={() => onDelete(entry.id)} aria-label="Delete entry from {entry.name}">
							<actionIcons.trash class="w-4 h-4" />
							Delete
						</button>
					</div>
				</div>
			{/each}
		</div>
	{/if}
</GlassCard>

<style>
	:global(.moderation-card) { padding: 1.5rem !important; }
	.loading-state, .empty-state { display: flex; flex-direction: column; align-items: center; gap: 0.75rem; padding: 3rem 1rem; text-align: center; color: var(--color-text-muted); }
	.empty-hint { font-size: 0.85rem; opacity: 0.7; }
	:global(.spin) { animation: spin 1s linear infinite; }
	@keyframes spin { to { transform: rotate(360deg); } }
	@media (prefers-reduced-motion: reduce) { :global(.spin) { animation: none; } }
	.pending-list { display: flex; flex-direction: column; gap: 1rem; }
	.pending-entry { padding: 1rem; border: 1px solid var(--color-border, #e5e7eb); border-radius: 0.75rem; background: var(--grove-overlay-4, rgba(0,0,0,0.02)); }
	.entry-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 0.5rem; }
	.entry-name { font-weight: 600; color: var(--color-text); display: flex; align-items: center; gap: 0.375rem; }
	.entry-emoji { font-size: 1.1em; }
	.entry-date { font-size: 0.8rem; color: var(--color-text-muted); }
	.entry-message { font-size: 0.9rem; color: var(--color-text); line-height: 1.5; margin: 0 0 0.75rem; white-space: pre-wrap; word-break: break-word; }
	.entry-meta-badges { display: flex; align-items: center; gap: 0.5rem; margin-bottom: 0.5rem; }
	.meta-badge { font-size: 0.7rem; font-weight: 500; padding: 0.15rem 0.5rem; border-radius: 2rem; background: var(--grove-overlay-4, rgba(0,0,0,0.06)); color: var(--color-text-muted); text-transform: capitalize; }
	.meta-color-dot { width: 0.75rem; height: 0.75rem; border-radius: 50%; flex-shrink: 0; box-shadow: 0 0 0 1px rgba(0,0,0,0.1); }
	.entry-actions { display: flex; gap: 0.5rem; }
	.action-btn { display: flex; align-items: center; gap: 0.375rem; padding: 0.375rem 0.75rem; border: 1px solid var(--color-border, #e5e7eb); border-radius: 0.5rem; background: transparent; cursor: pointer; font-size: 0.8rem; transition: all 0.2s ease; }
	.action-btn.approve { color: var(--grove-accent); }
	.action-btn.approve:hover { background: var(--grove-accent-10); border-color: var(--grove-accent); }
	.action-btn.delete { color: hsl(var(--destructive)); }
	.action-btn.delete:hover { background: hsl(var(--destructive) / 0.1); border-color: hsl(var(--destructive)); }
	:global(.dark) .action-btn.approve:hover { background: rgb(6 78 59 / 0.3); }
	:global(.dark) .action-btn.delete:hover { background: rgb(127 29 29 / 0.3); }

	@media (max-width: 640px) {
		.entry-header { flex-wrap: wrap; }
		.entry-actions { flex-wrap: wrap; }
	}
</style>
