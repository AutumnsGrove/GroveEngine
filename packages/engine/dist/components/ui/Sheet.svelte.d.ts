import type { Snippet } from "svelte";
/**
 * Sheet component wrapper for slide-out panels (drawers) from screen edges
 *
 * @prop {boolean} [open=false] - Sheet open state (bindable for two-way binding)
 * @prop {string} [side="right"] - Which edge sheet slides from (left|right|top|bottom)
 * @prop {string} [title] - Sheet title (renders in SheetHeader)
 * @prop {string} [description] - Sheet description (renders in SheetHeader)
 * @prop {Snippet} [trigger] - Trigger element to open sheet (renders in SheetTrigger)
 * @prop {Snippet} [footer] - Footer content (rendered in SheetFooter)
 * @prop {Snippet} [children] - Main sheet content
 *
 * @example
 * <Sheet bind:open={isOpen} side="right" title="Settings">
 *   <SettingsForm />
 *   {#snippet footer()}
 *     <Button onclick={() => isOpen = false}>Close</Button>
 *   {/snippet}
 * </Sheet>
 *
 * @example
 * <Sheet side="left">
 *   {#snippet trigger()}
 *     <Button>Open Menu</Button>
 *   {/snippet}
 *   <Navigation />
 * </Sheet>
 *
 * @example
 * <Sheet bind:open={showCart} side="right" title="Shopping Cart" description="Review your items">
 *   <CartItems />
 * </Sheet>
 */
interface Props {
    open?: boolean;
    side?: "left" | "right" | "top" | "bottom";
    title?: string;
    description?: string;
    trigger?: Snippet;
    footer?: Snippet;
    children?: Snippet;
}
declare const Sheet: import("svelte").Component<Props, {}, "open">;
type Sheet = ReturnType<typeof Sheet>;
export default Sheet;
