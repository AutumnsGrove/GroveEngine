<script lang="ts">
	// CommunityThemeSubmit.svelte — orchestrator
	// Form component for submitting custom themes to the community

	import type { CommunityTheme, UserTier, ThemeColors, ThemeFonts, ThemeLayout } from "../types.js";
	import type { Theme } from "../types.js";
	import { themes } from "../themes/registry.js";
	import { validateThemeContrast } from "../utils/contrast.js";
	import { MAX_CSS_SIZE } from "../server/css-validator.js";
	import ColorPanel from "./ColorPanel.svelte";
	import TypographyPanel from "./TypographyPanel.svelte";
	import LayoutPanel from "./LayoutPanel.svelte";
	import CustomCSSEditor from "./CustomCSSEditor.svelte";
	import ThemeBasicsPanel from "./ThemeBasicsPanel.svelte";
	import ThemePreviewSidebar from "./ThemePreviewSidebar.svelte";

	interface Props {
		userTier: UserTier;
		onSubmit?: (theme: Partial<CommunityTheme>) => void;
		onCancel?: () => void;
	}

	let { userTier, onSubmit, onCancel }: Props = $props();

	// Tier hierarchy for access control (Oak+ = tier level 3+)
	const tierLevels: Record<UserTier, number> = {
		wanderer: 0,
		seedling: 1,
		sapling: 2,
		oak: 3,
		evergreen: 4,
	};

	const canSubmitThemes = $derived(tierLevels[userTier] >= 3);

	// Form state
	let name = $state("");
	let description = $state("");
	let tagsInput = $state("");
	let selectedBaseTheme = $state<string>("");

	// Customization toggles
	let customColorsEnabled = $state(false);
	let customTypographyEnabled = $state(false);
	let customLayoutEnabled = $state(false);
	let customCSSEnabled = $state(false);

	// Customization values
	let customColors = $state<Partial<ThemeColors>>({});
	let customTypography = $state<Partial<ThemeFonts>>({});
	let customLayout = $state<Partial<ThemeLayout>>({});
	let customCSS = $state("");

	// Form state
	let isSubmitting = $state(false);
	let submitSuccess = $state(false);
	let submitError = $state<string | null>(null);

	// Get base themes list for dropdown
	const baseThemesList = $derived(Object.values(themes));

	// Get selected base theme object
	const baseTheme = $derived<Theme | null>(selectedBaseTheme ? themes[selectedBaseTheme] : null);

	// Build effective theme for preview
	const effectiveTheme = $derived.by(() => {
		if (!baseTheme) return null;

		return {
			...baseTheme,
			colors: customColorsEnabled ? { ...baseTheme.colors, ...customColors } : baseTheme.colors,
			fonts: customTypographyEnabled
				? { ...baseTheme.fonts, ...customTypography }
				: baseTheme.fonts,
			layout: customLayoutEnabled ? { ...baseTheme.layout, ...customLayout } : baseTheme.layout,
			customCSS: customCSSEnabled ? customCSS : undefined,
		};
	});

	// Parse tags from comma-separated input
	const tags = $derived.by(() => {
		if (!tagsInput.trim()) return [];
		return tagsInput
			.split(",")
			.map((tag) => tag.trim())
			.filter((tag) => tag.length > 0)
			.slice(0, 5);
	});

	// Validation states
	const nameValid = $derived(name.trim().length > 0 && name.length <= 60);
	const descriptionValid = $derived(description.length <= 300);
	const baseThemeValid = $derived(selectedBaseTheme !== "");
	const tagsValid = $derived(tags.length <= 5);

	// WCAG contrast validation
	const contrastValid = $derived.by(() => {
		if (!effectiveTheme) return true;
		const result = validateThemeContrast(effectiveTheme!);
		return result.valid;
	});

	// CSS validation
	let cssValid = $state(true);
	let cssError = $state<string | undefined>(undefined);

	function handleCSSValidate(isValid: boolean, error?: string) {
		cssValid = isValid;
		cssError = error;
	}

	const cssSizeValid = $derived.by(() => {
		if (!customCSSEnabled || !customCSS) return true;
		return new Blob([customCSS]).size <= MAX_CSS_SIZE;
	});

	const isFormValid = $derived(
		nameValid &&
			descriptionValid &&
			baseThemeValid &&
			tagsValid &&
			contrastValid &&
			(!customCSSEnabled || (cssValid && cssSizeValid)),
	);

	// Handle panel changes
	function handleColorsChange(changes: Partial<ThemeColors>) {
		customColors = { ...customColors, ...changes };
	}

	function handleTypographyChange(changes: Partial<ThemeFonts>) {
		customTypography = { ...customTypography, ...changes };
	}

	function handleLayoutChange(changes: Partial<ThemeLayout>) {
		customLayout = { ...customLayout, ...changes };
	}

	function handleCSSChange(css: string) {
		customCSS = css;
	}

	async function handleSubmit(event: Event) {
		event.preventDefault();

		if (!isFormValid || isSubmitting) return;

		isSubmitting = true;
		submitError = null;
		submitSuccess = false;

		try {
			const themeData: Partial<CommunityTheme> = {
				name: name.trim(),
				description: description.trim() || undefined,
				tags: tags.length > 0 ? tags : undefined,
				baseTheme: selectedBaseTheme,
				customColors:
					customColorsEnabled && Object.keys(customColors).length > 0 ? customColors : undefined,
				customTypography:
					customTypographyEnabled && Object.keys(customTypography).length > 0
						? customTypography
						: undefined,
				customLayout:
					customLayoutEnabled && Object.keys(customLayout).length > 0 ? customLayout : undefined,
				customCSS: customCSSEnabled && customCSS.trim() ? customCSS.trim() : undefined,
			};

			await onSubmit?.(themeData);
			submitSuccess = true;

			setTimeout(() => {
				handleReset();
			}, 2000);
		} catch (error) {
			submitError = error instanceof Error ? error.message : "Failed to submit theme";
		} finally {
			isSubmitting = false;
		}
	}

	function handleReset() {
		name = "";
		description = "";
		tagsInput = "";
		selectedBaseTheme = "";
		customColorsEnabled = false;
		customTypographyEnabled = false;
		customLayoutEnabled = false;
		customCSSEnabled = false;
		customColors = {};
		customTypography = {};
		customLayout = {};
		customCSS = "";
		submitSuccess = false;
		submitError = null;
	}

	function handleCancelClick() {
		onCancel?.();
	}
</script>

{#if !canSubmitThemes}
	<!-- Tier gating message -->
	<div class="tier-gate" role="alert">
		<div class="lock-icon-large">
			<svg
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				aria-hidden="true"
			>
				<rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect>
				<path d="M7 11V7a5 5 0 0 1 10 0v4"></path>
			</svg>
		</div>
		<h2>Share Your Theme</h2>
		<p>
			Create and share custom themes with the Grove community. Available for Oak and Evergreen tier
			members.
		</p>
		<div class="tier-requirement">
			<span class="tier-badge-oak">Oak+</span> required
		</div>
	</div>
{:else}
	<div class="theme-submit-container">
		<form class="theme-submit-form" onsubmit={handleSubmit} aria-label="Submit community theme">
			<div class="form-content">
				<!-- Header -->
				<header class="form-header">
					<h2 class="form-title">Submit a Community Theme</h2>
					<p class="form-subtitle">Share your custom theme with the Grove community</p>
				</header>

				<!-- Basic Information -->
				<ThemeBasicsPanel
					{name}
					{description}
					{tagsInput}
					{selectedBaseTheme}
					{nameValid}
					{descriptionValid}
					{tagsValid}
					{tags}
					{baseThemesList}
					onNameChange={(v) => (name = v)}
					onDescriptionChange={(v) => (description = v)}
					onTagsInputChange={(v) => (tagsInput = v)}
					onBaseThemeChange={(v) => (selectedBaseTheme = v)}
				/>

				<!-- Customization Sections -->
				{#if baseTheme}
					<section class="form-section">
						<h3 class="section-title">Customizations</h3>
						<p class="section-hint">Toggle and configure your customizations below</p>

						<!-- Colors Toggle -->
						<details class="customization-section" bind:open={customColorsEnabled}>
							<summary class="customization-summary">
								<input
									type="checkbox"
									class="toggle-checkbox"
									bind:checked={customColorsEnabled}
									aria-label="Enable color customization"
								/>
								<span class="summary-text">Custom Colors</span>
								<span class="summary-icon" aria-hidden="true">
									{customColorsEnabled ? "▼" : "▶"}
								</span>
							</summary>
							<div class="customization-content">
								<ColorPanel
									colors={{ ...baseTheme.colors, ...customColors }}
									onChange={handleColorsChange}
								/>
							</div>
						</details>

						<!-- Typography Toggle -->
						<details class="customization-section" bind:open={customTypographyEnabled}>
							<summary class="customization-summary">
								<input
									type="checkbox"
									class="toggle-checkbox"
									bind:checked={customTypographyEnabled}
									aria-label="Enable typography customization"
								/>
								<span class="summary-text">Custom Typography</span>
								<span class="summary-icon" aria-hidden="true">
									{customTypographyEnabled ? "▼" : "▶"}
								</span>
							</summary>
							<div class="customization-content">
								<TypographyPanel
									fonts={{ ...baseTheme.fonts, ...customTypography }}
									onChange={handleTypographyChange}
								/>
							</div>
						</details>

						<!-- Layout Toggle -->
						<details class="customization-section" bind:open={customLayoutEnabled}>
							<summary class="customization-summary">
								<input
									type="checkbox"
									class="toggle-checkbox"
									bind:checked={customLayoutEnabled}
									aria-label="Enable layout customization"
								/>
								<span class="summary-text">Custom Layout</span>
								<span class="summary-icon" aria-hidden="true">
									{customLayoutEnabled ? "▼" : "▶"}
								</span>
							</summary>
							<div class="customization-content">
								<LayoutPanel
									layout={{ ...baseTheme.layout, ...customLayout }}
									onChange={handleLayoutChange}
								/>
							</div>
						</details>

						<!-- Custom CSS Toggle -->
						<details class="customization-section" bind:open={customCSSEnabled}>
							<summary class="customization-summary">
								<input
									type="checkbox"
									class="toggle-checkbox"
									bind:checked={customCSSEnabled}
									aria-label="Enable custom CSS"
								/>
								<span class="summary-text">Custom CSS</span>
								<span class="summary-icon" aria-hidden="true">
									{customCSSEnabled ? "▼" : "▶"}
								</span>
							</summary>
							<div class="customization-content">
								<CustomCSSEditor
									value={customCSS}
									maxSize={MAX_CSS_SIZE}
									onChange={handleCSSChange}
									onValidate={handleCSSValidate}
								/>
							</div>
						</details>
					</section>
				{/if}

				<!-- Validation Status -->
				{#if baseTheme && (customColorsEnabled || customTypographyEnabled)}
					<section class="form-section validation-status">
						<h3 class="section-title">Validation Status</h3>

						{#if customColorsEnabled}
							<div class="status-item" class:success={contrastValid} class:error={!contrastValid}>
								<span class="status-icon" aria-hidden="true">
									{contrastValid ? "✓" : "✗"}
								</span>
								<span class="status-text">
									{contrastValid
										? "WCAG AA contrast requirements met"
										: "WCAG AA contrast requirements not met"}
								</span>
							</div>
						{/if}

						{#if customCSSEnabled}
							<div
								class="status-item"
								class:success={cssValid && cssSizeValid}
								class:error={!cssValid || !cssSizeValid}
							>
								<span class="status-icon" aria-hidden="true">
									{cssValid && cssSizeValid ? "✓" : "✗"}
								</span>
								<span class="status-text">
									{#if !cssValid}
										CSS validation failed: {cssError}
									{:else if !cssSizeValid}
										CSS exceeds 10KB size limit
									{:else}
										Custom CSS is valid
									{/if}
								</span>
							</div>
						{/if}
					</section>
				{/if}

				<!-- Success/Error Messages -->
				{#if submitSuccess}
					<div class="submit-message success" role="alert">
						<svg
							class="message-icon"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							aria-hidden="true"
						>
							<polyline points="20 6 9 17 4 12"></polyline>
						</svg>
						<span>Theme submitted successfully!</span>
					</div>
				{/if}

				{#if submitError}
					<div class="submit-message error" role="alert">
						<svg
							class="message-icon"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							aria-hidden="true"
						>
							<circle cx="12" cy="12" r="10"></circle>
							<line x1="15" y1="9" x2="9" y2="15"></line>
							<line x1="9" y1="9" x2="15" y2="15"></line>
						</svg>
						<span>{submitError}</span>
					</div>
				{/if}

				<!-- Form Actions -->
				<footer class="form-actions">
					<button
						type="button"
						class="button button-secondary"
						onclick={handleReset}
						disabled={isSubmitting}
						aria-label="Reset form"
					>
						Reset
					</button>
					{#if onCancel}
						<button
							type="button"
							class="button button-secondary"
							onclick={handleCancelClick}
							disabled={isSubmitting}
							aria-label="Cancel submission"
						>
							Cancel
						</button>
					{/if}
					<button
						type="submit"
						class="button button-primary"
						disabled={!isFormValid || isSubmitting}
						aria-label="Submit theme"
					>
						{isSubmitting ? "Submitting..." : "Submit Theme"}
					</button>
				</footer>
			</div>

			<!-- Preview Panel -->
			{#if effectiveTheme}
				<ThemePreviewSidebar {effectiveTheme} />
			{/if}
		</form>
	</div>
{/if}

<style>
	/* Tier gate styling */
	.tier-gate {
		text-align: center;
		padding: 3rem 1.5rem;
		background: var(--color-surface, #f9fafb);
		border: 2px solid var(--color-border, #e5e5e5);
		border-radius: 1rem;
		max-width: 500px;
		margin: 2rem auto;
	}

	.lock-icon-large {
		width: 4rem;
		height: 4rem;
		margin: 0 auto 1.5rem;
		color: var(--color-foreground-muted, #666);
	}

	.tier-gate h2 {
		font-size: 1.5rem;
		font-weight: 700;
		color: var(--color-foreground, #111);
		margin: 0 0 0.75rem 0;
	}

	.tier-gate p {
		font-size: 1rem;
		color: var(--color-foreground-muted, #666);
		line-height: 1.6;
		margin: 0 0 1.5rem 0;
	}

	.tier-requirement {
		display: flex;
		align-items: center;
		justify-content: center;
		gap: 0.5rem;
		font-size: 0.875rem;
		color: var(--color-foreground-muted, #666);
	}

	.tier-badge-oak {
		padding: 0.25rem 0.75rem;
		border-radius: 0.375rem;
		font-weight: 600;
		text-transform: uppercase;
		letter-spacing: 0.05em;
		background: #f59e0b;
		color: #fff;
		font-size: 0.75rem;
	}

	/* Main container */
	.theme-submit-container {
		font-family: var(--font-body, system-ui, sans-serif);
		color: var(--color-foreground, #111);
	}

	.theme-submit-form {
		display: grid;
		grid-template-columns: 1fr;
		gap: 2rem;
		max-width: 100%;
	}

	@media (min-width: 1024px) {
		.theme-submit-form {
			grid-template-columns: 1fr 400px;
		}
	}

	.form-content {
		display: flex;
		flex-direction: column;
		gap: 2rem;
	}

	.form-header {
		padding-bottom: 1.5rem;
		border-bottom: 2px solid var(--color-border, #e5e5e5);
	}

	.form-title {
		margin: 0 0 0.5rem 0;
		font-size: 1.75rem;
		font-weight: 700;
		color: var(--color-foreground, #111);
	}

	.form-subtitle {
		margin: 0;
		font-size: 1rem;
		color: var(--color-foreground-muted, #666);
	}

	.form-section {
		display: flex;
		flex-direction: column;
		gap: 1.5rem;
	}

	.section-title {
		margin: 0;
		font-size: 1.25rem;
		font-weight: 600;
		color: var(--color-foreground, #111);
	}

	.section-hint {
		margin: -0.75rem 0 0 0;
		font-size: 0.875rem;
		color: var(--color-foreground-muted, #666);
	}

	/* Customization sections */
	.customization-section {
		background: var(--color-surface, #fff);
		border: 2px solid var(--color-border, #e5e5e5);
		border-radius: 0.5rem;
		overflow: hidden;
	}

	.customization-summary {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		cursor: pointer;
		user-select: none;
		list-style: none;
		font-weight: 600;
		color: var(--color-foreground, #111);
		transition: background-color 0.2s ease;
	}

	.customization-summary::-webkit-details-marker {
		display: none;
	}

	.customization-summary:hover {
		background: var(--color-background, #fefdfb);
	}

	.toggle-checkbox {
		width: 1.25rem;
		height: 1.25rem;
		cursor: pointer;
		accent-color: var(--color-accent, #16a34a); /* accent-ok */
	}

	.summary-text {
		flex: 1;
		font-size: 1rem;
	}

	.summary-icon {
		color: var(--color-foreground-muted, #666);
		font-size: 0.875rem;
	}

	.customization-content {
		padding: 1rem;
		border-top: 1px solid var(--color-border, #e5e5e5);
		background: var(--color-background, #fefdfb);
	}

	/* Validation status */
	.validation-status {
		background: var(--color-surface, #fff);
		border: 1px solid var(--color-border, #e5e5e5);
		border-radius: 0.5rem;
		padding: 1.5rem;
	}

	.status-item {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 0.75rem;
		border-radius: 0.375rem;
		margin-bottom: 0.75rem;
	}

	.status-item:last-child {
		margin-bottom: 0;
	}

	.status-item.success {
		background: #dcfce7; /* accent-ok */
		border-left: 3px solid #16a34a; /* accent-ok */
	}

	.status-item.error {
		background: #fee2e2;
		border-left: 3px solid #dc2626;
	}

	.status-icon {
		font-size: 1.25rem;
		font-weight: 700;
	}

	.status-item.success .status-icon {
		color: var(--grove-accent);
	}

	.status-item.error .status-icon {
		color: #dc2626;
	}

	.status-text {
		font-size: 0.875rem;
		font-weight: 500;
	}

	.status-item.success .status-text {
		color: var(--grove-accent-dark);
	}

	.status-item.error .status-text {
		color: #991b1b;
	}

	/* Submit messages */
	.submit-message {
		display: flex;
		align-items: center;
		gap: 0.75rem;
		padding: 1rem;
		border-radius: 0.5rem;
		border-left: 3px solid;
		font-weight: 500;
	}

	.submit-message.success {
		background: var(--grove-accent-15);
		border-color: var(--grove-accent);
		color: var(--grove-accent-dark);
	}

	.submit-message.error {
		background: #fee2e2;
		border-color: #dc2626;
		color: #991b1b;
	}

	.message-icon {
		width: 1.5rem;
		height: 1.5rem;
		flex-shrink: 0;
	}

	/* Form actions */
	.form-actions {
		display: flex;
		gap: 0.75rem;
		flex-wrap: wrap;
		padding-top: 1.5rem;
		border-top: 2px solid var(--color-border, #e5e5e5);
	}

	.button {
		flex: 1;
		min-width: fit-content;
		padding: 0.75rem 1.5rem;
		border-radius: 0.5rem;
		font-size: 1rem;
		font-weight: 600;
		cursor: pointer;
		transition: all 0.2s ease;
		border: none;
	}

	.button:focus {
		outline: none;
		box-shadow: 0 0 0 3px var(--grove-accent-30);
	}

	.button:disabled {
		opacity: 0.5;
		cursor: not-allowed;
	}

	.button-primary {
		background: var(--grove-accent);
		color: #fff;
	}

	.button-primary:hover:not(:disabled) {
		background: var(--grove-accent-dark);
	}

	.button-secondary {
		background: transparent;
		color: var(--color-foreground, #111);
		border: 2px solid var(--color-border, #e5e5e5);
	}

	.button-secondary:hover:not(:disabled) {
		background: var(--color-surface, #fff);
		border-color: var(--color-foreground-muted, #666);
	}

	@media (max-width: 640px) {
		.form-title {
			font-size: 1.5rem;
		}

		.form-actions {
			flex-direction: column;
		}

		.button {
			width: 100%;
		}
	}

	@media (prefers-reduced-motion: reduce) {
		.button,
		.customization-summary {
			transition: none;
		}
	}
</style>
