<!--
  Re-export shim — moved to ui/components/custom/
  @deprecated Import from "$lib/ui/components/custom/TableOfContents.svelte" instead
-->
<script lang="ts">
	import TableOfContents from "../../ui/components/custom/TableOfContents.svelte";
	let { ...props }: Record<string, any> = $props();
</script>

<TableOfContents {...props} />
