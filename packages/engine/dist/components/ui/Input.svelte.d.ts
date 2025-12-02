import type { HTMLInputAttributes } from "svelte/elements";
/**
 * Input component wrapper with label, error handling, and validation
 *
 * @prop {string} [label] - Input label text (renders above input)
 * @prop {string} [error] - Error message to display (turns border red)
 * @prop {string|number} [value] - Input value (bindable for two-way binding)
 * @prop {string} [placeholder] - Placeholder text
 * @prop {string} [type="text"] - Input type (text|email|password|number)
 * @prop {boolean} [required=false] - Whether input is required (shows asterisk)
 * @prop {boolean} [disabled=false] - Whether input is disabled
 * @prop {string} [class] - Additional CSS classes to apply
 *
 * @example
 * <Input label="Email" type="email" bind:value={email} required />
 *
 * @example
 * <Input label="Password" type="password" bind:value={password} error={passwordError} />
 *
 * @example
 * <Input placeholder="Search..." bind:value={searchQuery} />
 */
interface Props extends Omit<HTMLInputAttributes, "class"> {
    label?: string;
    error?: string;
    value?: string | number;
    placeholder?: string;
    type?: "text" | "email" | "password" | "number";
    required?: boolean;
    disabled?: boolean;
    class?: string;
}
declare const Input: import("svelte").Component<Props, {}, "value">;
type Input = ReturnType<typeof Input>;
export default Input;
