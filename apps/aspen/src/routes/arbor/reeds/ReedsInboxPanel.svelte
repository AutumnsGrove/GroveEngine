<script lang="ts">
	import GlassCard from "@autumnsgrove/lattice/ui/components/ui/GlassCard.svelte";
	import { featureIcons, stateIcons } from "@autumnsgrove/prism/icons";

	type InboxItem = {
		kind: "pending" | "reply";
		id: string;
		post_id: string;
		author_name: string;
		content: string;
		content_html?: string | null;
		created_at: string;
	};

	interface Props {
		inboxItems: InboxItem[];
		moderating: string | null;
		getPostInfo: (postId: string) => { slug: string; title: string };
		formatTimeAgo: (dateStr: string) => string;
		onModerate: (commentId: string, postSlug: string, action: string) => void;
	}

	let { inboxItems, moderating, getPostInfo, formatTimeAgo, onModerate }: Props = $props();
</script>

<div id="panel-inbox" role="tabpanel" aria-labelledby="tab-inbox">
	<GlassCard variant="default" class="overflow-hidden">
		{#if inboxItems.length > 0}
			<div class="comment-list">
				{#each inboxItems as item (item.id)}
					{@const post = getPostInfo(item.post_id)}
					<div class="comment-card" class:moderating={moderating === item.id}>
						<div class="comment-meta">
							{#if item.kind === "pending"}
								<span class="inbox-badge inbox-pending">Pending</span>
							{:else}
								<featureIcons.mail class="reply-icon" />
								<span class="inbox-badge inbox-private">Private</span>
							{/if}
							<span class="comment-author">{item.author_name}</span>
							<span class="meta-sep" aria-hidden="true"></span>
							<time class="comment-time">{formatTimeAgo(item.created_at)}</time>
							<span class="meta-sep" aria-hidden="true"></span>
							<a href="/garden/{post.slug}" class="comment-post" target="_blank">
								{post.title}
							</a>
						</div>

						<div class="comment-content">
							{#if item.content_html}
								<!-- eslint-disable-next-line svelte/no-at-html-tags -- sanitized markdown output -->
								{@html item.content_html}
							{:else}
								<p>{item.content}</p>
							{/if}
						</div>

						{#if item.kind === "pending"}
							<div class="comment-actions">
								<button
									class="mod-btn mod-approve"
									onclick={() => onModerate(item.id, post.slug, "approve")}
									disabled={moderating === item.id}
									title="Approve"
								>
									<stateIcons.check class="mod-icon" />
									Approve
								</button>
								<button
									class="mod-btn mod-reject"
									onclick={() => onModerate(item.id, post.slug, "reject")}
									disabled={moderating === item.id}
									title="Reject"
								>
									<stateIcons.x class="mod-icon" />
									Reject
								</button>
								<button
									class="mod-btn mod-block"
									onclick={() => onModerate(item.id, post.slug, "block_user")}
									disabled={moderating === item.id}
									title="Block this user"
								>
									<stateIcons.ban class="mod-icon" />
									Block
								</button>
							</div>
						{/if}
					</div>
				{/each}
			</div>
		{:else}
			<div class="empty-state">
				<featureIcons.messageSquare class="empty-icon" />
				<p>All quiet in the reeds. When someone leaves a thought, it'll appear here.</p>
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

	:global(.dark) .comment-post {
		color: var(--grove-accent);
	}

	:global(.reply-icon) {
		width: 0.875rem;
		height: 0.875rem;
		color: var(--color-text-muted, #888);
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

	.inbox-badge {
		display: inline-block;
		padding: 0.125rem 0.5rem;
		border-radius: 4px;
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.inbox-pending {
		background: rgba(234, 179, 8, 0.12);
		color: #b45309;
	}

	:global(.dark) .inbox-pending {
		background: rgba(234, 179, 8, 0.15);
		color: #fbbf24;
	}

	.inbox-private {
		background: var(--grove-accent-8);
		color: var(--grove-accent-dark);
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

	.mod-btn:focus-visible {
		outline: 2px solid currentColor;
		outline-offset: 2px;
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

	.mod-reject {
		color: #b91c1c;
		background: rgba(185, 28, 28, 0.08);
		border-color: rgba(185, 28, 28, 0.2);
	}

	.mod-reject:hover:not(:disabled) {
		background: rgba(185, 28, 28, 0.15);
	}

	.mod-block {
		color: #92400e;
		background: rgba(146, 64, 14, 0.08);
		border-color: rgba(146, 64, 14, 0.2);
	}

	.mod-block:hover:not(:disabled) {
		background: rgba(146, 64, 14, 0.15);
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

	@media (prefers-reduced-motion: reduce) {
		.comment-card,
		.mod-btn {
			transition: none;
		}
	}

	@media (max-width: 600px) {
		.comment-card {
			padding: 0.75rem 0.875rem;
		}

		.comment-actions {
			flex-wrap: wrap;
		}

		.mod-btn {
			padding: 0.5rem 0.75rem;
			font-size: 0.8125rem;
		}
	}
</style>
