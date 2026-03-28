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
	let statusChangeError = $state("");

	// Bulk action confirmation state
	let bulkConfirmAction = $state<"approve" | "reject" | null>(null);
	let bulkRejectReason = $state("");

	// Filter and sort themes
	const filteredThemes = $derived.by(() => {
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
		if (selectedThemes.size === filteredThemes.length) {
			selectedThemes = new Set();
		} else {
			selectedThemes = new Set(filteredThemes.map((t) => t.id));
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
		statusChangeError = "";
	}

	function confirmStatusChange() {
		if (!statusChangeTheme || !statusChangeAction) return;

		const needsReason =
			statusChangeAction === "changes_requested" || statusChangeAction === "rejected";

		if (needsReason && !statusChangeReason.trim()) {
			statusChangeError = "Please provide a reason for this action";
			return;
		}

		statusChangeError = "";
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
		bulkConfirmAction = "approve";
	}

	function bulkReject() {
		if (selectedThemes.size === 0) return;
		bulkRejectReason = "";
		bulkConfirmAction = "reject";
	}

	function confirmBulkAction() {
		if (bulkConfirmAction === "approve") {
			for (const themeId of selectedThemes) {
				onStatusChange?.(themeId, "approved");
			}
			selectedThemes = new Set();
		} else if (bulkConfirmAction === "reject") {
			if (!bulkRejectReason.trim()) return;
			for (const themeId of selectedThemes) {
				onStatusChange?.(themeId, "rejected", bulkRejectReason);
			}
			selectedThemes = new Set();
		}
		closeBulkConfirm();
	}

	function closeBulkConfirm() {
		bulkConfirmAction = null;
		bulkRejectReason = "";
	}

	// Focus the bulk confirm dialog when it opens
	let bulkConfirmDialogEl = $state<HTMLDivElement | null>(null);
	$effect(() => {
		if (bulkConfirmAction && bulkConfirmDialogEl) {
			bulkConfirmDialogEl.focus();
		}
	});

	// Keyboard navigation
	function handleGlobalKeydown(event: KeyboardEvent) {
		if (
			showPreviewModal ||
			statusChangeTheme ||
			bulkConfirmAction ||
			event.target instanceof HTMLInputElement ||
			event.target instanceof HTMLTextAreaElement ||
			event.target instanceof HTMLSelectElement
		) {
			return;
		}

		const themes = filteredThemes;
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
		filteredCount={filteredThemes.length}
		selectedCount={selectedThemes.size}
		onSearchChange={(v) => (searchQuery = v)}
		onStatusFilterChange={(v) => (statusFilter = v)}
		onSortChange={(v) => (sortBy = v)}
		onBulkApprove={bulkApprove}
		onBulkReject={bulkReject}
		onClearSelection={() => (selectedThemes = new Set())}
	/>

	<QueueList
		themes={filteredThemes}
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
		{statusChangeError}
		onClosePreview={closePreviewModal}
		onCloseStatusChange={closeStatusChangeDialog}
		onConfirmStatusChange={confirmStatusChange}
		onReasonChange={(v) => {
			statusChangeReason = v;
			statusChangeError = "";
		}}
	/>

	<!-- Bulk Action Confirmation Dialog -->
	{#if bulkConfirmAction}
		<div
			class="modal-overlay"
			onclick={closeBulkConfirm}
			onkeydown={(e) => e.key === "Escape" && closeBulkConfirm()}
			role="presentation"
		>
			<div
				class="modal-content"
				onclick={(e) => e.stopPropagation()}
				role="dialog"
				tabindex="-1"
				aria-modal="true"
				aria-labelledby="bulk-confirm-title"
				onkeydown={(e) => e.stopPropagation()}
			bind:this={bulkConfirmDialogEl}
			>
				<div class="modal-header">
					<h2 id="bulk-confirm-title">
						{bulkConfirmAction === "approve" ? "Bulk Approve" : "Bulk Reject"}
					</h2>
					<button
						type="button"
						class="modal-close"
						onclick={closeBulkConfirm}
						aria-label="Close dialog"
					>
						<svg
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							aria-hidden="true"
						>
							<line x1="18" y1="6" x2="6" y2="18"></line>
							<line x1="6" y1="6" x2="18" y2="18"></line>
						</svg>
					</button>
				</div>

				<div class="modal-body">
					{#if bulkConfirmAction === "approve"}
						<p>Approve <strong>{selectedThemes.size}</strong> selected themes?</p>
					{:else}
						<p>Reject <strong>{selectedThemes.size}</strong> selected themes?</p>
						<div class="reason-field">
							<label for="bulk-reject-reason">Reason (required):</label>
							<textarea
								id="bulk-reject-reason"
								bind:value={bulkRejectReason}
								placeholder="Explain why these themes are being rejected..."
								rows="4"
							></textarea>
						</div>
					{/if}

					<div class="modal-actions">
						<button type="button" class="modal-btn cancel" onclick={closeBulkConfirm}>
							Cancel
						</button>
						<button
							type="button"
							class="modal-btn confirm"
							disabled={bulkConfirmAction === "reject" && !bulkRejectReason.trim()}
							onclick={confirmBulkAction}
						>
							{bulkConfirmAction === "approve" ? "Approve All" : "Reject All"}
						</button>
					</div>
				</div>
			</div>
		</div>
	{/if}
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

	/* Bulk confirmation dialog */
	.modal-overlay {
		position: fixed;
		inset: 0;
		background: rgba(0, 0, 0, 0.5);
		display: flex;
		align-items: center;
		justify-content: center;
		z-index: 1000;
		padding: 1rem;
	}

	.modal-content {
		background: var(--color-surface, #fff);
		border-radius: 0.75rem;
		max-width: 600px;
		width: 100%;
		max-height: 90vh;
		overflow-y: auto;
		box-shadow: 0 20px 25px -5px rgba(0, 0, 0, 0.1);
	}

	.modal-header {
		display: flex;
		align-items: center;
		justify-content: space-between;
		padding: 1.5rem;
		border-bottom: 2px solid var(--color-border, #e5e5e5);
	}

	.modal-header h2 {
		font-size: 1.25rem;
		font-weight: 600;
		margin: 0;
	}

	.modal-close {
		padding: 0.5rem;
		background: transparent;
		border: none;
		cursor: pointer;
		transition: all 0.2s ease;
		border-radius: 0.25rem;
	}

	.modal-close:hover {
		background: var(--color-surface, #f5f5f5);
	}

	.modal-close svg {
		width: 1.25rem;
		height: 1.25rem;
		color: var(--color-foreground, #111);
	}

	.modal-body {
		padding: 1.5rem;
	}

	.reason-field {
		margin: 1.5rem 0;
	}

	.reason-field label {
		display: block;
		font-weight: 600;
		margin-bottom: 0.5rem;
	}

	.reason-field textarea {
		width: 100%;
		padding: 0.75rem;
		border: 2px solid var(--color-border, #e5e5e5);
		border-radius: 0.375rem;
		font-family: inherit;
		font-size: 0.875rem;
		resize: vertical;
	}

	.reason-field textarea:focus {
		outline: none;
		border-color: var(--color-accent, #16a34a); /* accent-ok */
	}

	.modal-actions {
		display: flex;
		gap: 0.75rem;
		justify-content: flex-end;
		margin-top: 1.5rem;
	}

	.modal-btn {
		padding: 0.75rem 1.5rem;
		border: none;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.modal-btn.cancel {
		background: transparent;
		color: var(--color-foreground, #111);
		border: 2px solid var(--color-border, #e5e5e5);
	}

	.modal-btn.cancel:hover {
		background: var(--color-surface, #f5f5f5);
	}

	.modal-btn.confirm {
		background: var(--color-accent, #16a34a); /* accent-ok */
		color: #fff;
	}

	.modal-btn.confirm:hover {
		background: color-mix(in srgb, var(--color-accent, #16a34a) 85%, black); /* accent-ok */
	}

	.modal-btn.confirm:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	@media (prefers-reduced-motion: reduce) {
		.modal-close,
		.modal-btn {
			transition: none;
		}
	}
</style>
