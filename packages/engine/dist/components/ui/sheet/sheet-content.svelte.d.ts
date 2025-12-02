import { type VariantProps } from "tailwind-variants";
export declare const sheetVariants: import("tailwind-variants").TVReturnType<{
    side: {
        top: string;
        bottom: string;
        left: string;
        right: string;
    };
}, undefined, "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 gap-4 p-6 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500", import("tailwind-variants/dist/config.js").TVConfig<{
    side: {
        top: string;
        bottom: string;
        left: string;
        right: string;
    };
}, {
    side: {
        top: string;
        bottom: string;
        left: string;
        right: string;
    };
}>, {
    side: {
        top: string;
        bottom: string;
        left: string;
        right: string;
    };
}, undefined, import("tailwind-variants").TVReturnType<{
    side: {
        top: string;
        bottom: string;
        left: string;
        right: string;
    };
}, undefined, "bg-background data-[state=open]:animate-in data-[state=closed]:animate-out fixed z-50 gap-4 p-6 shadow-lg transition ease-in-out data-[state=closed]:duration-300 data-[state=open]:duration-500", import("tailwind-variants/dist/config.js").TVConfig<{
    side: {
        top: string;
        bottom: string;
        left: string;
        right: string;
    };
}, {
    side: {
        top: string;
        bottom: string;
        left: string;
        right: string;
    };
}>, unknown, unknown, undefined>>;
export type Side = VariantProps<typeof sheetVariants>["side"];
import { Dialog as SheetPrimitive, type WithoutChildrenOrChild } from "bits-ui";
import type { Snippet } from "svelte";
type $$ComponentProps = WithoutChildrenOrChild<SheetPrimitive.ContentProps> & {
    portalProps?: SheetPrimitive.PortalProps;
    side?: Side;
    children: Snippet;
};
declare const SheetContent: import("svelte").Component<$$ComponentProps, {}, "ref">;
type SheetContent = ReturnType<typeof SheetContent>;
export default SheetContent;
