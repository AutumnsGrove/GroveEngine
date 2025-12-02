import { Accordion as AccordionPrimitive } from "bits-ui";
import Content from "./accordion-content.svelte";
import Item from "./accordion-item.svelte";
import Trigger from "./accordion-trigger.svelte";
declare const Root: import("svelte").Component<AccordionPrimitive.RootProps, {}, "value" | "ref">;
export { Root, Content, Item, Trigger, Root as Accordion, Content as AccordionContent, Item as AccordionItem, Trigger as AccordionTrigger, };
