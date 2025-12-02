import type { Snippet } from "svelte";
interface Tab {
    value: string;
    label: string;
    disabled?: boolean;
}
/**
 * Tabs component wrapper for organizing content into switchable panels
 *
 * @prop {string} [value] - Active tab value (bindable for two-way binding, defaults to first tab)
 * @prop {Tab[]} tabs - Array of tabs with value, label, and optional disabled flag
 * @prop {Snippet<[Tab]>} [content] - Snippet to render content for each tab (receives tab data)
 * @prop {Snippet} [children] - Alternative content rendering (same for all tabs)
 * @prop {string} [class] - Additional CSS classes for Tabs root
 *
 * @example
 * <Tabs bind:value={activeTab} tabs={[
 *   { value: "overview", label: "Overview" },
 *   { value: "settings", label: "Settings" }
 * ]} content={(tab) => <p>Content for {tab.label}</p>} />
 *
 * @example
 * <Tabs tabs={profileTabs}>
 *   {#snippet content(tab)}
 *     <ProfileSection section={tab.value} />
 *   {/snippet}
 * </Tabs>
 *
 * @example
 * <Tabs bind:value={view} tabs={dashboardTabs} class="w-full" />
 */
interface Props {
    value?: string | undefined;
    tabs: Tab[];
    content?: Snippet<[tab: Tab]>;
    class?: string;
    children?: Snippet;
}
declare const Tabs: import("svelte").Component<Props, {}, "value">;
type Tabs = ReturnType<typeof Tabs>;
export default Tabs;
