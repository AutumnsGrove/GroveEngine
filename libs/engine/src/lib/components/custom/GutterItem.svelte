<!--
  Re-export shim — moved to ui/components/custom/
  @deprecated Import from "$lib/ui/components/custom/GutterItem.svelte" instead
-->
<script lang="ts">
	import GutterItem from "../../ui/components/custom/GutterItem.svelte";
	let { ...props }: Record<string, any> = $props();
</script>

<GutterItem {...props} />
