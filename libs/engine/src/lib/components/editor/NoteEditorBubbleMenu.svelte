<!--
  Re-export shim — NoteEditorBubbleMenu has moved to content/editor/
  @deprecated Import from "$lib/content/editor/NoteEditorBubbleMenu.svelte" instead
-->
<script lang="ts">
	import NoteEditorBubbleMenu from "../../content/editor/NoteEditorBubbleMenu.svelte";
	let { ...props }: Record<string, any> = $props();
</script>

<NoteEditorBubbleMenu {...props} />
