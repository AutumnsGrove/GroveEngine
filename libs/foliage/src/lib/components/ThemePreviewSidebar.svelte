<script lang="ts">
	import type { Theme } from "../types.js";
	import ThemePreview from "./ThemePreview.svelte";

	interface Props {
		effectiveTheme: Theme;
	}

	let { effectiveTheme }: Props = $props();
</script>

<aside class="preview-panel" aria-label="Theme preview">
	<div class="preview-header">
		<h3 class="preview-title">Live Preview</h3>
	</div>
	<div class="preview-content">
		<ThemePreview theme={effectiveTheme} />
	</div>
</aside>

<style>
	.preview-panel {
		position: sticky;
		top: 1rem;
		height: fit-content;
		background: var(--color-surface, #fff);
		border: 2px solid var(--color-border, #e5e5e5);
		border-radius: 0.75rem;
		padding: 1.5rem;
	}

	.preview-header {
		margin-bottom: 1rem;
		padding-bottom: 1rem;
		border-bottom: 1px solid var(--color-border, #e5e5e5);
	}

	.preview-title {
		margin: 0;
		font-size: 1.125rem;
		font-weight: 600;
		color: var(--color-foreground, #111);
	}

	.preview-content {
		display: flex;
		justify-content: center;
	}

	@media (max-width: 1023px) {
		.preview-panel {
			position: static;
			margin-top: 2rem;
		}
	}

	@media (max-width: 640px) {
		.preview-panel {
			padding: 1rem;
		}
	}
</style>
