<script lang="ts">
	import '../app.css';
	// Import theme store to initialize it on page load
	import { themeStore } from '@autumnsgrove/groveengine/ui/stores';
	const { resolvedTheme } = themeStore;

	let { children } = $props();

	// Access the store to ensure it initializes
	$effect(() => {
		// Theme store auto-applies the dark class on initialization
		// This effect ensures the store is subscribed to
		const _ = $resolvedTheme;
	});
</script>

<div class="min-h-screen leaf-pattern">
	{@render children()}
</div>
