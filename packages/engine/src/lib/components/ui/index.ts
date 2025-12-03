// Admin-specific UI component wrappers
// Generic UI components (Button, Card, Badge, Input, Textarea, Skeleton) are now in @groveengine/ui
export { default as Dialog } from "./Dialog.svelte";
export { default as Select } from "./Select.svelte";
export { default as Tabs } from "./Tabs.svelte";
export { default as Accordion } from "./Accordion.svelte";
export { default as Sheet } from "./Sheet.svelte";
export { default as Toast } from "./Toast.svelte";
export { default as Table } from "./Table.svelte";

// Toast utilities
export { toast } from "./toast";

// Re-export shadcn components for advanced usage
export {
	Root as DialogRoot,
	Trigger as DialogTrigger,
	Close as DialogClose,
	Portal as DialogPortal
} from "./dialog";

export {
	Root as SheetRoot,
	Trigger as SheetTrigger,
	Close as SheetClose,
	Portal as SheetPortal,
	Content as SheetContent,
	Header as SheetHeader,
	Footer as SheetFooter,
	Title as SheetTitle,
	Description as SheetDescription
} from "./sheet";

export {
	Root as TableRoot,
	Body as TableBody,
	Caption as TableCaption,
	Cell as TableCell,
	Footer as TableFooter,
	Head as TableHead,
	Header as TableHeader,
	Row as TableRow
} from "./table";

export { Root as AccordionRoot } from "./accordion";

export {
	Root as SelectRoot,
	Trigger as SelectTrigger,
	Content as SelectContent,
	Item as SelectItem,
	Group as SelectGroup,
	GroupHeading as SelectLabel,
	Separator as SelectSeparator,
	ScrollUpButton as SelectScrollUpButton,
	ScrollDownButton as SelectScrollDownButton
} from "./select";

export {
	Root as TabsRoot,
	List as TabsList,
	Trigger as TabsTrigger,
	Content as TabsContent
} from "./tabs";
