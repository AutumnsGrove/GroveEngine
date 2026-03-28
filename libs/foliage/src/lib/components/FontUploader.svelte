<script lang="ts">
	// FontUploader.svelte
	// Custom font upload component (Evergreen tier) — orchestrator

	import type { CustomFont, ValidationResult } from "../types.js";
	import FontUploadZone from "./FontUploadZone.svelte";
	import FontValidationStatus from "./FontValidationStatus.svelte";
	import ExistingFontsList from "./ExistingFontsList.svelte";

	interface Props {
		tenantId: string;
		existingFonts?: CustomFont[];
		maxFonts?: number;
		maxSize?: number;
		onUpload?: (font: CustomFont) => void;
		onDelete?: (fontId: string) => void;
		onError?: (error: string) => void;
	}

	let {
		tenantId,
		existingFonts = [],
		maxFonts = 10,
		maxSize = 512000,
		onUpload,
		onDelete,
		onError,
	}: Props = $props();

	// WOFF2 magic bytes signature: 'wOF2' (0x774F4632)
	const WOFF2_SIGNATURE = new Uint8Array([0x77, 0x4f, 0x46, 0x32]);

	// Local state
	let isDragging = $state(false);
	let isValidating = $state(false);
	let selectedFile = $state<File | null>(null);
	let validationResult = $state<ValidationResult | null>(null);
	let previewFontFamily = $state<string | null>(null);
	let uploadZone = $state<FontUploadZone>(undefined!);

	// Derived state
	let fontCount = $derived(existingFonts.length);
	let canUpload = $derived(fontCount < maxFonts);
	let maxSizeKB = $derived((maxSize / 1024).toFixed(0));
	let hasErrors = $derived(validationResult !== null && !validationResult.valid);
	let isValid = $derived(validationResult !== null && validationResult.valid);

	async function validateWoff2MagicBytes(file: File): Promise<ValidationResult> {
		return new Promise((resolve) => {
			const reader = new FileReader();

			reader.onload = (e) => {
				const arrayBuffer = e.target?.result as ArrayBuffer;
				if (!arrayBuffer) {
					resolve({ valid: false, error: "Failed to read file" });
					return;
				}

				if (arrayBuffer.byteLength > maxSize) {
					resolve({
						valid: false,
						error: `File exceeds maximum size of ${maxSizeKB}KB (current: ${(arrayBuffer.byteLength / 1024).toFixed(1)}KB)`,
					});
					return;
				}

				if (arrayBuffer.byteLength < 48) {
					resolve({ valid: false, error: "File is too small to be a valid WOFF2 font" });
					return;
				}

				const header = new Uint8Array(arrayBuffer.slice(0, 4));
				const isWoff2 = header.every((byte, i) => byte === WOFF2_SIGNATURE[i]);

				if (!isWoff2) {
					resolve({
						valid: false,
						error: "Invalid WOFF2 file format. Only WOFF2 fonts are supported.",
					});
					return;
				}

				resolve({ valid: true });
			};

			reader.onerror = () => {
				resolve({ valid: false, error: "Failed to read file" });
			};

			reader.readAsArrayBuffer(file);
		});
	}

	async function handleFileSelect(file: File) {
		if (!canUpload) {
			validationResult = {
				valid: false,
				error: `Maximum of ${maxFonts} fonts allowed per account`,
			};
			if (validationResult.error) onError?.(validationResult.error);
			return;
		}

		if (!file.name.toLowerCase().endsWith(".woff2")) {
			validationResult = {
				valid: false,
				error: "Only .woff2 files are supported",
			};
			if (validationResult.error) onError?.(validationResult.error);
			return;
		}

		selectedFile = file;
		isValidating = true;
		validationResult = null;
		previewFontFamily = null;

		const result = await validateWoff2MagicBytes(file);
		validationResult = result;
		isValidating = false;

		if (result.valid) {
			createFontPreview(file);
		} else {
			onError?.(result.error || "Validation failed");
		}
	}

	function createFontPreview(file: File) {
		const reader = new FileReader();
		reader.onload = (e) => {
			const arrayBuffer = e.target?.result as ArrayBuffer;
			if (!arrayBuffer) return;

			const fontFamily = `preview-${file.name.replace(/\.[^/.]+$/, "").replace(/[^a-zA-Z0-9]/g, "-")}`;
			previewFontFamily = fontFamily;

			const blob = new Blob([arrayBuffer], { type: "font/woff2" });
			const url = URL.createObjectURL(blob);

			const style = document.createElement("style");
			style.textContent = `
				@font-face {
					font-family: '${fontFamily}';
					src: url('${url}') format('woff2');
					font-display: swap;
				}
			`;
			document.head.appendChild(style);

			setTimeout(() => {
				URL.revokeObjectURL(url);
			}, 5000);
		};
		reader.readAsArrayBuffer(file);
	}

	function handleDragEnter(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isDragging = true;
	}

	function handleDragLeave(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isDragging = false;
	}

	function handleDragOver(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		e.stopPropagation();
		isDragging = false;

		const files = e.dataTransfer?.files;
		if (files && files.length > 0) {
			handleFileSelect(files[0]);
		}
	}

	function handleInputChange(e: Event) {
		const target = e.target as HTMLInputElement;
		const files = target.files;
		if (files && files.length > 0) {
			handleFileSelect(files[0]);
		}
	}

	function openFileDialog() {
		uploadZone?.getFileInput()?.click();
	}

	function uploadFont() {
		if (!selectedFile || !isValid) return;

		const fileName = selectedFile.name.replace(/\.woff2$/i, "");
		const sanitizedName = fileName.replace(/[^a-zA-Z0-9\s-]/g, "").trim();

		const customFont: CustomFont = {
			id: crypto.randomUUID(),
			tenantId,
			name: fileName,
			family: sanitizedName || "Custom Font",
			category: "sans-serif",
			woff2Path: "",
			fileSize: selectedFile.size,
		};

		onUpload?.(customFont);

		selectedFile = null;
		validationResult = null;
		previewFontFamily = null;
	}

	function clearSelection() {
		selectedFile = null;
		validationResult = null;
		previewFontFamily = null;
	}

	function handleDelete(fontId: string) {
		onDelete?.(fontId);
	}

	function formatFileSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}
</script>

<div class="font-uploader">
	<div class="uploader-header">
		<h3 class="uploader-title">Custom Fonts</h3>
		<div class="font-count">
			<span class="count-value" class:at-limit={!canUpload}>{fontCount}</span>
			<span class="count-separator">/</span>
			<span class="count-max">{maxFonts}</span>
		</div>
	</div>

	<div class="uploader-info">
		<p class="info-text">
			Upload custom WOFF2 fonts to use in your theme. Maximum {maxSizeKB}KB per file, up to
			{maxFonts} fonts total.
		</p>
	</div>

	<FontUploadZone
		bind:this={uploadZone}
		{isDragging}
		{isValidating}
		{selectedFile}
		{isValid}
		{hasErrors}
		{canUpload}
		{maxSizeKB}
		{maxFonts}
		onDragEnter={handleDragEnter}
		onDragLeave={handleDragLeave}
		onDragOver={handleDragOver}
		onDrop={handleDrop}
		onInputChange={handleInputChange}
		onOpenFileDialog={openFileDialog}
		{formatFileSize}
	/>

	<FontValidationStatus
		{validationResult}
		{isValid}
		{selectedFile}
		{previewFontFamily}
		onUpload={uploadFont}
		onClear={clearSelection}
	/>

	<ExistingFontsList {existingFonts} onDelete={handleDelete} {formatFileSize} />
</div>

<style>
	.font-uploader {
		display: flex;
		flex-direction: column;
		gap: 1rem;
		font-family: var(--font-body, system-ui, sans-serif);
		color: var(--color-foreground, #111);
	}

	.uploader-header {
		display: flex;
		justify-content: space-between;
		align-items: center;
	}

	.uploader-title {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-foreground, #111);
	}

	.font-count {
		display: flex;
		align-items: baseline;
		gap: 0.25rem;
		font-family: var(--font-mono, ui-monospace, monospace);
		font-size: 1rem;
	}

	.count-value {
		font-weight: 700;
		color: var(--grove-accent);
	}

	.count-value.at-limit {
		color: var(--color-error);
	}

	.count-separator {
		color: var(--color-foreground-muted, #666);
	}

	.count-max {
		color: var(--color-foreground-muted, #666);
		font-weight: 500;
	}

	.uploader-info {
		padding: 0.75rem;
		background: var(--color-surface, #fff);
		border-left: 3px solid var(--grove-accent);
		border-radius: 0.25rem;
	}

	.info-text {
		margin: 0;
		font-size: 0.875rem;
		color: var(--color-foreground-muted, #666);
		line-height: 1.5;
	}

	@media (max-width: 640px) {
		.font-uploader {
			gap: 0.875rem;
		}
	}
</style>
