<script lang="ts">
	import type { CustomFont } from "../types.js";

	interface Props {
		existingFonts: CustomFont[];
		onDelete: (fontId: string) => void;
		formatFileSize: (bytes: number) => string;
	}

	let { existingFonts, onDelete, formatFileSize }: Props = $props();
</script>

{#if existingFonts.length > 0}
	<div class="existing-fonts">
		<h4 class="section-title">Uploaded Fonts</h4>
		<ul class="fonts-list" role="list">
			{#each existingFonts as font (font.id)}
				<li class="font-item">
					<div class="font-info">
						<div class="font-name">{font.name}</div>
						<div class="font-meta">
							<span class="font-family">{font.family}</span>
							<span class="font-separator">•</span>
							<span class="font-size">{formatFileSize(font.fileSize)}</span>
							<span class="font-separator">•</span>
							<span class="font-category">{font.category}</span>
						</div>
					</div>
					<button
						type="button"
						class="delete-button"
						onclick={() => onDelete(font.id)}
						aria-label="Delete {font.name}"
					>
						<svg
							xmlns="http://www.w3.org/2000/svg"
							width="20"
							height="20"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<polyline points="3 6 5 6 21 6" />
							<path
								d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"
							/>
							<line x1="10" y1="11" x2="10" y2="17" />
							<line x1="14" y1="11" x2="14" y2="17" />
						</svg>
					</button>
				</li>
			{/each}
		</ul>
	</div>
{/if}

<style>
	.existing-fonts {
		margin-top: 0.5rem;
	}

	.section-title {
		margin: 0 0 0.75rem 0;
		font-size: 1rem;
		font-weight: 600;
		color: var(--color-foreground, #111);
	}

	.fonts-list {
		margin: 0;
		padding: 0;
		list-style: none;
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.font-item {
		display: flex;
		justify-content: space-between;
		align-items: center;
		padding: 0.75rem 1rem;
		background: var(--color-surface, #fff);
		border: 1px solid var(--color-border, #e5e5e5);
		border-radius: 0.375rem;
		transition: all 0.15s ease;
	}

	.font-item:hover {
		border-color: var(--color-foreground-muted, #666);
		box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
	}

	.font-info {
		display: flex;
		flex-direction: column;
		gap: 0.25rem;
		flex: 1;
	}

	.font-name {
		font-size: 0.9375rem;
		font-weight: 600;
		color: var(--color-foreground, #111);
	}

	.font-meta {
		display: flex;
		align-items: center;
		gap: 0.5rem;
		font-size: 0.8125rem;
		color: var(--color-foreground-muted, #666);
	}

	.font-family {
		font-family: var(--font-mono, ui-monospace, monospace);
	}

	.font-separator {
		color: var(--color-border, #e5e5e5);
	}

	.delete-button {
		padding: 0.5rem;
		background: transparent;
		border: 1px solid transparent;
		border-radius: 0.25rem;
		color: var(--color-foreground-muted, #666);
		cursor: pointer;
		transition: all 0.15s ease;
		display: flex;
		align-items: center;
		justify-content: center;
	}

	.delete-button:hover {
		background: #fee2e2;
		border-color: #fecaca;
		color: #dc2626;
	}

	.delete-button:focus {
		outline: none;
		border-color: #dc2626;
		box-shadow: 0 0 0 2px color-mix(in srgb, #dc2626 20%, transparent);
	}

	@media (max-width: 640px) {
		.font-item {
			flex-direction: column;
			align-items: flex-start;
			gap: 0.75rem;
		}

		.delete-button {
			align-self: flex-end;
		}
	}

	@media (prefers-color-scheme: dark) {
		.font-item {
			background: var(--color-surface, #1a1a1a);
		}

		.delete-button:hover {
			background: color-mix(in srgb, #dc2626 15%, transparent);
		}
	}
</style>
