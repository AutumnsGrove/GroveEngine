<!--
  Re-export shim — GutterManager has moved to content/editor/
  @deprecated Import from "$lib/content/editor/GutterManager.svelte" instead
-->
<script lang="ts">
	import GutterManager from "../../content/editor/GutterManager.svelte";
	let { ...props }: Record<string, any> = $props();
</script>

<GutterManager {...props} />
