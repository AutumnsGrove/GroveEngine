<script lang="ts">
	import { invalidateAll } from "$app/navigation";
	import GlassCard from "@autumnsgrove/lattice/ui/components/ui/GlassCard.svelte";
	import GlassButton from "@autumnsgrove/lattice/ui/components/ui/GlassButton.svelte";
	import Badge from "@autumnsgrove/lattice/ui/components/ui/Badge.svelte";
	import { toast } from "@autumnsgrove/lattice/ui/components/ui/toast";
	import GuestbookPreview from "@autumnsgrove/lattice/curios/guestbook/GuestbookPreview.svelte";
	import "@autumnsgrove/lattice/styles/fonts-optional.css";
	import { featureIcons, stateIcons, navIcons } from "@autumnsgrove/prism/icons";
	import {
		type GuestbookStyle,
		type GuestbookWallBacking,
		type GuestbookSigningStyle,
		type GuestbookCtaStyle,
		type GuestbookInlineMode,
		VALID_SIGNING_STYLES,
		DEFAULT_COLOR_PALETTE,
	} from "@autumnsgrove/lattice/curios/guestbook";
	import GuestbookSettingsPanel from "./GuestbookSettingsPanel.svelte";
	import GuestbookModerationTab from "./GuestbookModerationTab.svelte";

	let { data, form } = $props();

	// Config form state
	let enabled = $state(false);
	let style = $state<GuestbookStyle>("cozy");
	let entriesPerPage = $state(20);
	let requireApproval = $state(true);
	let allowEmoji = $state(true);
	let maxMessageLength = $state(500);
	let customPrompt = $state("");
	let isSubmitting = $state(false);

	// Enhancement config state
	let wallBacking = $state<GuestbookWallBacking>("none");
	let ctaStyle = $state<GuestbookCtaStyle>("button");
	let inlineMode = $state<GuestbookInlineMode>("compact");
	let allowedStyles = $state<GuestbookSigningStyle[]>([...VALID_SIGNING_STYLES]);
	let colorPalette = $state<string[]>([...DEFAULT_COLOR_PALETTE]);

	// Moderation state
	let pendingEntries = $state<
		{
			id: string;
			name: string;
			message: string;
			emoji: string | null;
			createdAt: string;
			entryStyle: string | null;
			entryColor: string | null;
		}[]
	>([]);
	let loadingPending = $state(false);
	let activeTab = $state<"settings" | "moderation">("settings");

	// Sync form state with loaded data
	$effect(() => {
		if (data.config) {
			enabled = data.config.enabled ?? false;
			style = (data.config.style as GuestbookStyle) ?? "cozy";
			entriesPerPage = data.config.entriesPerPage ?? 20;
			requireApproval = data.config.requireApproval ?? true;
			allowEmoji = data.config.allowEmoji ?? true;
			maxMessageLength = data.config.maxMessageLength ?? 500;
			customPrompt = data.config.customPrompt ?? "";
			wallBacking = (data.config.wallBacking as GuestbookWallBacking) ?? "none";
			ctaStyle = (data.config.ctaStyle as GuestbookCtaStyle) ?? "button";
			inlineMode = (data.config.inlineMode as GuestbookInlineMode) ?? "compact";
			allowedStyles = data.config.allowedStyles ?? [...VALID_SIGNING_STYLES];
			colorPalette = data.config.colorPalette ?? [...DEFAULT_COLOR_PALETTE];
		}
	});

	// Show toast on form result
	$effect(() => {
		if (form?.success) {
			toast.success("Guestbook settings saved!");
		} else if (form?.error) {
			toast.error("Failed to save", { description: form.error });
		}
	});

	async function loadPendingEntries() {
		loadingPending = true;
		try {
			const res = await fetch("/api/curios/guestbook/pending"); // csrf-ok
			if (res.ok) {
				const data = (await res.json()) as { entries: typeof pendingEntries };
				pendingEntries = data.entries;
			}
		} catch {
			toast.error("Failed to load pending entries");
		} finally {
			loadingPending = false;
		}
	}

	async function approveEntry(id: string) {
		try {
			const res = await fetch(`/api/curios/guestbook/${id}`, {
				// csrf-ok
				method: "PATCH",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({ approved: true }),
			});
			if (res.ok) {
				pendingEntries = pendingEntries.filter((e) => e.id !== id);
				toast.success("Entry approved!");
				invalidateAll();
			}
		} catch {
			toast.error("Failed to approve entry");
		}
	}

	async function deleteEntry(id: string) {
		try {
			const res = await fetch(`/api/curios/guestbook/${id}`, {
				// csrf-ok
				method: "DELETE",
			});
			if (res.ok) {
				pendingEntries = pendingEntries.filter((e) => e.id !== id);
				toast.success("Entry deleted");
				invalidateAll();
			}
		} catch {
			toast.error("Failed to delete entry");
		}
	}

	function toggleSigningStyle(s: GuestbookSigningStyle) {
		if (allowedStyles.includes(s)) {
			if (allowedStyles.length > 1) {
				allowedStyles = allowedStyles.filter((x) => x !== s);
			}
		} else {
			allowedStyles = [...allowedStyles, s];
		}
	}

	function addColor(color: string) {
		if (!colorPalette.includes(color)) {
			colorPalette = [...colorPalette, color];
		}
	}

	function removeColor(color: string) {
		if (colorPalette.length > 1) {
			colorPalette = colorPalette.filter((c) => c !== color);
		}
	}

	function resetPalette() {
		colorPalette = [...DEFAULT_COLOR_PALETTE];
	}

	function switchTab(tab: "settings" | "moderation") {
		activeTab = tab;
		if (tab === "moderation" && pendingEntries.length === 0) {
			loadPendingEntries();
		}
	}
</script>

<svelte:head>
	<title>Guestbook - Admin</title>
</svelte:head>

<div class="guestbook-admin">
	<header class="page-header">
		<div class="header-top">
			<GlassButton href="/arbor/curios" variant="ghost" class="back-link">
				<navIcons.arrowLeft class="w-4 h-4" />
				Back to Curios
			</GlassButton>
		</div>
		<div class="title-row">
			<featureIcons.bookOpen class="header-icon" />
			<h1>Guestbook</h1>
		</div>
		<p class="subtitle">Let visitors sign your guestbook. The classic personal web element.</p>
	</header>

	<!-- Stats -->
	<div class="stats-row">
		<GlassCard class="stat-card">
			<div class="stat-value">{data.stats.approvedEntries}</div>
			<div class="stat-label">Approved</div>
		</GlassCard>
		<GlassCard class="stat-card">
			<div class="stat-value pending-value">{data.stats.pendingEntries}</div>
			<div class="stat-label">Pending</div>
		</GlassCard>
		<GlassCard class="stat-card">
			<div class="stat-value">{data.stats.totalEntries}</div>
			<div class="stat-label">Total</div>
		</GlassCard>
	</div>

	<!-- Live Preview -->
	<details class="preview-section" open>
		<summary class="preview-toggle">
			<stateIcons.eye class="w-4 h-4" />
			Live Preview
		</summary>
		<GlassCard class="preview-card">
			<GuestbookPreview
				{style}
				{wallBacking}
				{allowedStyles}
				{colorPalette}
				{allowEmoji}
				{customPrompt}
			/>
		</GlassCard>
	</details>

	<!-- Tabs -->
	<div class="tab-bar">
		<button class="tab" class:active={activeTab === "settings"} onclick={() => switchTab("settings")}>
			Settings
		</button>
		<button class="tab" class:active={activeTab === "moderation"} onclick={() => switchTab("moderation")}>
			Moderation
			{#if data.stats.pendingEntries > 0}
				<Badge variant="destructive" class="pending-badge">{data.stats.pendingEntries}</Badge>
			{/if}
		</button>
	</div>

	<!-- Settings Tab -->
	{#if activeTab === "settings"}
		<GuestbookSettingsPanel
			{enabled}
			{style}
			{entriesPerPage}
			{requireApproval}
			{allowEmoji}
			{maxMessageLength}
			{customPrompt}
			{wallBacking}
			{ctaStyle}
			{inlineMode}
			{allowedStyles}
			{colorPalette}
			{isSubmitting}
			styleOptions={data.styleOptions ?? []}
			wallBackingOptions={data.wallBackingOptions ?? []}
			signingStyleOptions={data.signingStyleOptions ?? []}
			onEnabledChange={(v) => (enabled = v)}
			onStyleChange={(v) => (style = v)}
			onWallBackingChange={(v) => (wallBacking = v)}
			onInlineModeChange={(v) => (inlineMode = v)}
			onRequireApprovalChange={(v) => (requireApproval = v)}
			onAllowEmojiChange={(v) => (allowEmoji = v)}
			onEntriesPerPageChange={(v) => (entriesPerPage = v)}
			onMaxMessageLengthChange={(v) => (maxMessageLength = v)}
			onCustomPromptChange={(v) => (customPrompt = v)}
			onToggleSigningStyle={toggleSigningStyle}
			onAddColor={addColor}
			onRemoveColor={removeColor}
			onResetPalette={resetPalette}
			onSubmitStart={() => (isSubmitting = true)}
			onSubmitEnd={() => (isSubmitting = false)}
		/>
	{/if}

	<!-- Moderation Tab -->
	{#if activeTab === "moderation"}
		<GuestbookModerationTab
			{pendingEntries}
			{loadingPending}
			onApprove={approveEntry}
			onDelete={deleteEntry}
		/>
	{/if}
</div>

<style>
	.guestbook-admin { max-width: 800px; margin: 0 auto; }
	.page-header { margin-bottom: 2rem; }
	.header-top { margin-bottom: 1rem; }
	.title-row { display: flex; align-items: center; gap: 0.75rem; margin-bottom: 0.5rem; }
	:global(.header-icon) { width: 2rem; height: 2rem; color: var(--color-primary); }
	h1 { font-size: 2rem; font-weight: 700; color: var(--color-text); margin: 0; }
	.subtitle { color: var(--color-text-muted); font-size: 1rem; line-height: 1.6; }

	.stats-row { display: grid; grid-template-columns: repeat(3, 1fr); gap: 1rem; margin-bottom: 1.5rem; }
	:global(.stat-card) { text-align: center; padding: 1.25rem !important; }
	.stat-value { font-size: 2rem; font-weight: 700; color: var(--color-text); line-height: 1; margin-bottom: 0.25rem; }
	.stat-value.pending-value { color: var(--color-primary); }
	.stat-label { font-size: 0.85rem; color: var(--color-text-muted); }

	.tab-bar { display: flex; gap: 0; border-bottom: 1px solid var(--color-border, #e5e7eb); margin-bottom: 1.5rem; }
	.tab { padding: 0.75rem 1.5rem; background: transparent; border: none; border-bottom: 2px solid transparent; cursor: pointer; font-size: 0.95rem; color: var(--color-text-muted); display: flex; align-items: center; gap: 0.5rem; transition: all 0.2s ease; }
	.tab:hover { color: var(--color-text); }
	.tab.active { color: var(--color-primary); border-bottom-color: var(--color-primary); font-weight: 500; }
	:global(.pending-badge) { font-size: 0.7rem !important; padding: 0.1rem 0.4rem !important; min-width: 1.25rem; text-align: center; }

	.preview-section { margin-bottom: 1.5rem; border: 1px solid var(--color-border, #e5e7eb); border-radius: 0.75rem; overflow: hidden; }
	.preview-toggle { display: flex; align-items: center; gap: 0.5rem; padding: 0.75rem 1rem; cursor: pointer; font-size: 0.9rem; font-weight: 500; color: var(--color-text-muted); list-style: none; user-select: none; transition: color 0.15s ease; }
	.preview-toggle::-webkit-details-marker { display: none; }
	.preview-toggle:hover { color: var(--color-text); }
	:global(.preview-card) { margin: 0 0.75rem 0.75rem !important; padding: 1rem !important; }

	@media (max-width: 640px) {
		.stats-row { grid-template-columns: 1fr; gap: 0.5rem; }
		.title-row { flex-wrap: wrap; }
		.tab { padding: 0.75rem 1rem; font-size: 0.9rem; }
	}
</style>
