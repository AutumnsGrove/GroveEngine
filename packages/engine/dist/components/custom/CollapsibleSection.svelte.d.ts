export default CollapsibleSection;
type CollapsibleSection = {
    $on?(type: string, callback: (e: any) => void): () => void;
    $set?(props: Partial<$$ComponentProps>): void;
};
declare const CollapsibleSection: import("svelte").Component<{
    title?: string;
    expanded?: boolean;
    children: any;
}, {}, "expanded">;
type $$ComponentProps = {
    title?: string;
    expanded?: boolean;
    children: any;
};
