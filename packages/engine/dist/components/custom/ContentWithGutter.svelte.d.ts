export default ContentWithGutter;
type ContentWithGutter = {
    $on?(type: string, callback: (e: any) => void): () => void;
    $set?(props: Partial<$$ComponentProps>): void;
};
declare const ContentWithGutter: import("svelte").Component<{
    content?: string;
    gutterContent?: any[];
    headers?: any[];
    showTableOfContents?: boolean;
    children: any;
}, {}, "">;
type $$ComponentProps = {
    content?: string;
    gutterContent?: any[];
    headers?: any[];
    showTableOfContents?: boolean;
    children: any;
};
