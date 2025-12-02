import { type VariantProps } from "tailwind-variants";
export declare const badgeVariants: import("tailwind-variants").TVReturnType<{
    variant: {
        default: string;
        secondary: string;
        destructive: string;
        outline: string;
    };
}, undefined, "focus:ring-ring inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2", import("tailwind-variants/dist/config.js").TVConfig<{
    variant: {
        default: string;
        secondary: string;
        destructive: string;
        outline: string;
    };
}, {
    variant: {
        default: string;
        secondary: string;
        destructive: string;
        outline: string;
    };
}>, {
    variant: {
        default: string;
        secondary: string;
        destructive: string;
        outline: string;
    };
}, undefined, import("tailwind-variants").TVReturnType<{
    variant: {
        default: string;
        secondary: string;
        destructive: string;
        outline: string;
    };
}, undefined, "focus:ring-ring inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2", import("tailwind-variants/dist/config.js").TVConfig<{
    variant: {
        default: string;
        secondary: string;
        destructive: string;
        outline: string;
    };
}, {
    variant: {
        default: string;
        secondary: string;
        destructive: string;
        outline: string;
    };
}>, unknown, unknown, undefined>>;
export type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];
import type { WithElementRef } from "bits-ui";
import type { HTMLAnchorAttributes } from "svelte/elements";
type $$ComponentProps = WithElementRef<HTMLAnchorAttributes> & {
    variant?: BadgeVariant;
};
declare const Badge: import("svelte").Component<$$ComponentProps, {}, "ref">;
type Badge = ReturnType<typeof Badge>;
export default Badge;
