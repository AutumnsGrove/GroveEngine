<script lang="ts">
	import GlassCard from "@autumnsgrove/lattice/ui/components/ui/GlassCard.svelte";
	import { stateIcons, authIcons } from "@autumnsgrove/prism/icons";

	interface Props {
		localModerated: Array<{
			id: string;
			post_id: string;
			author_name: string;
			content: string;
			content_html?: string | null;
			created_at: string;
			moderated_at?: string | null;
			status: string;
		}>;
		moderating: string | null;
		getPostInfo: (postId: string) => { slug: string; title: string };
		formatTimeAgo: (dateStr: string) => string;
		onModerate: (commentId: string, postSlug: string, action: string) => void;
	}

	let { localModerated, moderating, getPostInfo, formatTimeAgo, onModerate }: Props = $props();
</script>

<div id="panel-moderated" role="tabpanel" aria-labelledby="tab-moderated">
	<GlassCard variant="default" class="overflow-hidden">
		{#if localModerated.length > 0}
			<div class="comment-list">
				{#each localModerated as comment (comment.id)}
					{@const post = getPostInfo(comment.post_id)}
					<div class="comment-card" class:moderating={moderating === comment.id}>
						<div class="comment-meta">
							<span class="status-label status-{comment.status}">{comment.status}</span>
							<span class="comment-author">{comment.author_name}</span>
							<span class="meta-sep" aria-hidden="true"></span>
							<time class="comment-time"
								>{formatTimeAgo(comment.moderated_at || comment.created_at)}</time
							>
							<span class="meta-sep" aria-hidden="true"></span>
							<a href="/garden/{post.slug}" class="comment-post" target="_blank">
								{post.title}
							</a>
						</div>

						<div class="comment-content">
							{#if comment.content_html}
								<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitized markdown output -->
								{@html comment.content_html}
							{:else}
								<p>{comment.content}</p>
							{/if}
						</div>

						<div class="comment-actions">
							<button
								class="mod-btn mod-approve"
								onclick={() => onModerate(comment.id, post.slug, "approve")}
								disabled={moderating === comment.id}
								title="Re-approve this comment"
							>
								<stateIcons.check class="mod-icon" />
								Approve
							</button>
						</div>
					</div>
				{/each}
			</div>
		{:else}
			<div class="empty-state">
				<authIcons.shieldAlert class="empty-icon" />
				<p>No moderated comments — your garden's been peaceful.</p>
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

	.comment-post {
		color: var(--grove-accent);
		text-decoration: none;
		font-weight: 500;
	}

	.comment-post:hover {
		text-decoration: underline;
	}

	.comment-content {
		font-size: 0.9375rem;
		line-height: 1.6;
		color: var(--color-text, #333);
		margin-bottom: 0.75rem;
	}

	:global(.dark) .comment-content {
		color: var(--grove-text-strong, #d4d4d4);
	}

	.comment-content :global(p) {
		margin: 0 0 0.5rem 0;
	}

	.comment-content :global(p:last-child) {
		margin-bottom: 0;
	}

	.status-label {
		display: inline-block;
		padding: 0.125rem 0.5rem;
		border-radius: 4px;
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	:global(.status-rejected) {
		background: rgba(185, 28, 28, 0.1);
		color: #b91c1c;
	}

	:global(.status-spam) {
		background: rgba(146, 64, 14, 0.1);
		color: #92400e;
	}

	:global(.dark .status-rejected) {
		background: rgba(239, 68, 68, 0.15);
		color: #fca5a5;
	}

	:global(.dark .status-spam) {
		background: rgba(251, 191, 36, 0.15);
		color: #fcd34d;
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
