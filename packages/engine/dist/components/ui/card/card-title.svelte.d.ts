import type { WithElementRef } from "bits-ui";
import type { HTMLAttributes } from "svelte/elements";
type $$ComponentProps = WithElementRef<HTMLAttributes<HTMLDivElement>> & {
    level?: 1 | 2 | 3 | 4 | 5 | 6;
};
declare const CardTitle: import("svelte").Component<$$ComponentProps, {}, "ref">;
type CardTitle = ReturnType<typeof CardTitle>;
export default CardTitle;
