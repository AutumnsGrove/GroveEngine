<!--
  Re-export shim — MarkdownEditor has moved to content/editor/
  @deprecated Import from "$lib/content/editor/MarkdownEditor.svelte" instead
-->
<script lang="ts">
	import MarkdownEditor from "../../content/editor/MarkdownEditor.svelte";
	// Forward all props using Svelte 5 rest props
	let { ...props }: Record<string, any> = $props();
</script>

<MarkdownEditor {...props} />
