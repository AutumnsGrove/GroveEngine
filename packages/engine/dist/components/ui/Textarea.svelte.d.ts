import type { HTMLTextareaAttributes } from "svelte/elements";
/**
 * Textarea component wrapper with label, error handling, and validation
 *
 * @prop {string} [label] - Textarea label text (renders above textarea)
 * @prop {string} [error] - Error message to display (turns border red)
 * @prop {string} [value] - Textarea value (bindable for two-way binding)
 * @prop {string} [placeholder] - Placeholder text
 * @prop {number} [rows] - Number of visible text rows
 * @prop {boolean} [required=false] - Whether textarea is required (shows asterisk)
 * @prop {boolean} [disabled=false] - Whether textarea is disabled
 * @prop {string} [class] - Additional CSS classes to apply
 *
 * @example
 * <Textarea label="Description" bind:value={description} required />
 *
 * @example
 * <Textarea label="Notes" bind:value={notes} rows={5} error={notesError} />
 *
 * @example
 * <Textarea placeholder="Enter your message..." bind:value={message} />
 */
interface Props extends Omit<HTMLTextareaAttributes, "class"> {
    label?: string;
    error?: string;
    value?: string;
    placeholder?: string;
    rows?: number;
    required?: boolean;
    disabled?: boolean;
    class?: string;
}
declare const Textarea: import("svelte").Component<Props, {}, "value">;
type Textarea = ReturnType<typeof Textarea>;
export default Textarea;
