<script lang="ts">
	import type { ValidationResult } from "../types.js";

	interface Props {
		validationResult: ValidationResult | null;
		isValid: boolean;
		selectedFile: File | null;
		previewFontFamily: string | null;
		onUpload: () => void;
		onClear: () => void;
	}

	let { validationResult, isValid, selectedFile, previewFontFamily, onUpload, onClear }: Props =
		$props();
</script>

<!-- Validation Error -->
{#if validationResult && !validationResult.valid}
	<div class="validation-section error" role="alert">
		<div class="validation-title">Validation Error</div>
		<p class="validation-message">{validationResult.error}</p>
	</div>
{/if}

<!-- Validation Warnings -->
{#if validationResult && validationResult.valid && validationResult.warnings && validationResult.warnings.length > 0}
	<div class="validation-section warning" role="status">
		<div class="validation-title">Warnings</div>
		<ul class="validation-list">
			{#each validationResult.warnings as warning}
				<li>{warning}</li>
			{/each}
		</ul>
	</div>
{/if}

<!-- Validation Success + Preview + Upload -->
{#if isValid && selectedFile}
	<div class="validation-section success" role="status">
		<div class="validation-title">Font validated successfully</div>

		{#if previewFontFamily}
			<div class="font-preview">
				<p class="preview-label">Preview:</p>
				<p class="preview-text" style="font-family: '{previewFontFamily}', sans-serif;">
					The quick brown fox jumps over the lazy dog
				</p>
				<p class="preview-text-small" style="font-family: '{previewFontFamily}', sans-serif;">
					ABCDEFGHIJKLMNOPQRSTUVWXYZ abcdefghijklmnopqrstuvwxyz 0123456789
				</p>
			</div>
		{/if}

		<div class="upload-actions">
			<button type="button" class="action-button primary" onclick={onUpload}>
				Upload Font
			</button>
			<button type="button" class="action-button secondary" onclick={onClear}>
				Cancel
			</button>
		</div>
	</div>
{/if}

<style>
	.validation-section {
		padding: 0.75rem;
		border-radius: 0.375rem;
		border-left: 3px solid;
	}

	.validation-section.error {
		background: var(--color-error-bg);
		border-color: var(--color-error);
	}

	.validation-section.warning {
		background: hsl(var(--warning-bg));
		border-color: hsl(var(--warning));
	}

	.validation-section.success {
		background: hsl(var(--success-bg));
		border-color: hsl(var(--success));
	}

	.validation-title {
		font-size: 0.875rem;
		font-weight: 600;
		margin-bottom: 0.5rem;
	}

	.validation-section.error .validation-title {
		color: var(--color-error-text);
	}

	.validation-section.warning .validation-title {
		color: hsl(var(--warning-foreground));
	}

	.validation-section.success .validation-title {
		color: hsl(var(--success-foreground));
	}

	.validation-message {
		margin: 0;
		font-size: 0.875rem;
		line-height: 1.5;
	}

	.validation-section.error .validation-message {
		color: var(--color-error-text);
	}

	.validation-list {
		margin: 0;
		padding-left: 1.25rem;
		list-style: disc;
	}

	.validation-list li {
		font-size: 0.875rem;
		line-height: 1.5;
		color: hsl(var(--warning-foreground));
		margin-bottom: 0.25rem;
	}

	.validation-list li:last-child {
		margin-bottom: 0;
	}

	.font-preview {
		margin-top: 0.75rem;
		padding: 1rem;
		background: var(--color-surface, #fff);
		border: 1px solid var(--color-border, #e5e5e5);
		border-radius: 0.375rem;
	}

	.preview-label {
		margin: 0 0 0.5rem 0;
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--grove-accent-dark);
	}

	.preview-text {
		margin: 0 0 0.5rem 0;
		font-size: 1.25rem;
		line-height: 1.6;
		color: var(--color-foreground, #111);
	}

	.preview-text-small {
		margin: 0;
		font-size: 0.875rem;
		line-height: 1.6;
		color: var(--color-foreground-muted, #666);
	}

	.upload-actions {
		display: flex;
		gap: 0.75rem;
		margin-top: 0.75rem;
	}

	.action-button {
		padding: 0.625rem 1.25rem;
		border-radius: 0.375rem;
		font-size: 0.875rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.15s ease;
		border: 1px solid;
	}

	.action-button.primary {
		background: var(--grove-accent);
		border-color: var(--grove-accent);
		color: white;
	}

	.action-button.primary:hover {
		background: var(--grove-accent-dark);
		border-color: var(--grove-accent-dark);
	}

	.action-button.primary:focus {
		outline: none;
		box-shadow: 0 0 0 3px var(--grove-accent-20);
	}

	.action-button.secondary {
		background: var(--color-surface, #fff);
		border-color: var(--color-border, #e5e5e5);
		color: var(--color-foreground, #111);
	}

	.action-button.secondary:hover {
		background: var(--color-background, #fefdfb);
		border-color: var(--color-foreground-muted, #666);
	}

	.action-button.secondary:focus {
		outline: none;
		border-color: var(--grove-accent);
		box-shadow: 0 0 0 3px var(--grove-accent-20);
	}

	@media (max-width: 640px) {
		.upload-actions {
			flex-direction: column;
		}

		.action-button {
			width: 100%;
		}
	}

	@media (prefers-color-scheme: dark) {
		.font-preview {
			background: var(--color-background, #0a0a0a);
		}
	}
</style>
