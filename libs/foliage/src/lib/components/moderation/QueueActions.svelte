<script lang="ts">
	// QueueActions.svelte // accent-ok — theme moderation component uses color palette definitions
	// Preview modal and status change confirmation dialog

	import { tick } from "svelte";
	import type { CommunityTheme, CommunityThemeStatus } from "../../types.js";
	import ThemePreview from "../ThemePreview.svelte";

	interface Props {
		showPreviewModal: boolean;
		previewTheme: CommunityTheme | null;
		statusChangeTheme: CommunityTheme | null;
		statusChangeAction: CommunityThemeStatus | null;
		statusChangeReason: string;
		statusChangeError?: string;
		onClosePreview: () => void;
		onCloseStatusChange: () => void;
		onConfirmStatusChange: () => void;
		onReasonChange: (value: string) => void;
	}

	let {
		showPreviewModal,
		previewTheme,
		statusChangeTheme,
		statusChangeAction,
		statusChangeReason,
		statusChangeError = "",
		onClosePreview,
		onCloseStatusChange,
		onConfirmStatusChange,
		onReasonChange,
	}: Props = $props();

	let previewDialogEl: HTMLDivElement | undefined = $state();
	let statusDialogEl: HTMLDivElement | undefined = $state();
	let previousFocus: HTMLElement | null = null;

	function getFocusable(el: HTMLElement): HTMLElement[] {
		return Array.from(
			el.querySelectorAll<HTMLElement>(
				'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])',
			),
		);
	}

	function trapFocus(e: KeyboardEvent, dialogEl: HTMLElement, onClose: () => void) {
		if (e.key === "Escape") {
			onClose();
			return;
		}
		if (e.key === "Tab") {
			const focusable = getFocusable(dialogEl);
			if (focusable.length === 0) return;
			const first = focusable[0];
			const last = focusable[focusable.length - 1];
			if (e.shiftKey && document.activeElement === first) {
				e.preventDefault();
				last.focus();
			} else if (!e.shiftKey && document.activeElement === last) {
				e.preventDefault();
				first.focus();
			}
		}
	}

	$effect(() => {
		if (showPreviewModal && previewTheme) {
			previousFocus = document.activeElement as HTMLElement;
			tick().then(() => {
				const focusable = previewDialogEl ? getFocusable(previewDialogEl) : [];
				(focusable[0] ?? previewDialogEl)?.focus();
			});
		} else if (!showPreviewModal && previousFocus) {
			previousFocus.focus();
			previousFocus = null;
		}
	});

	$effect(() => {
		if (statusChangeTheme && statusChangeAction) {
			previousFocus = document.activeElement as HTMLElement;
			tick().then(() => {
				const focusable = statusDialogEl ? getFocusable(statusDialogEl) : [];
				(focusable[0] ?? statusDialogEl)?.focus();
			});
		} else if (!statusChangeTheme && previousFocus) {
			previousFocus.focus();
			previousFocus = null;
		}
	});

	function handleModalKeydown(event: KeyboardEvent) {
		if (event.key === "Escape") {
			if (showPreviewModal) {
				onClosePreview();
			} else if (statusChangeTheme) {
				onCloseStatusChange();
			}
		}
	}
</script>

<!-- Preview Modal -->
{#if showPreviewModal && previewTheme}
	{@const previewThemeObj = {
		id: previewTheme.id,
		name: previewTheme.name,
		description: previewTheme.description || "",
		thumbnail: "",
		tier: "seedling" as const,
		colors: {
			background: previewTheme.customColors?.background || "#ffffff",
			surface: previewTheme.customColors?.surface || "#f5f5f5",
			foreground: previewTheme.customColors?.foreground || "#111111",
			foregroundMuted: previewTheme.customColors?.foregroundMuted || "#666666",
			accent: previewTheme.customColors?.accent || "#16a34a" /* accent-ok */,
			border: previewTheme.customColors?.border || "#e5e5e5",
		},
		fonts: {
			heading: previewTheme.customTypography?.heading || "system-ui",
			body: previewTheme.customTypography?.body || "system-ui",
			mono: previewTheme.customTypography?.mono || "monospace",
		},
		layout: {
			type: previewTheme.customLayout?.type || "sidebar",
			maxWidth: previewTheme.customLayout?.maxWidth || "1200px",
			spacing: previewTheme.customLayout?.spacing || "comfortable",
		},
	}}
	<div
		class="modal-overlay"
		onclick={onClosePreview}
		onkeydown={handleModalKeydown}
		role="presentation"
	>
		<div
			bind:this={previewDialogEl}
			class="modal-content"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
			tabindex="-1"
			aria-modal="true"
			aria-labelledby="preview-title"
			onkeydown={(e) => {
				e.stopPropagation();
				if (previewDialogEl) trapFocus(e, previewDialogEl, onClosePreview);
			}}
		>
			<div class="modal-header">
				<h2 id="preview-title">Preview: {previewTheme.name}</h2>
				<button
					type="button"
					class="modal-close"
					onclick={onClosePreview}
					aria-label="Close preview"
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
				<ThemePreview theme={previewThemeObj} />

				<div class="preview-meta">
					<p><strong>Base Theme:</strong> {previewTheme.baseTheme}</p>
					<p><strong>Creator:</strong> {previewTheme.creatorTenantId}</p>
					{#if previewTheme.description}
						<p><strong>Description:</strong> {previewTheme.description}</p>
					{/if}
				</div>
			</div>
		</div>
	</div>
{/if}

<!-- Status Change Modal -->
{#if statusChangeTheme && statusChangeAction}
	<div
		class="modal-overlay"
		onclick={onCloseStatusChange}
		onkeydown={handleModalKeydown}
		role="presentation"
	>
		<div
			bind:this={statusDialogEl}
			class="modal-content"
			onclick={(e) => e.stopPropagation()}
			role="dialog"
			tabindex="-1"
			aria-modal="true"
			aria-labelledby="status-change-title"
			onkeydown={(e) => {
				e.stopPropagation();
				if (statusDialogEl) trapFocus(e, statusDialogEl, onCloseStatusChange);
			}}
		>
			<div class="modal-header">
				<h2 id="status-change-title">
					{statusChangeAction === "approved"
						? "Approve Theme"
						: statusChangeAction === "featured"
							? "Feature Theme"
							: statusChangeAction === "in_review"
								? "Move to In Review"
								: statusChangeAction === "changes_requested"
									? "Request Changes"
									: statusChangeAction === "rejected"
										? "Reject Theme"
										: "Change Status"}
				</h2>
				<button
					type="button"
					class="modal-close"
					onclick={onCloseStatusChange}
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
				<p>Theme: <strong>{statusChangeTheme.name}</strong></p>

				{#if statusChangeAction === "changes_requested" || statusChangeAction === "rejected"}
					<div class="reason-field">
						<label for="status-reason">
							Reason {statusChangeAction === "rejected" ? "(required)" : ""}:
						</label>
						<textarea
							id="status-reason"
							value={statusChangeReason}
							oninput={(e) => onReasonChange(e.currentTarget.value)}
							placeholder="Explain why this action is being taken..."
							rows="4"
						></textarea>
					</div>
				{/if}

				{#if statusChangeError}
					<p class="status-change-error" role="alert">{statusChangeError}</p>
				{/if}

				<div class="modal-actions">
					<button type="button" class="modal-btn cancel" onclick={onCloseStatusChange}>
						Cancel
					</button>
					<button type="button" class="modal-btn confirm" onclick={onConfirmStatusChange}>
						Confirm
					</button>
				</div>
			</div>
		</div>
	</div>
{/if}

<style>
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

	.preview-meta {
		margin-top: 1.5rem;
		padding-top: 1.5rem;
		border-top: 2px solid var(--color-border, #e5e5e5);
	}

	.preview-meta p {
		margin: 0 0 0.5rem 0;
		font-size: 0.875rem;
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

	.status-change-error {
		margin: 1rem 0 0 0;
		padding: 0.75rem 1rem;
		background: color-mix(in srgb, #dc2626 10%, transparent);
		color: #b91c1c;
		border: 1px solid color-mix(in srgb, #dc2626 25%, transparent);
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 500;
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

	@media (prefers-reduced-motion: reduce) {
		* {
			transition: none !important;
		}
	}
</style>
