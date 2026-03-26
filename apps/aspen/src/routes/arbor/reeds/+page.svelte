<script lang="ts">
	import GlassCard from "@autumnsgrove/lattice/ui/components/ui/GlassCard.svelte";
	import Badge from "@autumnsgrove/lattice/ui/components/ui/Badge.svelte";
	import { toast } from "@autumnsgrove/lattice/ui/components/ui/toast";
	import { ArborSection } from "@autumnsgrove/lattice/ui/arbor";
	import { featureIcons, stateIcons, authIcons } from "@autumnsgrove/prism/icons";
	import { api } from "@autumnsgrove/lattice/utils/api";
	import { invalidateAll } from "$app/navigation";

	let { data } = $props();

	type TabId = "inbox" | "moderated" | "blocked" | "settings";
	let activeTab = $state<TabId>("inbox");
	let moderating = $state<string | null>(null);
	let unblocking = $state<string | null>(null);
	let savingSettings = $state(false);

	// Local mutable copies of server data — $state ensures derived values
	// (inboxItems, badge counts) reliably react to optimistic removals.
	// svelte-ignore state_referenced_locally
	let localPending = $state(data.pending ?? []);
	// svelte-ignore state_referenced_locally
	let localModerated = $state(data.moderated ?? []);
	// svelte-ignore state_referenced_locally
	let localBlocked = $state(data.blocked ?? []);

	// Sync when SvelteKit provides fresh page data (e.g. navigation)
	$effect(() => {
		localPending = data.pending ?? [];
	});
	$effect(() => {
		localModerated = data.moderated ?? [];
	});
	$effect(() => {
		localBlocked = data.blocked ?? [];
	});

	let pendingCount = $derived(localPending.length);
	let moderatedCount = $derived(localModerated.length);
	let blockedCount = $derived(localBlocked.length);

	// Unified inbox: pending + replies sorted newest-first
	type InboxItem = {
		kind: "pending" | "reply";
		id: string;
		post_id: string;
		author_name: string;
		content: string;
		content_html?: string | null;
		created_at: string;
	};

	let inboxItems = $derived.by(() => {
		const pending: InboxItem[] = localPending.map(
			(c: {
				id: string;
				post_id: string;
				author_name: string;
				content: string;
				content_html?: string | null;
				created_at: string;
			}) => ({
				...c,
				kind: "pending" as const,
			}),
		);
		const replies: InboxItem[] = (data.replies ?? []).map(
			(r: {
				id: string;
				post_id: string;
				author_name: string;
				content: string;
				content_html?: string | null;
				created_at: string;
			}) => ({
				...r,
				kind: "reply" as const,
			}),
		);
		return [...pending, ...replies].sort(
			(a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
		);
	});

	// Local settings state (editable copy)
	// svelte-ignore state_referenced_locally
	let commentsEnabled = $state(data.settings?.comments_enabled ?? 1);
	// svelte-ignore state_referenced_locally
	let publicEnabled = $state(data.settings?.public_comments_enabled ?? 1);
	// svelte-ignore state_referenced_locally
	let whoCanComment = $state(data.settings?.who_can_comment ?? "anyone");
	// svelte-ignore state_referenced_locally
	let showCount = $state(data.settings?.show_comment_count ?? 1);

	function getPostInfo(postId: string) {
		return data.postMap?.[postId] || { slug: "unknown", title: "Unknown Post" };
	}

	function formatTimeAgo(dateStr: string): string {
		const date = new Date(dateStr);
		const now = new Date();
		const diffMs = now.getTime() - date.getTime();
		const diffMins = Math.floor(diffMs / 60_000);
		const diffHours = Math.floor(diffMs / 3_600_000);
		const diffDays = Math.floor(diffMs / 86_400_000);

		if (diffMins < 1) return "just now";
		if (diffMins < 60) return `${diffMins}m ago`;
		if (diffHours < 24) return `${diffHours}h ago`;
		if (diffDays < 30) return `${diffDays}d ago`;

		return date.toLocaleDateString("en-US", {
			month: "short",
			day: "numeric",
		});
	}

	async function moderate(commentId: string, postSlug: string, action: string) {
		moderating = commentId;

		try {
			const result = await api.post<{ message?: string }>(
				`/api/reeds/${postSlug}/${commentId}/moderate`,
				{ action },
			);
			toast.success(result?.message || "Done!");

			// Optimistic removal from local state
			localPending = localPending.filter((c: { id: string }) => c.id !== commentId);
			localModerated = localModerated.filter((c: { id: string }) => c.id !== commentId);

			// Sync with server to ensure consistency
			invalidateAll();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Something went wrong");
		} finally {
			moderating = null;
		}
	}

	async function unblock(userId: string) {
		unblocking = userId;

		try {
			await api.delete(`/api/reeds/blocked/${userId}`);
			toast.success("User unblocked.");

			// Optimistic removal from local state
			localBlocked = localBlocked.filter(
				(b: { blocked_user_id: string }) => b.blocked_user_id !== userId,
			);

			// Sync with server to ensure consistency
			invalidateAll();
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Something went wrong");
		} finally {
			unblocking = null;
		}
	}

	async function saveSettings() {
		savingSettings = true;

		try {
			await api.patch("/api/reeds/settings", {
				comments_enabled: commentsEnabled,
				public_comments_enabled: publicEnabled,
				who_can_comment: whoCanComment,
				show_comment_count: showCount,
			});
			toast.success("Settings saved.");
		} catch (err) {
			toast.error(err instanceof Error ? err.message : "Something went wrong");
		} finally {
			savingSettings = false;
		}
	}
</script>

<ArborSection
	title="Reeds"
	icon={featureIcons.messageSquare}
	description="Comments and replies on your posts."
	backHref="/arbor"
	backLabel="Dashboard"
>
	<div class="reeds-admin">
		<!-- Tab navigation -->
		<div class="tab-bar" role="tablist">
			<button
				role="tab"
				id="tab-inbox"
				aria-selected={activeTab === "inbox"}
				aria-controls="panel-inbox"
				class="tab"
				class:active={activeTab === "inbox"}
				onclick={() => (activeTab = "inbox")}
			>
				Inbox
				{#if pendingCount > 0}
					<Badge variant="destructive">{pendingCount}</Badge>
				{/if}
			</button>
			<button
				role="tab"
				id="tab-moderated"
				aria-selected={activeTab === "moderated"}
				aria-controls="panel-moderated"
				class="tab"
				class:active={activeTab === "moderated"}
				onclick={() => (activeTab = "moderated")}
			>
				Moderated
				{#if moderatedCount > 0}
					<Badge variant="secondary">{moderatedCount}</Badge>
				{/if}
			</button>
			<button
				role="tab"
				id="tab-blocked"
				aria-selected={activeTab === "blocked"}
				aria-controls="panel-blocked"
				class="tab"
				class:active={activeTab === "blocked"}
				onclick={() => (activeTab = "blocked")}
			>
				Blocked
				{#if blockedCount > 0}
					<Badge variant="secondary">{blockedCount}</Badge>
				{/if}
			</button>
			<button
				role="tab"
				id="tab-settings"
				aria-selected={activeTab === "settings"}
				aria-controls="panel-settings"
				class="tab"
				class:active={activeTab === "settings"}
				onclick={() => (activeTab = "settings")}
			>
				Settings
			</button>
		</div>

		<!-- Inbox (pending + private replies) -->
		{#if activeTab === "inbox"}
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
												onclick={() => moderate(item.id, post.slug, "approve")}
												disabled={moderating === item.id}
												title="Approve"
											>
												<stateIcons.check class="mod-icon" />
												Approve
											</button>
											<button
												class="mod-btn mod-reject"
												onclick={() => moderate(item.id, post.slug, "reject")}
												disabled={moderating === item.id}
												title="Reject"
											>
												<stateIcons.x class="mod-icon" />
												Reject
											</button>
											<button
												class="mod-btn mod-block"
												onclick={() => moderate(item.id, post.slug, "block_user")}
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
		{/if}

		<!-- Moderated (rejected/spam) -->
		{#if activeTab === "moderated"}
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
											onclick={() => moderate(comment.id, post.slug, "approve")}
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
		{/if}

		<!-- Blocked users -->
		{#if activeTab === "blocked"}
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
											onclick={() => unblock(blocked.blocked_user_id)}
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
		{/if}

		<!-- Settings -->
		{#if activeTab === "settings"}
			<div id="panel-settings" role="tabpanel" aria-labelledby="tab-settings">
				<GlassCard variant="default">
					<div class="settings-form">
						<div class="setting-group">
							<span class="setting-label" id="label-comments-enabled">
								<span class="setting-name">Comments enabled</span>
								<span class="setting-desc">Allow visitors to leave comments on your posts</span>
							</span>
							<button
								class="toggle-btn"
								class:on={commentsEnabled}
								onclick={() => (commentsEnabled = commentsEnabled ? 0 : 1)}
								role="switch"
								aria-checked={!!commentsEnabled}
								aria-labelledby="label-comments-enabled"
							>
								<span class="toggle-track">
									<span class="toggle-thumb"></span>
								</span>
							</button>
						</div>

						<div class="setting-group">
							<span class="setting-label" id="label-public-comments">
								<span class="setting-name">Public comments</span>
								<span class="setting-desc"
									>Allow public comments visible to all readers (otherwise, only private replies to
									you)</span
								>
							</span>
							<button
								class="toggle-btn"
								class:on={publicEnabled}
								onclick={() => (publicEnabled = publicEnabled ? 0 : 1)}
								role="switch"
								aria-checked={!!publicEnabled}
								aria-labelledby="label-public-comments"
							>
								<span class="toggle-track">
									<span class="toggle-thumb"></span>
								</span>
							</button>
						</div>

						<div class="setting-group">
							<label class="setting-label" for="who-can-comment">
								<span class="setting-name">Who can comment</span>
								<span class="setting-desc">Restrict who is allowed to leave comments</span>
							</label>
							<select id="who-can-comment" class="setting-select" bind:value={whoCanComment}>
								<option value="anyone">Anyone (signed in)</option>
								<option value="grove_members">Grove members only</option>
								<option value="paid_only">Paid subscribers only</option>
								<option value="nobody">Nobody (disabled)</option>
							</select>
						</div>

						<div class="setting-group">
							<span class="setting-label" id="label-show-count">
								<span class="setting-name">Show comment count</span>
								<span class="setting-desc">Display comment count badge on blog posts</span>
							</span>
							<button
								class="toggle-btn"
								class:on={showCount}
								onclick={() => (showCount = showCount ? 0 : 1)}
								role="switch"
								aria-checked={!!showCount}
								aria-labelledby="label-show-count"
							>
								<span class="toggle-track">
									<span class="toggle-thumb"></span>
								</span>
							</button>
						</div>

						<div class="setting-actions">
							<button class="save-btn" onclick={saveSettings} disabled={savingSettings}>
								{savingSettings ? "Saving..." : "Save Settings"}
							</button>
						</div>
					</div>
				</GlassCard>
			</div>
		{/if}
	</div>
</ArborSection>

<style>
	.reeds-admin {
		max-width: 800px;
	}

	/* Tab bar */
	.tab-bar {
		display: flex;
		gap: 0.125rem;
		margin-bottom: 1rem;
		border-bottom: 1px solid var(--grove-border-subtle, rgba(0, 0, 0, 0.08));
		overflow-x: auto;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none;
	}

	:global(.dark) .tab-bar {
		border-bottom-color: rgba(255, 255, 255, 0.1);
	}

	.tab-bar::-webkit-scrollbar {
		display: none;
	}

	.tab {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.75rem 1rem;
		min-height: 44px;
		white-space: nowrap;
		background: none;
		border: none;
		border-bottom: 2px solid transparent;
		color: var(--color-text-muted, #666);
		font-size: 0.875rem;
		font-weight: 500;
		font-family: inherit;
		cursor: pointer;
		transition:
			color 0.15s,
			border-color 0.15s;
	}

	.tab:hover {
		color: var(--color-text, #333);
	}

	.tab:focus-visible {
		outline: 2px solid var(--grove-accent);
		outline-offset: -2px;
	}

	:global(.dark) .tab:focus-visible {
		outline-color: var(--grove-accent);
	}

	.tab.active {
		color: var(--grove-accent);
		border-bottom-color: var(--grove-accent);
	}

	:global(.dark) .tab.active {
		color: var(--grove-accent);
		border-bottom-color: var(--grove-accent);
	}

	/* Comment cards */
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

	/* Inbox badges */
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

	/* Blocked user display */
	.blocked-id {
		font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace;
		font-size: 0.75rem;
		font-weight: 400;
		color: var(--color-text-muted, #888);
	}

	/* Status labels for moderated tab */
	.status-label {
		display: inline-block;
		padding: 0.125rem 0.5rem;
		border-radius: 4px;
		font-size: 0.7rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.03em;
	}

	.status-rejected {
		background: rgba(185, 28, 28, 0.1);
		color: #b91c1c;
	}

	.status-spam {
		background: rgba(146, 64, 14, 0.1);
		color: #92400e;
	}

	:global(.dark) .status-rejected {
		background: rgba(239, 68, 68, 0.15);
		color: #fca5a5;
	}

	:global(.dark) .status-spam {
		background: rgba(251, 191, 36, 0.15);
		color: #fcd34d;
	}

	.block-reason {
		color: var(--color-text-muted, #888);
		font-style: italic;
	}

	/* Action buttons */
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

	/* Settings form */
	.settings-form {
		padding: 0.5rem 0;
	}

	.setting-group {
		display: flex;
		align-items: center;
		justify-content: space-between;
		gap: 1rem;
		padding: 1rem 1.25rem;
		border-bottom: 1px solid var(--grove-border-subtle, rgba(0, 0, 0, 0.06));
	}

	.setting-group:last-of-type {
		border-bottom: none;
	}

	:global(.dark) .setting-group {
		border-bottom-color: rgba(255, 255, 255, 0.08);
	}

	:global(.dark) .setting-group:last-of-type {
		border-bottom: none;
	}

	.setting-label {
		display: flex;
		flex-direction: column;
		gap: 0.125rem;
		flex: 1;
		min-width: 0;
	}

	.setting-name {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--color-text, #333);
	}

	:global(.dark) .setting-name {
		color: var(--grove-text-strong, #d4d4d4);
	}

	.setting-desc {
		font-size: 0.8125rem;
		color: var(--color-text-muted, #888);
		line-height: 1.4;
	}

	/* Toggle switch */
	.toggle-btn {
		background: none;
		border: none;
		cursor: pointer;
		padding: 4px;
		min-width: 44px;
		min-height: 44px;
		display: flex;
		align-items: center;
		justify-content: center;
		flex-shrink: 0;
	}

	.toggle-btn:focus-visible {
		outline: 2px solid var(--grove-accent);
		outline-offset: 2px;
		border-radius: 14px;
	}

	.toggle-track {
		position: relative;
		width: 40px;
		height: 22px;
		border-radius: 11px;
		background: var(--grove-overlay-20, rgba(0, 0, 0, 0.12));
		transition: background 0.2s;
	}

	:global(.dark) .toggle-track {
		background: #4b5563; /* gray-600 — visible off-state on dark backgrounds */
	}

	.toggle-btn.on .toggle-track {
		background: var(--grove-accent);
	}

	:global(.dark) .toggle-btn.on .toggle-track {
		background: var(--grove-accent);
	}

	.toggle-thumb {
		position: absolute;
		top: 2px;
		left: 2px;
		width: 18px;
		height: 18px;
		border-radius: 50%;
		background: white;
		transition: transform 0.2s;
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.2);
	}

	.toggle-btn.on .toggle-thumb {
		transform: translateX(18px);
	}

	/* Select dropdown */
	.setting-select {
		padding: 0.5rem 0.75rem;
		min-height: 44px;
		border: 1px solid var(--grove-border-subtle, rgba(0, 0, 0, 0.12));
		border-radius: 6px;
		background: var(--grove-overlay-4, rgba(255, 255, 255, 0.7));
		color: var(--color-text, #333);
		font-family: inherit;
		font-size: 0.875rem;
		cursor: pointer;
		flex-shrink: 0;
	}

	.setting-select:focus-visible {
		outline: 2px solid var(--grove-accent);
		outline-offset: 2px;
	}

	:global(.dark) .setting-select {
		background: rgba(255, 255, 255, 0.06);
		border-color: rgba(255, 255, 255, 0.1);
		color: var(--grove-text-strong, #d4d4d4);
	}

	.setting-actions {
		padding: 1.25rem;
		display: flex;
		justify-content: flex-end;
	}

	.save-btn {
		padding: 0.625rem 1.5rem;
		min-height: 44px;
		background: var(--grove-accent);
		color: white;
		border: none;
		border-radius: 6px;
		font-family: inherit;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: opacity 0.15s;
	}

	.save-btn:hover:not(:disabled) {
		opacity: 0.9;
	}

	.save-btn:disabled {
		opacity: 0.6;
		cursor: not-allowed;
	}

	.save-btn:focus-visible {
		outline: 2px solid var(--grove-accent);
		outline-offset: 2px;
	}

	:global(.dark) .save-btn {
		background: var(--grove-accent);
		color: #1a1a1a;
	}

	@media (prefers-reduced-motion: reduce) {
		.tab,
		.comment-card,
		.mod-btn,
		.toggle-track,
		.toggle-thumb,
		.save-btn {
			transition: none;
		}
	}

	@media (max-width: 640px) {
		.setting-group {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.75rem;
		}

		.setting-select {
			width: 100%;
		}
	}

	@media (max-width: 600px) {
		.tab {
			padding: 0.625rem 0.75rem;
			font-size: 0.8125rem;
		}

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

		.setting-group {
			padding: 0.875rem 1rem;
		}

		.setting-actions {
			padding: 1rem;
		}
	}
</style>
