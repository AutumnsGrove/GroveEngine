<script lang="ts">
	import GlassCard from "@autumnsgrove/lattice/ui/components/ui/GlassCard.svelte";
	import { stateIcons, authIcons } from "@autumnsgrove/prism/icons";

	interface Props {
		localBlocked: Array<{
			blocked_user_id: string;
			created_at: string;
			reason?: string | null;
		}>;
		unblocking: string | null;
		formatTimeAgo: (dateStr: string) => string;
		onUnblock: (userId: string) => void;
	}

	let { localBlocked, unblocking, formatTimeAgo, onUnblock }: Props = $props();
</script>

<div id="panel-blocked" role="tabpanel" aria-labelledby="tab-blocked">
	<GlassCard variant="default" class="overflow-hidden">
		{#if localBlocked.length > 0}
			<div class="comment-list">
				{#each localBlocked as blocked (blocked.blocked_user_id)}
					<div class="comment-card" class:moderating={unblocking === blocked.blocked_user_id}>
						<div class="comment-meta">
							<authIcons.userX class="reply-icon" />
							<span class="comment-author">
								Blocked user
								<span class="blocked-id"
									>&middot; {blocked.blocked_user_id.slice(0, 8)}&hellip;</span
								>
							</span>
							<span class="meta-sep" aria-hidden="true"></span>
							<time class="comment-time">{formatTimeAgo(blocked.created_at)}</time>
							{#if blocked.reason}
								<span class="meta-sep" aria-hidden="true"></span>
								<span class="block-reason">{blocked.reason}</span>
							{/if}
						</div>

						<div class="comment-actions">
							<button
								class="mod-btn mod-approve"
								onclick={() => onUnblock(blocked.blocked_user_id)}
								disabled={unblocking === blocked.blocked_user_id}
								title="Unblock this user"
							>
								<stateIcons.check class="mod-icon" />
								Unblock
							</button>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="empty-state">
				<stateIcons.ban class="empty-icon" />
				<p>Nobody blocked. That's the dream.</p>
			</div>
		{/if}
	</GlassCard>
</div>

<style>
	.comment-list {
		display: flex;
		flex-direction: column;
	}

	.comment-card {
		padding: 1rem 1.25rem;
		border-bottom: 1px solid var(--grove-border-subtle, rgba(0, 0, 0, 0.06));
		transition: opacity 0.2s;
	}

	:global(.dark) .comment-card {
		border-bottom-color: rgba(255, 255, 255, 0.08);
	}

	.comment-card:last-child {
		border-bottom: none;
	}

	.comment-card.moderating {
		opacity: 0.5;
		pointer-events: none;
	}

	.comment-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		margin-bottom: 0.5rem;
		font-size: 0.875rem;
		flex-wrap: wrap;
	}

	.comment-author {
		font-weight: 600;
		color: var(--color-text, #333);
	}

	:global(.dark) .comment-author {
		color: var(--grove-text-strong, #d4d4d4);
	}

	:global(.reply-icon) {
		width: 0.875rem;
		height: 0.875rem;
		color: var(--color-text-muted, #888);
	}

	.meta-sep {
		width: 3px;
		height: 3px;
		background: var(--color-text-muted, #999);
		border-radius: 50%;
		flex-shrink: 0;
	}

	.comment-time {
		color: var(--color-text-muted, #888);
	}

	.blocked-id {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 0.75rem;
		font-weight: 400;
		color: var(--color-text-muted, #888);
	}

	.block-reason {
		color: var(--color-text-muted, #888);
		font-style: italic;
	}

	.comment-actions {
		display: flex;
		gap: 0.5rem;
	}

	.mod-btn {
		display: inline-flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.625rem 1.125rem;
		min-height: 44px;
		font-size: 0.875rem;
		font-weight: 500;
		font-family: inherit;
		border: 1px solid;
		border-radius: 6px;
		cursor: pointer;
		transition:
			background 0.15s,
			color 0.15s;
	}

	.mod-btn:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	:global(.mod-icon) {
		width: 0.875rem;
		height: 0.875rem;
	}

	.mod-approve {
		color: var(--grove-accent-dark);
		background: var(--grove-accent-8);
		border-color: var(--grove-accent-20);
	}

	.mod-approve:hover:not(:disabled) {
		background: var(--grove-accent-15);
	}

	.empty-state {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		padding: 3rem 1rem;
		color: var(--color-text-muted, #888);
	}

	:global(.empty-icon) {
		width: 2rem;
		height: 2rem;
		opacity: 0.4;
	}

	.empty-state p {
		margin: 0;
		font-size: 0.9375rem;
		font-style: italic;
	}
</style>
