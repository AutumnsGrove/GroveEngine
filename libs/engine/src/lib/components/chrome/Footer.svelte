<!--
  Re-export shim — Footer has merged into ui/components/chrome/
  @deprecated Import from "$lib/ui/components/chrome/Footer.svelte" instead
-->
<script lang="ts">
	import Footer from "../../ui/components/chrome/Footer.svelte";
	let { ...props }: Record<string, any> = $props();
</script>

<Footer {...props} />
