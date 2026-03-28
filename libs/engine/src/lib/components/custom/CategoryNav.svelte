<!--
  Re-export shim — moved to ui/components/custom/
  @deprecated Import from "$lib/ui/components/custom/CategoryNav.svelte" instead
-->
<script lang="ts">
	import CategoryNav from "../../ui/components/custom/CategoryNav.svelte";
	let { ...props }: Record<string, any> = $props();
</script>

<CategoryNav {...props} />
