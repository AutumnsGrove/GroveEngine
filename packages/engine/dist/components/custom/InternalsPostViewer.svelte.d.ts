export default InternalsPostViewer;
type InternalsPostViewer = {
    $on?(type: string, callback: (e: any) => void): () => void;
    $set?(props: Partial<$$ComponentProps>): void;
};
declare const InternalsPostViewer: import("svelte").Component<{
    post: any;
    caption?: string;
}, {}, "">;
type $$ComponentProps = {
    post: any;
    caption?: string;
};
