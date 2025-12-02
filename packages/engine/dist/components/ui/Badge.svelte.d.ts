import type { Snippet } from "svelte";
type BadgeVariant = "default" | "secondary" | "destructive" | "tag";
/**
 * Badge component wrapper for displaying small labels, tags, or status indicators
 *
 * @prop {BadgeVariant} [variant="default"] - Badge style variant (default|secondary|destructive|tag)
 * @prop {string} [class] - Additional CSS classes to apply
 * @prop {Snippet} [children] - Badge content (typically short text)
 *
 * @example
 * <Badge variant="default">New</Badge>
 *
 * @example
 * <Badge variant="destructive">Error</Badge>
 *
 * @example
 * <Badge variant="tag">TypeScript</Badge>
 */
interface Props {
    variant?: BadgeVariant;
    class?: string;
    children?: Snippet;
}
declare const Badge: import("svelte").Component<Props, {}, "">;
type Badge = ReturnType<typeof Badge>;
export default Badge;
