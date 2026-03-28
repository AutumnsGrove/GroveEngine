<script lang="ts">
	import GlassCard from "@autumnsgrove/lattice/ui/components/ui/GlassCard.svelte";
	import Badge from "@autumnsgrove/lattice/ui/components/ui/Badge.svelte";
	import { toast } from "@autumnsgrove/lattice/ui/components/ui/toast";
	import { ArborSection } from "@autumnsgrove/lattice/ui/arbor";
	import { featureIcons, stateIcons, authIcons } from "@autumnsgrove/prism/icons";
	import { api } from "@autumnsgrove/lattice/utils/api";
	import { invalidateAll } from "$app/navigation";
	import ReedsInboxPanel from "./ReedsInboxPanel.svelte";
	import ReedsModeratedPanel from "./ReedsModeratedPanel.svelte";
	import ReedsBlockedPanel from "./ReedsBlockedPanel.svelte";
	import ReedsSettingsPanel from "./ReedsSettingsPanel.svelte";

	let { data } = $props();

	type TabId = "inbox" | "moderated" | "blocked" | "settings";
	let activeTab = $state<TabId>("inbox");
	let moderating = $state<string | null>(null);
	let unblocking = $state<string | null>(null);
	let savingSettings = $state(false);

	// Local mutable copies of server data
	// svelte-ignore state_referenced_locally
	let localPending = $state(data.pending ?? []);
	// svelte-ignore state_referenced_locally
	let localModerated = $state(data.moderated ?? []);
	// svelte-ignore state_referenced_locally
	let localBlocked = $state(data.blocked ?? []);

	// Sync when SvelteKit provides fresh page data
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

	// Unified inbox
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

	// Local settings state
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

			localPending = localPending.filter((c: { id: string }) => c.id !== commentId);
			localModerated = localModerated.filter((c: { id: string }) => c.id !== commentId);

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

			localBlocked = localBlocked.filter(
				(b: { blocked_user_id: string }) => b.blocked_user_id !== userId,
			);

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

		{#if activeTab === "inbox"}
			<ReedsInboxPanel {inboxItems} {moderating} {getPostInfo} {formatTimeAgo} onModerate={moderate} />
		{/if}

		{#if activeTab === "moderated"}
			<ReedsModeratedPanel {localModerated} {moderating} {getPostInfo} {formatTimeAgo} onModerate={moderate} />
		{/if}

		{#if activeTab === "blocked"}
			<ReedsBlockedPanel {localBlocked} {unblocking} {formatTimeAgo} onUnblock={unblock} />
		{/if}

		{#if activeTab === "settings"}
			<ReedsSettingsPanel
				{commentsEnabled}
				{publicEnabled}
				{whoCanComment}
				{showCount}
				{savingSettings}
				onCommentsEnabledToggle={() => (commentsEnabled = commentsEnabled ? 0 : 1)}
				onPublicEnabledToggle={() => (publicEnabled = publicEnabled ? 0 : 1)}
				onWhoCanCommentChange={(v) => (whoCanComment = v)}
				onShowCountToggle={() => (showCount = showCount ? 0 : 1)}
				onSaveSettings={saveSettings}
			/>
		{/if}
	</div>
</ArborSection>

<style>
	.reeds-admin {
		max-width: 800px;
	}

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

	@media (prefers-reduced-motion: reduce) {
		.tab {
			transition: none;
		}
	}

	@media (max-width: 600px) {
		.tab {
			padding: 0.625rem 0.75rem;
			font-size: 0.8125rem;
		}
	}
</style>
