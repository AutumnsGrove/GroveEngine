<script lang="ts">
	import type { Theme } from "../types.js";
	import { themes } from "../themes/registry.js";

	interface Props {
		name: string;
		description: string;
		tagsInput: string;
		selectedBaseTheme: string;
		nameValid: boolean;
		descriptionValid: boolean;
		tagsValid: boolean;
		tags: string[];
		baseThemesList: Theme[];
		onNameChange: (value: string) => void;
		onDescriptionChange: (value: string) => void;
		onTagsInputChange: (value: string) => void;
		onBaseThemeChange: (value: string) => void;
	}

	let {
		name,
		description,
		tagsInput,
		selectedBaseTheme,
		nameValid,
		descriptionValid,
		tagsValid,
		tags,
		baseThemesList,
		onNameChange,
		onDescriptionChange,
		onTagsInputChange,
		onBaseThemeChange,
	}: Props = $props();
</script>

<section class="form-section">
	<h3 class="section-title">Basic Information</h3>

	<!-- Name field -->
	<div class="form-field">
		<label for="theme-name" class="field-label">
			Theme Name <span class="required">*</span>
		</label>
		<input
			id="theme-name"
			type="text"
			class="text-input"
			class:invalid={name.length > 0 && !nameValid}
			value={name}
			oninput={(e) => onNameChange(e.currentTarget.value)}
			maxlength="60"
			placeholder="My Awesome Theme"
			required
			aria-required="true"
			aria-invalid={!nameValid}
			aria-describedby="name-hint name-error"
		/>
		<div id="name-hint" class="field-hint">
			{name.length} / 60 characters
		</div>
		{#if name.length > 0 && !nameValid}
			<div id="name-error" class="field-error" role="alert">
				Name must be between 1 and 60 characters
			</div>
		{/if}
	</div>

	<!-- Description field -->
	<div class="form-field">
		<label for="theme-description" class="field-label">
			Description <span class="optional">(optional)</span>
		</label>
		<textarea
			id="theme-description"
			class="textarea-input"
			class:invalid={!descriptionValid}
			value={description}
			oninput={(e) => onDescriptionChange(e.currentTarget.value)}
			maxlength="300"
			rows="3"
			placeholder="Describe your theme's style and inspiration..."
			aria-invalid={!descriptionValid}
			aria-describedby="description-hint description-error"
		></textarea>
		<div id="description-hint" class="field-hint">
			{description.length} / 300 characters
		</div>
		{#if !descriptionValid}
			<div id="description-error" class="field-error" role="alert">
				Description must be 300 characters or less
			</div>
		{/if}
	</div>

	<!-- Tags field -->
	<div class="form-field">
		<label for="theme-tags" class="field-label">
			Tags <span class="optional">(optional, max 5)</span>
		</label>
		<input
			id="theme-tags"
			type="text"
			class="text-input"
			class:invalid={!tagsValid}
			value={tagsInput}
			oninput={(e) => onTagsInputChange(e.currentTarget.value)}
			placeholder="minimal, dark, professional"
			aria-invalid={!tagsValid}
			aria-describedby="tags-hint tags-error"
		/>
		<div id="tags-hint" class="field-hint">
			Separate tags with commas. Current: {tags.length} / 5
		</div>
		{#if !tagsValid}
			<div id="tags-error" class="field-error" role="alert">Maximum 5 tags allowed</div>
		{/if}
		{#if tags.length > 0}
			<div class="tags-preview">
				{#each tags as tag}
					<span class="tag-chip">{tag}</span>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Base Theme selection -->
	<div class="form-field">
		<label for="base-theme" class="field-label">
			Base Theme <span class="required">*</span>
		</label>
		<select
			id="base-theme"
			class="select-input"
			value={selectedBaseTheme}
			onchange={(e) => onBaseThemeChange(e.currentTarget.value)}
			required
			aria-required="true"
			aria-describedby="base-theme-hint"
		>
			<option value="">Select a base theme...</option>
			{#each baseThemesList as theme}
				<option value={theme.id}>{theme.name}</option>
			{/each}
		</select>
		<div id="base-theme-hint" class="field-hint">Choose a theme to customize</div>
	</div>
</section>

<style>
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

	.form-field {
		display: flex;
		flex-direction: column;
		gap: 0.5rem;
	}

	.field-label {
		font-size: 0.875rem;
		font-weight: 600;
		color: var(--color-foreground, #111);
	}

	.required {
		color: #dc2626;
	}

	.optional {
		font-weight: 400;
		color: var(--color-foreground-muted, #666);
	}

	.text-input,
	.textarea-input,
	.select-input {
		padding: 0.75rem;
		border: 2px solid var(--color-border, #e5e5e5);
		border-radius: 0.5rem;
		font-size: 1rem;
		font-family: inherit;
		background: var(--color-surface, #fff);
		color: var(--color-foreground, #111);
		transition: border-color 0.2s ease;
	}

	.text-input:focus,
	.textarea-input:focus,
	.select-input:focus {
		outline: none;
		border-color: var(--grove-accent);
		box-shadow: 0 0 0 3px var(--grove-accent-20);
	}

	.text-input.invalid,
	.textarea-input.invalid {
		border-color: #dc2626;
	}

	.textarea-input {
		resize: vertical;
		min-height: 5rem;
	}

	.field-hint {
		font-size: 0.75rem;
		color: var(--color-foreground-muted, #666);
	}

	.field-error {
		font-size: 0.75rem;
		color: #dc2626;
		font-weight: 500;
	}

	.tags-preview {
		display: flex;
		flex-wrap: wrap;
		gap: 0.5rem;
		margin-top: 0.25rem;
	}

	.tag-chip {
		padding: 0.25rem 0.75rem;
		background: var(--grove-accent);
		color: #fff;
		border-radius: 1rem;
		font-size: 0.75rem;
		font-weight: 500;
	}

	@media (prefers-reduced-motion: reduce) {
		.text-input,
		.textarea-input,
		.select-input {
			transition: none;
		}
	}
</style>
