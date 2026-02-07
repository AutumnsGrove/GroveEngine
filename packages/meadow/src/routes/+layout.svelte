<script lang="ts">
	import '../app.css';
	import { themeStore } from '@autumnsgrove/groveengine/ui/stores';
	import { GroveMessages } from '@autumnsgrove/groveengine/ui';

	let { children, data } = $props();

	// With Svelte 5 runes, stores are reactive $state values that initialize automatically.
	// Access themeStore.resolvedTheme directly - no need for $effect initialization.
</script>

<div class="min-h-screen leaf-pattern">
	{#if data?.messages?.length}
		<GroveMessages messages={data.messages} centered={true} />
	{/if}
	{@render children()}
</div>
