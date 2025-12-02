export default ZoomableImage;
type ZoomableImage = {
    $on?(type: string, callback: (e: any) => void): () => void;
    $set?(props: Partial<$$ComponentProps>): void;
};
declare const ZoomableImage: import("svelte").Component<{
    src?: string;
    alt?: string;
    isActive?: boolean;
    class?: string;
}, {}, "">;
type $$ComponentProps = {
    src?: string;
    alt?: string;
    isActive?: boolean;
    class?: string;
};
