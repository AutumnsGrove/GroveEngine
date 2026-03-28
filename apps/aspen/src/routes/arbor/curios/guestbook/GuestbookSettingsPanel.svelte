<script lang="ts">
	import { enhance } from "$app/forms";
	import GlassCard from "@autumnsgrove/lattice/ui/components/ui/GlassCard.svelte";
	import GlassButton from "@autumnsgrove/lattice/ui/components/ui/GlassButton.svelte";
	import { stateIcons, actionIcons } from "@autumnsgrove/prism/icons";
	import type {
		GuestbookStyle,
		GuestbookWallBacking,
		GuestbookSigningStyle,
		GuestbookCtaStyle,
		GuestbookInlineMode,
	} from "@autumnsgrove/lattice/curios/guestbook";
	import { isValidHexColor } from "@autumnsgrove/lattice/curios/guestbook";

	interface Props {
		enabled: boolean;
		style: GuestbookStyle;
		entriesPerPage: number;
		requireApproval: boolean;
		allowEmoji: boolean;
		maxMessageLength: number;
		customPrompt: string;
		wallBacking: GuestbookWallBacking;
		ctaStyle: GuestbookCtaStyle;
		inlineMode: GuestbookInlineMode;
		allowedStyles: GuestbookSigningStyle[];
		colorPalette: string[];
		isSubmitting: boolean;
		styleOptions: Array<{ value: string; label: string; description: string }>;
		wallBackingOptions: Array<{ value: string; label: string; description: string }>;
		signingStyleOptions: Array<{ value: GuestbookSigningStyle; label: string; description: string }>;
		onEnabledChange: (value: boolean) => void;
		onStyleChange: (value: GuestbookStyle) => void;
		onWallBackingChange: (value: GuestbookWallBacking) => void;
		onInlineModeChange: (value: GuestbookInlineMode) => void;
		onRequireApprovalChange: (value: boolean) => void;
		onAllowEmojiChange: (value: boolean) => void;
		onEntriesPerPageChange: (value: number) => void;
		onMaxMessageLengthChange: (value: number) => void;
		onCustomPromptChange: (value: string) => void;
		onToggleSigningStyle: (s: GuestbookSigningStyle) => void;
		onAddColor: (color: string) => void;
		onRemoveColor: (color: string) => void;
		onResetPalette: () => void;
		onSubmitStart: () => void;
		onSubmitEnd: () => void;
	}

	let {
		enabled, style, entriesPerPage, requireApproval, allowEmoji, maxMessageLength,
		customPrompt, wallBacking, ctaStyle, inlineMode, allowedStyles, colorPalette,
		isSubmitting, styleOptions, wallBackingOptions, signingStyleOptions,
		onEnabledChange, onStyleChange, onWallBackingChange, onInlineModeChange,
		onRequireApprovalChange, onAllowEmojiChange, onEntriesPerPageChange,
		onMaxMessageLengthChange, onCustomPromptChange, onToggleSigningStyle,
		onAddColor, onRemoveColor, onResetPalette, onSubmitStart, onSubmitEnd,
	}: Props = $props();

	let newColorInput = $state("#8b5e3c");

	function addColor() {
		const color = newColorInput.trim();
		if (isValidHexColor(color) && !colorPalette.includes(color)) {
			onAddColor(color);
		}
	}
</script>

<GlassCard class="settings-card">
	<form
		method="POST"
		action="?/save"
		use:enhance={() => {
			onSubmitStart();
			return async ({ update }) => {
				onSubmitEnd();
				await update();
			};
		}}
	>
		<!-- Enable Toggle -->
		<div class="form-section">
			<h3>General</h3>
			<label class="toggle-row">
				<span class="toggle-label">
					<strong>Enable Guestbook</strong>
					<span class="toggle-hint">Make the guestbook visible on your site</span>
				</span>
				<input
					type="checkbox"
					name="enabled"
					value="true"
					checked={enabled}
					onchange={(e) => onEnabledChange(e.currentTarget.checked)}
					class="toggle-input"
				/>
			</label>
		</div>

		<!-- Display Style -->
		<div class="form-section">
			<h3>Display Style</h3>
			<div class="style-grid">
				{#each styleOptions as option}
					<label class="style-option" class:selected={style === option.value}>
						<input type="radio" name="style" value={option.value} checked={style === option.value} onchange={() => onStyleChange(option.value as GuestbookStyle)} />
						<span class="style-name">{option.label}</span>
						<span class="style-desc">{option.description}</span>
					</label>
				{/each}
			</div>
		</div>

		<!-- Wall Backing -->
		<div class="form-section">
			<h3>Wall Backing</h3>
			<p class="section-hint">The texture behind your guestbook entries</p>
			<div class="style-grid">
				{#each wallBackingOptions as option}
					<label class="style-option" class:selected={wallBacking === option.value}>
						<input type="radio" name="wallBacking" value={option.value} checked={wallBacking === option.value} onchange={() => onWallBackingChange(option.value as GuestbookWallBacking)} />
						<span class="style-name">{option.label}</span>
						<span class="style-desc">{option.description}</span>
					</label>
				{/each}
			</div>
		</div>

		<!-- Signing Styles -->
		<div class="form-section">
			<h3>Signing Styles</h3>
			<p class="section-hint">Which entry styles visitors can use. At least one must be enabled.</p>
			<div class="signing-styles-grid">
				{#each signingStyleOptions as option}
					<button
						type="button"
						class="signing-chip"
						class:active={allowedStyles.includes(option.value)}
						onclick={() => onToggleSigningStyle(option.value)}
						aria-pressed={allowedStyles.includes(option.value)}
					>
						<span class="signing-chip-name">{option.label}</span>
						<span class="signing-chip-desc">{option.description}</span>
					</button>
				{/each}
			</div>
			<input type="hidden" name="allowedStyles" value={JSON.stringify(allowedStyles)} />
		</div>

		<!-- Color Palette -->
		<div class="form-section">
			<h3>Color Palette</h3>
			<p class="section-hint">Accent colors visitors can choose from. Used for entry highlights, not text.</p>
			<div class="palette-editor">
				<div class="palette-swatches">
					{#each colorPalette as color}
						<button
							type="button"
							class="palette-swatch"
							style:--swatch-color={color}
							onclick={() => onRemoveColor(color)}
							aria-label="Remove color {color}"
							title="Click to remove"
						>
							{#if colorPalette.length > 1}
								<span class="swatch-remove"><stateIcons.x class="w-3 h-3" /></span>
							{/if}
						</button>
					{/each}
					<div class="palette-add">
						<input type="color" bind:value={newColorInput} class="color-input" aria-label="Pick a new color" />
						<button type="button" class="add-color-btn" onclick={addColor} aria-label="Add color to palette">
							<actionIcons.plus class="w-3.5 h-3.5" />
						</button>
					</div>
				</div>
				<button type="button" class="reset-palette-btn" onclick={onResetPalette}>
					<actionIcons.rotateCcw class="w-3.5 h-3.5" />
					Reset to defaults
				</button>
			</div>
			<input type="hidden" name="colorPalette" value={JSON.stringify(colorPalette)} />
		</div>

		<!-- Inline Widget Mode -->
		<div class="form-section">
			<h3>Inline Widget</h3>
			<label class="toggle-row">
				<span class="toggle-label">
					<strong>Styled mini-collage</strong>
					<span class="toggle-hint">Show signing styles in the inline widget instead of compact list</span>
				</span>
				<input
					type="checkbox"
					name="inlineMode"
					value="styled"
					checked={inlineMode === "styled"}
					onchange={(e) => onInlineModeChange(e.currentTarget.checked ? "styled" : "compact")}
					class="toggle-input"
				/>
			</label>
		</div>

		<!-- Moderation -->
		<div class="form-section">
			<h3>Moderation</h3>
			<label class="toggle-row">
				<span class="toggle-label">
					<strong>Require Approval</strong>
					<span class="toggle-hint">Review entries before they appear publicly</span>
				</span>
				<input
					type="checkbox"
					name="requireApproval"
					value="true"
					checked={requireApproval}
					onchange={(e) => onRequireApprovalChange(e.currentTarget.checked)}
					class="toggle-input"
				/>
			</label>
		</div>

		<!-- Features -->
		<div class="form-section">
			<h3>Features</h3>
			<label class="toggle-row">
				<span class="toggle-label">
					<strong>Allow Emoji</strong>
					<span class="toggle-hint">Let visitors pick an emoji for their entry</span>
				</span>
				<input
					type="checkbox"
					name="allowEmoji"
					value="true"
					checked={allowEmoji}
					onchange={(e) => onAllowEmojiChange(e.currentTarget.checked)}
					class="toggle-input"
				/>
			</label>
		</div>

		<!-- Limits -->
		<div class="form-section">
			<h3>Limits</h3>
			<div class="input-group">
				<label class="input-label" for="entriesPerPage">Entries per page</label>
				<input id="entriesPerPage" type="number" name="entriesPerPage" value={entriesPerPage} oninput={(e) => onEntriesPerPageChange(Number(e.currentTarget.value))} min="10" max="100" class="number-input" />
			</div>
			<div class="input-group">
				<label class="input-label" for="maxMessageLength">Max message length</label>
				<input id="maxMessageLength" type="number" name="maxMessageLength" value={maxMessageLength} oninput={(e) => onMaxMessageLengthChange(Number(e.currentTarget.value))} min="50" max="2000" class="number-input" />
			</div>
		</div>

		<!-- Custom Prompt -->
		<div class="form-section">
			<h3>Custom Prompt</h3>
			<div class="input-group">
				<label class="input-label" for="customPrompt">Prompt text shown above the form</label>
				<input id="customPrompt" type="text" name="customPrompt" value={customPrompt} oninput={(e) => onCustomPromptChange(e.currentTarget.value)} placeholder="Leave a message!" class="text-input" />
			</div>
		</div>

		<div class="form-actions">
			<GlassButton type="submit" variant="accent" disabled={isSubmitting}>
				{isSubmitting ? "Saving..." : "Save Configuration"}
			</GlassButton>
		</div>
	</form>
</GlassCard>

<style>
	:global(.settings-card) { padding: 1.5rem !important; }
	.form-section { margin-bottom: 2rem; padding-bottom: 1.5rem; border-bottom: 1px solid var(--color-border, #e5e7eb); }
	.form-section:last-of-type { border-bottom: none; margin-bottom: 1rem; }
	.form-section h3 { font-size: 1rem; font-weight: 600; color: var(--color-text); margin: 0 0 1rem; }
	.toggle-row { display: flex; align-items: center; justify-content: space-between; gap: 1rem; cursor: pointer; }
	.toggle-label { display: flex; flex-direction: column; gap: 0.25rem; }
	.toggle-hint { font-size: 0.85rem; color: var(--color-text-muted); }
	.toggle-input { width: 2.5rem; height: 1.25rem; accent-color: var(--color-primary); cursor: pointer; }
	.style-grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 0.75rem; }
	.style-option { display: flex; flex-direction: column; gap: 0.25rem; padding: 1rem; border: 2px solid var(--color-border, #e5e7eb); border-radius: 0.75rem; cursor: pointer; transition: all 0.2s ease; }
	.style-option:hover { border-color: var(--color-primary); background: var(--grove-overlay-4, rgba(0,0,0,0.04)); }
	.style-option.selected { border-color: var(--color-primary); background: color-mix(in srgb, var(--color-primary) 10%, transparent); }
	.style-option input[type="radio"] {
		position: absolute;
		width: 1px;
		height: 1px;
		padding: 0;
		margin: -1px;
		overflow: hidden;
		clip: rect(0, 0, 0, 0);
		border: 0;
	}
	.style-name { font-weight: 600; font-size: 0.95rem; color: var(--color-text); }
	.style-desc { font-size: 0.8rem; color: var(--color-text-muted); }
	.input-group { margin-bottom: 1rem; }
	.input-group:last-child { margin-bottom: 0; }
	.input-label { display: block; font-size: 0.9rem; font-weight: 500; color: var(--color-text); margin-bottom: 0.5rem; }
	.number-input, .text-input { width: 100%; padding: 0.625rem 0.875rem; border: 1px solid var(--color-border, #e5e7eb); border-radius: 0.5rem; font-size: 0.9rem; color: var(--color-text); background: hsl(var(--background)); transition: border-color 0.2s ease; }
	.number-input:focus, .text-input:focus { outline: none; border-color: var(--color-primary); box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 20%, transparent); }
	.number-input { max-width: 150px; }
	.form-actions { display: flex; justify-content: flex-end; padding-top: 1rem; }
	.section-hint { font-size: 0.85rem; color: var(--color-text-muted); margin: -0.5rem 0 1rem; }
	.signing-styles-grid { display: flex; flex-wrap: wrap; gap: 0.5rem; margin-bottom: 0.75rem; }
	.signing-chip { display: flex; flex-direction: column; gap: 0.125rem; padding: 0.625rem 1rem; border: 2px solid var(--color-border, #e5e7eb); border-radius: 0.75rem; background: transparent; cursor: pointer; text-align: left; transition: all 0.15s ease; }
	.signing-chip:hover { border-color: var(--color-primary); }
	.signing-chip.active { border-color: var(--color-primary); background: color-mix(in srgb, var(--color-primary) 10%, transparent); }
	.signing-chip-name { font-weight: 600; font-size: 0.85rem; color: var(--color-text); }
	.signing-chip-desc { font-size: 0.75rem; color: var(--color-text-muted); }
	.palette-editor { display: flex; flex-direction: column; gap: 0.75rem; }
	.palette-swatches { display: flex; flex-wrap: wrap; gap: 0.5rem; align-items: center; }
	.palette-swatch { width: 2.25rem; height: 2.25rem; border-radius: 50%; background: var(--swatch-color); border: 2px solid transparent; cursor: pointer; position: relative; transition: all 0.15s ease; }
	.palette-swatch:hover { transform: scale(1.1); border-color: var(--color-text); }
	.swatch-remove { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.5); border-radius: 50%; color: white; opacity: 0; transition: opacity 0.15s ease; }
	.palette-swatch:hover .swatch-remove { opacity: 1; }
	.palette-add { display: flex; align-items: center; gap: 0.25rem; }
	.color-input { width: 2.25rem; height: 2.25rem; border: 1px solid var(--color-border, #e5e7eb); border-radius: 50%; padding: 0; cursor: pointer; background: none; }
	.color-input::-webkit-color-swatch-wrapper { padding: 2px; }
	.color-input::-webkit-color-swatch { border: none; border-radius: 50%; }
	.add-color-btn { display: flex; align-items: center; justify-content: center; width: 1.75rem; height: 1.75rem; border: 1px dashed var(--color-border, #e5e7eb); border-radius: 50%; background: transparent; cursor: pointer; color: var(--color-text-muted); transition: all 0.15s ease; }
	.add-color-btn:hover { border-color: var(--color-primary); color: var(--color-primary); }
	.reset-palette-btn { display: flex; align-items: center; gap: 0.375rem; padding: 0.375rem 0.75rem; border: 1px solid var(--color-border, #e5e7eb); border-radius: 0.5rem; background: transparent; cursor: pointer; font-size: 0.8rem; color: var(--color-text-muted); transition: all 0.15s ease; align-self: flex-start; }
	.reset-palette-btn:hover { color: var(--color-text); border-color: var(--color-text); }

	@media (max-width: 640px) {
		.style-grid { grid-template-columns: 1fr; }
		.toggle-row { flex-wrap: wrap; }
		.signing-styles-grid { gap: 0.375rem; }
		.signing-chip { padding: 0.5rem 0.75rem; }
		.palette-swatches { gap: 0.375rem; }
	}
</style>
