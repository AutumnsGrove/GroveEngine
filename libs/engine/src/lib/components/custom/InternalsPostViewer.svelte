<!--
  Re-export shim — moved to ui/components/custom/
  @deprecated Import from "$lib/ui/components/custom/InternalsPostViewer.svelte" instead
-->
<script lang="ts">
	import InternalsPostViewer from "../../ui/components/custom/InternalsPostViewer.svelte";
	let { ...props } = $props<any>();
</script>

<InternalsPostViewer {...props} />
