import type { Snippet } from "svelte";
/**
 * Card component wrapper providing structured layout with header, content, and footer
 *
 * @prop {string} [title] - Card title (renders in CardHeader with CardTitle)
 * @prop {string} [description] - Card description (renders in CardHeader with CardDescription)
 * @prop {boolean} [hoverable=false] - Enable hover shadow effect for interactive cards
 * @prop {Snippet} [header] - Custom header content (overrides title/description)
 * @prop {Snippet} [footer] - Footer content (rendered in CardFooter)
 * @prop {Snippet} [children] - Main card content (rendered in CardContent)
 * @prop {string} [class] - Additional CSS classes for Card root
 *
 * @example
 * <Card title="Profile" description="Update your profile settings">
 *   <p>Card content here</p>
 * </Card>
 *
 * @example
 * <Card hoverable>
 *   {#snippet header()}
 *     <CustomHeader />
 *   {/snippet}
 *   Content here
 * </Card>
 *
 * @example
 * <Card title="Actions">
 *   {#snippet footer()}
 *     <Button>Save</Button>
 *   {/snippet}
 *   Form content
 * </Card>
 */
interface Props {
    title?: string;
    description?: string;
    hoverable?: boolean;
    class?: string;
    header?: Snippet;
    footer?: Snippet;
    children?: Snippet;
    [key: string]: any;
}
declare const Card: import("svelte").Component<Props, {}, "">;
type Card = ReturnType<typeof Card>;
export default Card;
