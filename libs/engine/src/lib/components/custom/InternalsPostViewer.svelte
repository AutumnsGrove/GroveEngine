<!--
  Re-export shim — moved to ui/components/custom/
  @deprecated Import from "$lib/ui/components/custom/InternalsPostViewer.svelte" instead
-->
<script lang="ts">
	import InternalsPostViewer from "../../ui/components/custom/InternalsPostViewer.svelte";
	let { ...props }: Record<string, any> = $props();
</script>

<InternalsPostViewer {...props} />
