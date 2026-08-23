/**
 * Content Editor — Barrel Export
 *
 * All editor components: MarkdownEditor, NoteEditor, GutterManager,
 * and composables (draft manager, editor theme).
 *
 * @module content/editor
 */

// Markdown editor (admin)
export { default as MarkdownEditor } from "./MarkdownEditor.svelte";
export { default as GutterManager } from "./GutterManager.svelte";
export { default as CdnImagePicker } from "./CdnImagePicker.svelte";

// Note editor (Tiptap-based)
export { default as NoteEditor } from "./NoteEditor.svelte";
export { default as NoteEditorBubbleMenu } from "./NoteEditorBubbleMenu.svelte";

// Composables
export * from "./composables/index.js";
