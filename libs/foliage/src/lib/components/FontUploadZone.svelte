<script lang="ts">
	interface Props {
		isDragging: boolean;
		isValidating: boolean;
		selectedFile: File | null;
		isValid: boolean;
		hasErrors: boolean;
		canUpload: boolean;
		maxSizeKB: string;
		maxFonts: number;
		onDragEnter: (e: DragEvent) => void;
		onDragLeave: (e: DragEvent) => void;
		onDragOver: (e: DragEvent) => void;
		onDrop: (e: DragEvent) => void;
		onInputChange: (e: Event) => void;
		onOpenFileDialog: () => void;
		formatFileSize: (bytes: number) => string;
	}

	let {
		isDragging,
		isValidating,
		selectedFile,
		isValid,
		hasErrors,
		canUpload,
		maxSizeKB,
		maxFonts,
		onDragEnter,
		onDragLeave,
		onDragOver,
		onDrop,
		onInputChange,
		onOpenFileDialog,
		formatFileSize,
	}: Props = $props();

	let fileInput = $state<HTMLInputElement>(undefined!);

	export function getFileInput(): HTMLInputElement {
		return fileInput;
	}
</script>

{#if canUpload}
	<div
		class="upload-zone"
		class:dragging={isDragging}
		class:has-file={selectedFile !== null}
		ondragenter={onDragEnter}
		ondragleave={onDragLeave}
		ondragover={onDragOver}
		ondrop={onDrop}
		role="button"
		tabindex="0"
		aria-label="Upload font file"
		onclick={onOpenFileDialog}
		onkeydown={(e) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				onOpenFileDialog();
			}
		}}
	>
		<input
			bind:this={fileInput}
			type="file"
			accept=".woff2"
			onchange={onInputChange}
			class="file-input"
			aria-label="Font file input"
		/>

		<div class="upload-content">
			{#if isValidating}
				<div class="upload-icon validating">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="48"
						height="48"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M21 12a9 9 0 1 1-6.219-8.56" />
					</svg>
				</div>
				<p class="upload-text">Validating font file...</p>
			{:else if selectedFile}
				<div class="upload-icon" class:success={isValid} class:error={hasErrors}>
					{#if isValid}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="48"
							height="48"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" />
							<polyline points="22 4 12 14.01 9 11.01" />
						</svg>
					{:else}
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="48"
							height="48"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<circle cx="12" cy="12" r="10" />
							<line x1="15" y1="9" x2="9" y2="15" />
							<line x1="9" y1="9" x2="15" y2="15" />
						</svg>
					{/if}
				</div>
				<p class="upload-text">
					{selectedFile.name}
					<span class="file-size">({formatFileSize(selectedFile.size)})</span>
				</p>
			{:else}
				<div class="upload-icon">
					<svg
						xmlns="http://www.w3.org/2000/svg"
						width="48"
						height="48"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
						<polyline points="17 8 12 3 7 8" />
						<line x1="12" y1="3" x2="12" y2="15" />
					</svg>
				</div>
				<p class="upload-text">Drop a WOFF2 font file here or click to browse</p>
				<p class="upload-hint">Maximum size: {maxSizeKB}KB</p>
			{/if}
		</div>
	</div>
{:else}
	<div class="upload-zone disabled">
		<div class="upload-content">
			<div class="upload-icon disabled">
				<svg
					xmlns="http://www.w3.org/2000/svg"
					width="48"
					height="48"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<circle cx="12" cy="12" r="10" />
					<line x1="4.93" y1="4.93" x2="19.07" y2="19.07" />
				</svg>
			</div>
			<p class="upload-text">Font limit reached</p>
			<p class="upload-hint">Delete existing fonts to upload new ones</p>
		</div>
	</div>
{/if}

<style>
	.upload-zone {
		position: relative;
		display: flex;
		flex-direction: column;
		align-items: center;
		justify-content: center;
		min-height: 12rem;
		padding: 2rem;
		background: var(--color-surface, #fff);
		border: 2px dashed var(--color-border, #e5e5e5);
		border-radius: 0.5rem;
		cursor: pointer;
		transition: all 0.2s ease;
	}

	.upload-zone:not(.disabled):hover {
		border-color: var(--grove-accent);
		background: var(--color-background, #fefdfb);
	}

	.upload-zone:not(.disabled):focus {
		outline: none;
		border-color: var(--grove-accent);
		box-shadow: 0 0 0 3px var(--grove-accent-20);
	}

	.upload-zone.dragging {
		border-color: var(--grove-accent);
		background: var(--grove-accent-5);
		border-style: solid;
	}

	.upload-zone.has-file {
		border-style: solid;
	}

	.upload-zone.disabled {
		cursor: not-allowed;
		opacity: 0.6;
		background: var(--color-background, #fefdfb);
	}

	.file-input {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		white-space: nowrap;
		border-width: 0;
	}

	.upload-content {
		display: flex;
		flex-direction: column;
		align-items: center;
		gap: 0.75rem;
		text-align: center;
	}

	.upload-icon {
		color: var(--color-foreground-muted, #666);
	}

	.upload-icon.validating {
		color: var(--grove-accent);
		animation: spin 1s linear infinite;
	}

	.upload-icon.success {
		color: hsl(var(--success));
	}

	.upload-icon.error {
		color: var(--color-error);
	}

	.upload-icon.disabled {
		color: var(--color-border, #e5e5e5);
	}

	@keyframes spin {
		from {
			transform: rotate(0deg);
		}
		to {
			transform: rotate(360deg);
		}
	}

	.upload-text {
		margin: 0;
		font-size: 1rem;
		font-weight: 500;
		color: var(--color-foreground, #111);
	}

	.file-size {
		color: var(--color-foreground-muted, #666);
		font-weight: 400;
		font-size: 0.875rem;
	}

	.upload-hint {
		margin: 0;
		font-size: 0.875rem;
		color: var(--color-foreground-muted, #666);
	}

	@media (max-width: 640px) {
		.upload-zone {
			min-height: 10rem;
			padding: 1.5rem;
		}

		.upload-icon svg {
			width: 40px;
			height: 40px;
		}

		.upload-text {
			font-size: 0.9375rem;
		}
	}

	@media (prefers-color-scheme: dark) {
		.upload-zone {
			background: var(--color-surface, #1a1a1a);
		}

		.upload-zone:not(.disabled):hover {
			background: var(--color-background, #0a0a0a);
		}
	}
</style>
