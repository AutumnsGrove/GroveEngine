export default MobileTOC;
type MobileTOC = {
    $on?(type: string, callback: (e: any) => void): () => void;
    $set?(props: Partial<$$ComponentProps>): void;
};
declare const MobileTOC: import("svelte").Component<{
    headers?: any[];
}, {}, "">;
type $$ComponentProps = {
    headers?: any[];
};
