import type { HTMLTextareaAttributes } from "svelte/elements";
import type { WithElementRef } from "bits-ui";
type Props = WithElementRef<HTMLTextareaAttributes>;
declare const Textarea: import("svelte").Component<Props, {}, "value" | "ref">;
type Textarea = ReturnType<typeof Textarea>;
export default Textarea;
