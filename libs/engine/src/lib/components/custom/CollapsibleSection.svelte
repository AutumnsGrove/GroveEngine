<!--
  Re-export shim — moved to ui/components/custom/
  @deprecated Import from "$lib/ui/components/custom/CollapsibleSection.svelte" instead
-->
<script lang="ts">
	import CollapsibleSection from "../../ui/components/custom/CollapsibleSection.svelte";
	let { ...props } = $props<any>();
</script>

<CollapsibleSection {...props} />
