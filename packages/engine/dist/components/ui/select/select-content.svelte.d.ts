import { Select as SelectPrimitive, type WithoutChild } from "bits-ui";
type $$ComponentProps = WithoutChild<SelectPrimitive.ContentProps> & {
    portalProps?: SelectPrimitive.PortalProps;
};
declare const SelectContent: import("svelte").Component<$$ComponentProps, {}, "ref">;
type SelectContent = ReturnType<typeof SelectContent>;
export default SelectContent;
