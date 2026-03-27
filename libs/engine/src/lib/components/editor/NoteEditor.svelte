<!--
  Re-export shim — NoteEditor has moved to content/editor/
  @deprecated Import from "$lib/content/editor/NoteEditor.svelte" instead
-->
<script lang="ts">
	import NoteEditor from "../../content/editor/NoteEditor.svelte";
	let { ...props }: Record<string, any> = $props();
</script>

<NoteEditor {...props} />
