<script lang="ts">
	// ModerationQueue.svelte // accent-ok — theme moderation component uses color palette definitions
	// Orchestrator: Admin component for moderating community theme submissions
	// Composes QueueFilters, QueueList, and QueueActions

	import type { CommunityTheme, CommunityThemeStatus, Theme } from "../../types.js";
	import { validateThemeContrast, getContrastRatio } from "../../utils/contrast.js";
	import QueueFilters from "./QueueFilters.svelte";
	import QueueList from "./QueueList.svelte";
	import QueueActions from "./QueueActions.svelte";

	interface Props {
		themes: CommunityTheme[];
		onStatusChange?: (themeId: string, status: CommunityThemeStatus, reason?: string) => void;
		onPreview?: (theme: CommunityTheme) => void;
	}

	let { themes, onStatusChange, onPreview }: Props = $props();

	// Shared state
	let searchQuery = $state("");
	let statusFilter = $state<CommunityThemeStatus | "all">("all");
	let sortBy = $state<"newest" | "oldest" | "popular">("newest");
	let selectedThemes = $state<Set<string>>(new Set());
	let currentThemeIndex = $state(0);
	let showPreviewModal = $state(false);
	let previewTheme = $state<CommunityTheme | null>(null);
	let showCustomizations = $state<string | null>(null);
	let wcagResults = $state<Map<string, ReturnType<typeof validateThemeContrast>>>(new Map());
	let statusChangeTheme = $state<CommunityTheme | null>(null);
	let statusChangeAction = $state<CommunityThemeStatus | null>(null);
	let statusChangeReason = $state("");

	// Filter and sort themes
	const filteredThemes = $derived(() => {
		let result = [...themes];

		if (statusFilter !== "all") {
			result = result.filter((theme) => theme.status === statusFilter);
		}

		if (searchQuery.trim()) {
			const query = searchQuery.toLowerCase();
			result = result.filter(
				(theme) =>
					theme.name.toLowerCase().includes(query) ||
					theme.description?.toLowerCase().includes(query) ||
					theme.creatorTenantId.toLowerCase().includes(query) ||
					theme.tags?.some((tag) => tag.toLowerCase().includes(query)),
			);
		}

		result.sort((a, b) => {
			switch (sortBy) {
				case "newest":
					return b.createdAt - a.createdAt;
				case "oldest":
					return a.createdAt - b.createdAt;
				case "popular":
					return b.downloads - a.downloads;
				default:
					return 0;
			}
		});

		return result;
	});

	// Toggle theme selection for bulk actions
	function toggleThemeSelection(themeId: string) {
		if (selectedThemes.has(themeId)) {
			selectedThemes.delete(themeId);
		} else {
			selectedThemes.add(themeId);
		}
		selectedThemes = new Set(selectedThemes);
	}

	function toggleSelectAll() {
		if (selectedThemes.size === filteredThemes().length) {
			selectedThemes = new Set();
		} else {
			selectedThemes = new Set(filteredThemes().map((t) => t.id));
		}
	}

	// Handle preview
	function handlePreview(theme: CommunityTheme) {
		if (onPreview) {
			onPreview(theme);
		} else {
			previewTheme = theme;
			showPreviewModal = true;
		}
	}

	function closePreviewModal() {
		showPreviewModal = false;
		previewTheme = null;
	}

	// Toggle customizations view
	function toggleCustomizations(themeId: string) {
		if (showCustomizations === themeId) {
			showCustomizations = null;
		} else {
			showCustomizations = themeId;
		}
	}

	// Run WCAG validation
	function runWCAGValidation(theme: CommunityTheme) {
		const validationTheme: Theme = {
			id: theme.id,
			name: theme.name,
			description: theme.description || "",
			thumbnail: "",
			tier: "seedling" as const,
			colors: {
				background: theme.customColors?.background || "#ffffff",
				surface: theme.customColors?.surface || "#f5f5f5",
				foreground: theme.customColors?.foreground || "#111111",
				foregroundMuted: theme.customColors?.foregroundMuted || "#666666",
				accent: theme.customColors?.accent || "#16a34a" /* accent-ok */,
				border: theme.customColors?.border || "#e5e5e5",
			},
			fonts: {
				heading: theme.customTypography?.heading || "system-ui",
				body: theme.customTypography?.body || "system-ui",
				mono: theme.customTypography?.mono || "monospace",
			},
			layout: {
				type: theme.customLayout?.type || "sidebar",
				maxWidth: theme.customLayout?.maxWidth || "1200px",
				spacing: theme.customLayout?.spacing || "comfortable",
			},
		};

		const result = validateThemeContrast(validationTheme);
		wcagResults.set(theme.id, result);
		wcagResults = new Map(wcagResults);
	}

	function closeWCAG(themeId: string) {
		wcagResults.delete(themeId);
		wcagResults = new Map(wcagResults);
	}

	// Status change dialog
	function openStatusChangeDialog(theme: CommunityTheme, action: CommunityThemeStatus) {
		statusChangeTheme = theme;
		statusChangeAction = action;
		statusChangeReason = "";
	}

	function closeStatusChangeDialog() {
		statusChangeTheme = null;
		statusChangeAction = null;
		statusChangeReason = "";
	}

	function confirmStatusChange() {
		if (!statusChangeTheme || !statusChangeAction) return;

		const needsReason =
			statusChangeAction === "changes_requested" || statusChangeAction === "rejected";

		if (needsReason && !statusChangeReason.trim()) {
			alert("Please provide a reason for this action");
			return;
		}

		onStatusChange?.(
			statusChangeTheme.id,
			statusChangeAction,
			needsReason ? statusChangeReason : undefined,
		);

		closeStatusChangeDialog();
	}

	// Bulk actions
	function bulkApprove() {
		if (selectedThemes.size === 0) return;
		if (!confirm(`Approve ${selectedThemes.size} themes?`)) return;

		for (const themeId of selectedThemes) {
			onStatusChange?.(themeId, "approved");
		}
		selectedThemes = new Set();
	}

	function bulkReject() {
		if (selectedThemes.size === 0) return;
		const reason = prompt(`Reject ${selectedThemes.size} themes? Enter reason:`);
		if (!reason) return;

		for (const themeId of selectedThemes) {
			onStatusChange?.(themeId, "rejected", reason);
		}
		selectedThemes = new Set();
	}

	// Keyboard navigation
	function handleGlobalKeydown(event: KeyboardEvent) {
		if (
			showPreviewModal ||
			statusChangeTheme ||
			event.target instanceof HTMLInputElement ||
			event.target instanceof HTMLTextAreaElement ||
			event.target instanceof HTMLSelectElement
		) {
			return;
		}

		const themes = filteredThemes();
		if (themes.length === 0) return;

		switch (event.key.toLowerCase()) {
			case "j":
				event.preventDefault();
				currentThemeIndex = Math.min(currentThemeIndex + 1, themes.length - 1);
				scrollToTheme(currentThemeIndex);
				break;
			case "k":
				event.preventDefault();
				currentThemeIndex = Math.max(currentThemeIndex - 1, 0);
				scrollToTheme(currentThemeIndex);
				break;
			case "enter":
				event.preventDefault();
				handlePreview(themes[currentThemeIndex]);
				break;
		}
	}

	function scrollToTheme(index: number) {
		const element = document.querySelector(`[data-theme-index="${index}"]`);
		if (element) {
			element.scrollIntoView({ behavior: "smooth", block: "nearest" });
		}
	}
</script>

<svelte:window onkeydown={handleGlobalKeydown} />

<div class="moderation-queue">
	<header class="queue-header">
		<h1>Community Theme Moderation</h1>
		<p class="subtitle">Review and manage community theme submissions</p>
	</header>

	<QueueFilters
		{searchQuery}
		{statusFilter}
		{sortBy}
		filteredCount={filteredThemes().length}
		selectedCount={selectedThemes.size}
		onSearchChange={(v) => (searchQuery = v)}
		onStatusFilterChange={(v) => (statusFilter = v)}
		onSortChange={(v) => (sortBy = v)}
		onBulkApprove={bulkApprove}
		onBulkReject={bulkReject}
		onClearSelection={() => (selectedThemes = new Set())}
	/>

	<QueueList
		themes={filteredThemes()}
		{currentThemeIndex}
		{selectedThemes}
		{showCustomizations}
		{wcagResults}
		onToggleSelection={toggleThemeSelection}
		onToggleSelectAll={toggleSelectAll}
		onPreview={handlePreview}
		onToggleCustomizations={toggleCustomizations}
		onRunWCAG={runWCAGValidation}
		onCloseWCAG={closeWCAG}
		onStatusAction={openStatusChangeDialog}
	/>

	<QueueActions
		{showPreviewModal}
		{previewTheme}
		{statusChangeTheme}
		{statusChangeAction}
		{statusChangeReason}
		onClosePreview={closePreviewModal}
		onCloseStatusChange={closeStatusChangeDialog}
		onConfirmStatusChange={confirmStatusChange}
		onReasonChange={(v) => (statusChangeReason = v)}
	/>
</div>

<style>
	.moderation-queue {
		font-family: var(--font-body, system-ui, sans-serif);
		padding: 1.5rem;
		max-width: 1600px;
		margin: 0 auto;
	}

	.queue-header {
		margin-bottom: 2rem;
	}

	.queue-header h1 {
		font-size: 2rem;
		font-weight: 700;
		color: var(--color-foreground, #111);
		margin: 0 0 0.5rem 0;
	}

	.subtitle {
		font-size: 1rem;
		color: var(--color-foreground-muted, #666);
		margin: 0;
	}
</style>
