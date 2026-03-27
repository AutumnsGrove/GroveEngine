<!--
  Re-export shim — Header has merged into ui/components/chrome/
  @deprecated Import from "$lib/ui/components/chrome/Header.svelte" instead
-->
<script lang="ts">
	import Header from "../../ui/components/chrome/Header.svelte";
	let { ...props }: Record<string, any> = $props();
</script>

<Header {...props} />
