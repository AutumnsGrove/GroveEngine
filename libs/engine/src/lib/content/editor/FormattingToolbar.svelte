<script lang="ts">
	import {
		stateIcons,
		actionIcons,
		featureIcons,
	} from "@autumnsgrove/prism/icons";

	interface Props {
		editorMode: "write" | "split" | "preview";
		readonly: boolean;
		isZenMode: boolean;
		saving: boolean;
		draftKey: string | null;
		draftSaveStatus: string;
		draftHasUnsavedChanges: boolean;
		serverDraftSlug: string | null;
		serverSyncStatus: string;
		cursorLine: number;
		cursorCol: number;
		lineCount: number;
		wordCount: number;
		readingTime: string;
		onWrapSelection: (before: string, after: string) => void;
		onInsertLink: () => void;
		onInsertFootnote: () => void;
		onInsertHeading: (level: number) => void;
		onShowPhotoPicker: () => void;
		onSetEditorMode: (mode: "write" | "split" | "preview") => void;
		onShowFullPreview: () => void;
		onToggleZenMode: () => void;
	}

	let {
		editorMode,
		readonly,
		isZenMode,
		saving,
		draftKey,
		draftSaveStatus,
		draftHasUnsavedChanges,
		serverDraftSlug,
		serverSyncStatus,
		cursorLine,
		cursorCol,
		lineCount,
		wordCount,
		readingTime,
		onWrapSelection,
		onInsertLink,
		onInsertFootnote,
		onInsertHeading,
		onShowPhotoPicker,
		onSetEditorMode,
		onShowFullPreview,
		onToggleZenMode,
	}: Props = $props();

	const formatGroups = [
		[
			{ icon: actionIcons.bold,        label: "Bold",     title: "Bold (⌘B)",                 action: () => onWrapSelection("**", "**") },
			{ icon: actionIcons.italic,      label: "Italic",   title: "Italic (⌘I)",               action: () => onWrapSelection("_", "_") },
			{ icon: featureIcons.code,       label: "Code",     title: "Inline code",                action: () => onWrapSelection("`", "`") },
		],
		[
			{ icon: actionIcons.link,        label: "Link",     title: "Insert link",                action: () => onInsertLink() },
			{ icon: actionIcons.superscript, label: "Footnote", title: "Insert footnote reference",  action: () => onInsertFootnote() },
		],
		[
			{ icon: featureIcons.images, label: "Insert photo from gallery", title: "Insert photo from gallery", action: () => onShowPhotoPicker() },
		],
		[
			{ icon: actionIcons.heading1, label: "Heading 1", title: "Heading 1", action: () => onInsertHeading(1) },
			{ icon: actionIcons.heading2, label: "Heading 2", title: "Heading 2", action: () => onInsertHeading(2) },
			{ icon: actionIcons.heading3, label: "Heading 3", title: "Heading 3", action: () => onInsertHeading(3) },
		],
	];
</script>

<!-- Mode-based Toolbar -->
<div class="toolbar">
		<div class="toolbar-left">
			{#if editorMode !== "preview"}
				{#each formatGroups as group, i}
					{#if i > 0}<div class="toolbar-divider-line"></div>{/if}
					<div class="toolbar-group formatting-group">
						{#each group as btn}
							{@const Icon = btn.icon}
							<button
								type="button"
								class="toolbar-icon-btn fmt-btn"
								onclick={btn.action}
								disabled={readonly}
								title={btn.title}
								aria-label={btn.label}
							>
								<Icon class="toolbar-icon" />
							</button>
						{/each}
					</div>
				{/each}
				<div class="toolbar-divider-line"></div>
			{/if}

			{#if editorMode === "preview"}
				<span class="toolbar-hint">Preview mode (read-only)</span>
			{/if}
		</div>

		<div class="toolbar-right">
			<div class="toolbar-group mode-group">
				<button
					type="button"
					class="toolbar-icon-btn mode-btn"
					class:active={editorMode === "write"}
					onclick={() => onSetEditorMode("write")}
					title="Source Mode (⌘1)"
					aria-label="Source mode - editor only"
				>
					<actionIcons.penLine class="toolbar-icon" />
				</button>
				<button
					type="button"
					class="toolbar-icon-btn mode-btn"
					class:active={editorMode === "split"}
					onclick={() => onSetEditorMode("split")}
					title="Split Mode (⌘2)"
					aria-label="Split mode - editor and preview"
				>
					<actionIcons.columns class="toolbar-icon" />
				</button>
				<button
					type="button"
					class="toolbar-icon-btn mode-btn"
					class:active={editorMode === "preview"}
					onclick={() => onSetEditorMode("preview")}
					title="Preview Mode (⌘3)"
					aria-label="Preview mode - preview only"
				>
					<featureIcons.bookOpen class="toolbar-icon" />
				</button>
			</div>

			<div class="toolbar-divider-line"></div>

			<div class="toolbar-group">
				<button
					type="button"
					class="toolbar-icon-btn full-btn"
					onclick={() => onShowFullPreview()}
					title="Full Preview with Styling"
					aria-label="Open full preview with blog styling"
				>
					<actionIcons.maximize class="toolbar-icon" />
				</button>
				<button
					type="button"
					class="toolbar-icon-btn zen-btn"
					class:active={isZenMode}
					onclick={onToggleZenMode}
					title={isZenMode ? "Exit Zen Mode (Esc)" : "Zen Mode (⌘⇧↵)"}
					aria-label={isZenMode ? "Exit zen mode" : "Enter zen mode for focused writing"}
				>
					{#if isZenMode}
						<actionIcons.minimize class="toolbar-icon" />
					{:else}
						<actionIcons.focus class="toolbar-icon" />
					{/if}
				</button>
			</div>
		</div>
	</div>

<!-- Status Bar -->
<div class="status-bar">
		<div class="status-left">
			<span class="status-item">Ln {cursorLine}, Col {cursorCol}</span>
			<span class="status-divider">|</span>
			<span class="status-item">{lineCount} lines</span>
			<span class="status-divider">|</span>
			<span class="status-item">{wordCount} words</span>
			<span class="status-divider">|</span>
			<span class="status-item">{readingTime}</span>
		</div>
		<div class="status-right">
			<span class="status-mode-indicator" title="Editor mode (⌘1/2/3)">
				{editorMode === "write" ? "Source" : editorMode === "split" ? "Split" : "Preview"}
			</span>
			{#if saving}
				<span class="status-divider">|</span>
				<span class="status-saving">Saving...</span>
			{:else if draftKey && draftSaveStatus === "saving"}
				<span class="status-divider">|</span>
				<span class="status-draft-saving">Saving draft...</span>
			{:else if draftKey && draftSaveStatus === "saved"}
				<span class="status-divider">|</span>
				<span class="status-draft-saved"
					>Draft saved <stateIcons.check class="inline-block w-3 h-3" /></span
				>
			{:else if draftKey && draftHasUnsavedChanges}
				<span class="status-divider">|</span>
				<span class="status-draft-unsaved">Unsaved</span>
			{/if}
			{#if serverDraftSlug && serverSyncStatus === "syncing"}
				<span class="status-divider">|</span>
				<span class="status-server-syncing" title="Syncing to server">Syncing...</span>
			{:else if serverDraftSlug && serverSyncStatus === "synced"}
				<span class="status-divider">|</span>
				<span class="status-server-synced" title="Synced to server">Synced</span>
			{:else if serverDraftSlug && serverSyncStatus === "error"}
				<span class="status-divider">|</span>
				<span class="status-server-error" title="Server sync failed (local draft is safe)"
					>Sync error</span
				>
			{/if}
		</div>
	</div>

<style>
	.toolbar {
		display: flex;
		align-items: center;
		gap: 0.15rem;
		padding: 0.4rem 0.75rem;
		background: var(--editor-bg-tertiary, var(--light-bg-primary));
		border-bottom: 1px solid var(--editor-border, var(--light-border-primary));
		flex-wrap: nowrap;
		font-family: "JetBrains Mono", "Fira Code", monospace;
		transition: opacity 0.3s ease;
	}
	.toolbar-group {
		display: flex;
		gap: 0.25rem;
	}
	.toolbar-icon-btn {
		display: flex;
		align-items: center;
		justify-content: center;
		padding: 0.25rem;
		min-width: 32px;
		min-height: 32px;
		background: transparent;
		border: none;
		border-radius: 4px;
		color: var(--editor-accent-dim, #7a9a7a);
		cursor: pointer;
		transition:
			color 0.15s ease,
			background 0.15s ease;
	}
	.toolbar-icon-btn:hover {
		color: var(--editor-accent-bright, #a8dca8);
		background: color-mix(in srgb, var(--editor-accent, #8bc48b) 10%, transparent);
	}
	.toolbar-icon-btn.active {
		color: var(--editor-accent, #8bc48b);
		background: color-mix(in srgb, var(--editor-accent, #8bc48b) 15%, transparent);
	}
	.toolbar-icon-btn.full-btn {
		color: hsl(var(--info));
	}
	.toolbar-icon-btn.full-btn:hover {
		color: hsl(var(--info-muted));
		background: color-mix(in srgb, hsl(var(--info)) 10%, transparent);
	}
	.toolbar-icon-btn.zen-btn {
		color: #d4a5ff;
	}
	.toolbar-icon-btn.zen-btn:hover {
		color: #e4c5ff;
		background: color-mix(in srgb, #d4a5ff 10%, transparent);
	}
	.toolbar-icon-btn.zen-btn.active {
		color: #e4c5ff;
		background: color-mix(in srgb, #d4a5ff 20%, transparent);
		box-shadow: 0 0 8px color-mix(in srgb, #d4a5ff 30%, transparent);
	}
	:global(.toolbar-icon) {
		width: 1rem;
		height: 1rem;
	}
	.toolbar-left {
		display: flex;
		align-items: center;
		flex: 1;
		min-width: 0;
		overflow-x: auto;
		overflow-y: hidden;
		-webkit-overflow-scrolling: touch;
		scrollbar-width: none;
	}
	.toolbar-left::-webkit-scrollbar {
		display: none;
	}
	.toolbar-right {
		display: flex;
		align-items: center;
		flex-shrink: 0;
		gap: 0.15rem;
	}
	.toolbar-hint {
		color: var(--editor-text-dim, #5a5a5a);
		font-size: 0.75rem;
		font-style: italic;
	}
	.formatting-group {
		background: var(--editor-bg-secondary, #252526);
		border-radius: 6px;
		padding: 2px;
		gap: 0.15rem;
	}
	.toolbar-icon-btn.fmt-btn:disabled {
		opacity: 0.35;
		cursor: not-allowed;
	}
	.mode-group {
		background: var(--editor-bg-secondary, #252526);
		border-radius: 6px;
		padding: 2px;
	}
	.mode-btn.active {
		background: var(--editor-accent, #8bc48b) !important;
		color: var(--editor-bg, #1e1e1e) !important;
	}
	.toolbar-divider-line {
		width: 1px;
		height: 1.25rem;
		background: var(--editor-border, #3a3a3a);
		margin: 0 0.5rem;
	}
	.status-bar {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.35rem 0.75rem;
		background: var(--editor-status-bg, var(--light-border-secondary));
		border-top: 1px solid var(--editor-status-border, var(--light-border-secondary));
		font-size: 0.75rem;
		color: var(--editor-accent-bright, #a8dca8);
		transition: opacity 0.3s ease;
	}
	.status-left,
	.status-right {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		overflow: hidden;
	}
	.status-left {
		flex: 1;
		min-width: 0;
	}
	.status-right {
		flex-shrink: 0;
	}
	.status-item {
		opacity: 0.9;
	}
	.status-divider {
		opacity: 0.4;
	}
	.status-saving {
		color: hsl(var(--warning));
		animation: pulse 1s ease-in-out infinite;
	}
	.status-draft-saving {
		color: var(--color-foreground-subtle);
		font-style: italic;
	}
	.status-draft-saved {
		color: var(--editor-accent, #8bc48b);
		font-weight: 500;
	}
	.status-draft-unsaved {
		color: hsl(var(--warning-muted));
		font-style: italic;
	}
	.status-server-syncing {
		color: hsl(var(--info-muted));
		font-style: italic;
	}
	.status-server-synced {
		color: var(--editor-accent, #8bc48b);
	}
	.status-server-error {
		color: var(--color-error);
		font-style: italic;
	}
	.status-mode-indicator {
		color: var(--editor-accent, #8bc48b);
		font-weight: 500;
		cursor: default;
	}
	@keyframes pulse {
		0%,
		100% {
			opacity: 1;
		}
		50% {
			opacity: 0.5;
		}
	}
	@media (max-width: 768px) {
		.toolbar {
			padding: 0.5rem;
		}
		.toolbar-hint {
			display: none;
		}
		.status-bar {
			font-size: 0.7rem;
			gap: 0.25rem;
		}
		.status-left,
		.status-right {
			gap: 0.25rem;
		}
		.status-left .status-item:nth-child(n + 4) {
			display: none;
		}
	}
	@media (max-width: 600px) {
		.toolbar {
			padding: 0.25rem 0.4rem;
			gap: 0.1rem;
		}
		.toolbar-divider-line {
			margin: 0 0.2rem;
		}
		.toolbar-icon-btn {
			padding: 0.2rem;
		}
		.formatting-group {
			padding: 1px;
			gap: 0.1rem;
		}
	}
	@media (max-width: 480px) {
		.status-left .status-item:nth-child(n + 3),
		.status-left .status-divider:nth-child(n + 3) {
			display: none;
		}
	}
</style>
