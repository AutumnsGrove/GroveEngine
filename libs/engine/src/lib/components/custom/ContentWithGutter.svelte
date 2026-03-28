<!--
  Re-export shim — moved to ui/components/custom/
  @deprecated Import from "$lib/ui/components/custom/ContentWithGutter.svelte" instead
-->
<script lang="ts">
	import ContentWithGutter from "../../ui/components/custom/ContentWithGutter.svelte";
	let { ...props } = $props<any>();
</script>

<ContentWithGutter {...props} />
