<!--
  Re-export shim — MarkdownEditor has moved to content/editor/
  @deprecated Import from "$lib/content/editor/MarkdownEditor.svelte" instead
-->
<script lang="ts">
	import MarkdownEditor from "../../content/editor/MarkdownEditor.svelte";
	let { content = $bindable(""), previewTitle = $bindable(""), ...rest } = $props<any>();
</script>

<MarkdownEditor bind:content bind:previewTitle {...rest} />
