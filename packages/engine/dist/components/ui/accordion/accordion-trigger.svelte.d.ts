import { Accordion as AccordionPrimitive, type WithoutChild } from "bits-ui";
type $$ComponentProps = WithoutChild<AccordionPrimitive.TriggerProps> & {
    level?: AccordionPrimitive.HeaderProps["level"];
};
declare const AccordionTrigger: import("svelte").Component<$$ComponentProps, {}, "ref">;
type AccordionTrigger = ReturnType<typeof AccordionTrigger>;
export default AccordionTrigger;
