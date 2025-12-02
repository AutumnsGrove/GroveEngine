import type { Snippet } from "svelte";
import type { HTMLButtonAttributes } from "svelte/elements";
type ButtonVariant = "primary" | "secondary" | "danger" | "ghost" | "link";
type ButtonSize = "sm" | "md" | "lg";
/**
 * Button component wrapper around shadcn-svelte Button
 *
 * @prop {ButtonVariant} [variant="primary"] - Button style variant (primary|secondary|danger|ghost|link)
 * @prop {ButtonSize} [size="md"] - Button size (sm|md|lg)
 * @prop {boolean} [disabled=false] - Whether button is disabled
 * @prop {Function} [onclick] - Click handler function
 * @prop {string} [href] - Optional link href (renders as anchor element)
 * @prop {string} [class] - Additional CSS classes to apply
 * @prop {Snippet} [children] - Button content (text/icons/etc)
 *
 * @example
 * <Button variant="primary" size="lg">Save Changes</Button>
 *
 * @example
 * <Button variant="danger" onclick={() => handleDelete()}>Delete</Button>
 *
 * @example
 * <Button variant="ghost" href="/settings">Settings</Button>
 */
interface Props extends Omit<HTMLButtonAttributes, "class"> {
    variant?: ButtonVariant;
    size?: ButtonSize;
    disabled?: boolean;
    class?: string;
    children?: Snippet;
}
declare const Button: import("svelte").Component<Props, {}, "">;
type Button = ReturnType<typeof Button>;
export default Button;
