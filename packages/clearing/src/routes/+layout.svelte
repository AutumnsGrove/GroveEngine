<script lang="ts">
	import '../app.css';
	import { themeStore, seasonStore } from '@autumnsgrove/groveengine/ui/stores';
	const { resolvedTheme } = themeStore;

	let { children } = $props();

	// Ensure stores initialize on client
	$effect(() => {
		const _ = $resolvedTheme;
		const __ = $seasonStore;
	});
</script>

<div class="min-h-screen bg-page">
	{@render children()}
</div>
