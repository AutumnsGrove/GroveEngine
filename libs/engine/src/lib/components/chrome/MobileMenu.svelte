<!--
  Re-export shim — MobileMenu has merged into ui/components/chrome/
  @deprecated Import from "$lib/ui/components/chrome/MobileMenu.svelte" instead
-->
<script lang="ts">
	import MobileMenu from "../../ui/components/chrome/MobileMenu.svelte";
	let { ...props }: Record<string, any> = $props();
</script>

<MobileMenu {...props} />
