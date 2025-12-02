export default GutterItem;
type GutterItem = {
    $on?(type: string, callback: (e: any) => void): () => void;
    $set?(props: Partial<$$ComponentProps>): void;
};
declare const GutterItem: import("svelte").Component<{
    item?: Record<string, any>;
}, {}, "">;
type $$ComponentProps = {
    item?: Record<string, any>;
};
