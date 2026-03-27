<!--
  Re-export shim — moved to ui/components/custom/
  @deprecated Import from "$lib/ui/components/custom/MobileTOC.svelte" instead
-->
<script lang="ts">
	import MobileTOC from "../../ui/components/custom/MobileTOC.svelte";
	let { ...props }: Record<string, any> = $props();
</script>

<MobileTOC {...props} />
