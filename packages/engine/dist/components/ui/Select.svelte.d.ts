interface Option {
    value: string;
    label: string;
    disabled?: boolean;
}
/**
 * Select component wrapper providing dropdown selection with options
 *
 * @prop {string} [value] - Selected value (bindable for two-way binding)
 * @prop {Option[]} options - Array of options with value, label, and optional disabled flag
 * @prop {string} [placeholder="Select an option"] - Placeholder text when no value selected
 * @prop {boolean} [disabled=false] - Whether select is disabled
 * @prop {string} [class] - Additional CSS classes for trigger element
 *
 * @example
 * <Select bind:value={selectedValue} options={[
 *   { value: "opt1", label: "Option 1" },
 *   { value: "opt2", label: "Option 2", disabled: true }
 * ]} />
 *
 * @example
 * <Select bind:value={theme} placeholder="Choose theme" options={themeOptions} />
 *
 * @example
 * <Select bind:value={country} options={countries} disabled={loading} />
 */
interface Props {
    value?: string | undefined;
    options: Option[];
    placeholder?: string;
    disabled?: boolean;
    class?: string;
}
declare const Select: import("svelte").Component<Props, {}, "value">;
type Select = ReturnType<typeof Select>;
export default Select;
