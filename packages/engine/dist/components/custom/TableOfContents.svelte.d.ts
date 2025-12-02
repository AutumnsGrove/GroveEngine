export default TableOfContents;
type TableOfContents = {
    $on?(type: string, callback: (e: any) => void): () => void;
    $set?(props: Partial<$$ComponentProps>): void;
};
declare const TableOfContents: import("svelte").Component<{
    headers?: any[];
}, {}, "">;
type $$ComponentProps = {
    headers?: any[];
};
