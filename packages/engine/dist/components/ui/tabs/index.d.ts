import { Tabs as TabsPrimitive } from "bits-ui";
import Content from "./tabs-content.svelte";
import List from "./tabs-list.svelte";
import Trigger from "./tabs-trigger.svelte";
declare const Root: import("svelte").Component<TabsPrimitive.RootProps, {}, "value" | "ref">;
export { Root, Content, List, Trigger, Root as Tabs, Content as TabsContent, List as TabsList, Trigger as TabsTrigger, };
