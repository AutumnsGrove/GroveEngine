<script lang="ts">
	import {
		stateIcons,
		actionIcons,
		featureIcons,
		natureIcons,
	} from "@autumnsgrove/prism/icons";
	import VoiceInput from "../../components/admin/VoiceInput.svelte";

	interface Props {
		editorMode: "write" | "split" | "preview";
		readonly: boolean;
		isZenMode: boolean;
		isFiresideMode: boolean;
		wispEnabled: boolean;
		firesideEnabled: boolean;
		scribeEnabled: boolean;
		hasContent: boolean;
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
		voiceMode: "raw" | "draft";
		voiceError: string | null;
		onWrapSelection: (before: string, after: string) => void;
		onInsertLink: () => void;
		onInsertHeading: (level: number) => void;
		onShowPhotoPicker: () => void;
		onSetEditorMode: (mode: "write" | "split" | "preview") => void;
		onShowFullPreview: () => void;
		onToggleZenMode: () => void;
		onToggleFiresideMode: () => void;
		onTranscription: (result: {
			text: string;
			gutterContent?: Array<{ type: string; content: string; anchor?: string }>;
			rawTranscript?: string;
		}) => void;
		onVoiceError: (error: { message: string }) => void;
	}

	let {
		editorMode,
		readonly,
		isZenMode,
		isFiresideMode,
		wispEnabled,
		firesideEnabled,
		scribeEnabled,
		hasContent,
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
		voiceMode,
		voiceError,
		onWrapSelection,
		onInsertLink,
		onInsertHeading,
		onShowPhotoPicker,
		onSetEditorMode,
		onShowFullPreview,
		onToggleZenMode,
		onToggleFiresideMode,
		onTranscription,
		onVoiceError,
	}: Props = $props();
</script>

<!-- Mode-based Toolbar (hidden in Fireside mode) -->
{#if !isFiresideMode}
	<div class="toolbar">
		<div class="toolbar-left">
			{#if editorMode !== "preview"}
				<!-- Formatting buttons -->
				<div class="toolbar-group formatting-group">
					<button
						type="button"
						class="toolbar-icon-btn fmt-btn"
						onclick={() => onWrapSelection("**", "**")}
						disabled={readonly}
						title="Bold (⌘B)"
						aria-label="Bold"
					>
						<actionIcons.bold class="toolbar-icon" />
					</button>
					<button
						type="button"
						class="toolbar-icon-btn fmt-btn"
						onclick={() => onWrapSelection("_", "_")}
						disabled={readonly}
						title="Italic (⌘I)"
						aria-label="Italic"
					>
						<actionIcons.italic class="toolbar-icon" />
					</button>
					<button
						type="button"
						class="toolbar-icon-btn fmt-btn"
						onclick={() => onWrapSelection("`", "`")}
						disabled={readonly}
						title="Inline code"
						aria-label="Code"
					>
						<featureIcons.code class="toolbar-icon" />
					</button>
				</div>

				<div class="toolbar-divider-line"></div>

				<div class="toolbar-group formatting-group">
					<button
						type="button"
						class="toolbar-icon-btn fmt-btn"
						onclick={() => onInsertLink()}
						disabled={readonly}
						title="Insert link"
						aria-label="Link"
					>
						<actionIcons.link class="toolbar-icon" />
					</button>
				</div>

				<div class="toolbar-divider-line"></div>
				<div class="toolbar-group formatting-group">
					<button
						type="button"
						class="toolbar-icon-btn fmt-btn"
						onclick={() => onShowPhotoPicker()}
						disabled={readonly}
						title="Insert photo from gallery"
						aria-label="Insert photo from gallery"
					>
						<featureIcons.images class="toolbar-icon" />
					</button>
				</div>

				<div class="toolbar-divider-line"></div>

				<div class="toolbar-group formatting-group">
					<button
						type="button"
						class="toolbar-icon-btn fmt-btn"
						onclick={() => onInsertHeading(1)}
						disabled={readonly}
						title="Heading 1"
						aria-label="Heading 1"
					>
						<actionIcons.heading1 class="toolbar-icon" />
					</button>
					<button
						type="button"
						class="toolbar-icon-btn fmt-btn"
						onclick={() => onInsertHeading(2)}
						disabled={readonly}
						title="Heading 2"
						aria-label="Heading 2"
					>
						<actionIcons.heading2 class="toolbar-icon" />
					</button>
					<button
						type="button"
						class="toolbar-icon-btn fmt-btn"
						onclick={() => onInsertHeading(3)}
						disabled={readonly}
						title="Heading 3"
						aria-label="Heading 3"
					>
						<actionIcons.heading3 class="toolbar-icon" />
					</button>
				</div>

				<div class="toolbar-divider-line"></div>
			{/if}

			{#if wispEnabled && firesideEnabled && !hasContent}
				<button
					type="button"
					class="fireside-btn"
					onclick={onToggleFiresideMode}
					title="Fireside Mode (⌘⇧F) - Start with a conversation"
					aria-label="Enter Fireside mode for conversational writing"
				>
					<natureIcons.flame class="toolbar-icon fireside-icon" />
					<span>Fireside</span>
				</button>
				<span class="toolbar-divider">|</span>
			{/if}
			<!-- Voice Input (Scribe) - gated by scribe_mode graft -->
			{#if wispEnabled && scribeEnabled && editorMode !== "preview"}
				<div
					class="voice-wrapper"
					title="Voice Input (⌘⇧U) - Hold to record, release to transcribe"
				>
					<VoiceInput
						mode={voiceMode}
						onTranscription={onTranscription}
						onError={onVoiceError}
						disabled={readonly}
					/>
					{#if voiceError}
						<span class="voice-error">{voiceError}</span>
					{/if}
				</div>
			{/if}
			{#if editorMode === "preview"}
				<span class="toolbar-hint">Preview mode (read-only)</span>
			{/if}
		</div>

		<div class="toolbar-spacer"></div>

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
{/if}

<!-- Status Bar (hidden in Fireside mode) -->
{#if !isFiresideMode}
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
{/if}

<style>
	.toolbar {
		display: flex;
		align-items: center;
		gap: 0.15rem;
		padding: 0.4rem 0.75rem;
		background: var(--editor-bg-tertiary, var(--light-bg-primary));
		border-bottom: 1px solid var(--editor-border, var(--light-border-primary));
		flex-wrap: wrap;
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
		padding: 0.4rem;
		min-width: 44px;
		min-height: 44px;
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
	.fireside-btn {
		display: flex;
		align-items: center;
		gap: 0.375rem;
		padding: 0.3rem 0.6rem;
		background: linear-gradient(135deg, rgba(255, 140, 50, 0.15) 0%, rgba(255, 100, 30, 0.1) 100%);
		border: 1px solid rgba(255, 140, 50, 0.3);
		border-radius: 6px;
		color: #ff9d5c;
		font-family: inherit;
		font-size: 0.8rem;
		cursor: pointer;
		transition: all 0.15s ease;
	}
	.fireside-btn:hover {
		background: linear-gradient(135deg, rgba(255, 140, 50, 0.25) 0%, rgba(255, 100, 30, 0.2) 100%);
		border-color: rgba(255, 140, 50, 0.5);
		color: #ffb88c;
	}
	:global(.fireside-icon) {
		width: 0.875rem;
		height: 0.875rem;
		color: #ff8c32;
	}
	/* svelte-ignore css-unused-selector */
	.toolbar-divider {
		color: var(--color-border);
		margin: 0 0.25rem;
		font-size: 0.8rem;
	}
	.voice-wrapper {
		display: flex;
		align-items: center;
		gap: 0.5rem;
	}
	.voice-error {
		color: hsl(var(--destructive));
		font-size: 0.75rem;
		white-space: nowrap;
	}
	.toolbar-spacer {
		flex: 1;
	}
	.toolbar-left {
		display: flex;
		align-items: center;
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
			padding: 0.35rem 0.5rem;
			gap: 0.1rem;
		}
		.toolbar-divider-line {
			margin: 0 0.25rem;
		}
		.toolbar-icon-btn {
			padding: 0.35rem;
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
