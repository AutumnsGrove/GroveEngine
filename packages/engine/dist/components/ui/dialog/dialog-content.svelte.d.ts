import { Dialog as DialogPrimitive, type WithoutChildrenOrChild } from "bits-ui";
import type { Snippet } from "svelte";
type $$ComponentProps = WithoutChildrenOrChild<DialogPrimitive.ContentProps> & {
    portalProps?: DialogPrimitive.PortalProps;
    children: Snippet;
};
declare const DialogContent: import("svelte").Component<$$ComponentProps, {}, "ref">;
type DialogContent = ReturnType<typeof DialogContent>;
export default DialogContent;
