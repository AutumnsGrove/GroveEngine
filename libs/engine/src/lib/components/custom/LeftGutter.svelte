<!--
  Re-export shim — moved to ui/components/custom/
  @deprecated Import from "$lib/ui/components/custom/LeftGutter.svelte" instead
-->
<script lang="ts">
	import LeftGutter from "../../ui/components/custom/LeftGutter.svelte";
	let { ...props }: Record<string, any> = $props();
</script>

<LeftGutter {...props} />
