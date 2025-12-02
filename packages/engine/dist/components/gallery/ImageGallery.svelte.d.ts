export default ImageGallery;
type ImageGallery = {
    $on?(type: string, callback: (e: any) => void): () => void;
    $set?(props: Partial<$$ComponentProps>): void;
};
declare const ImageGallery: import("svelte").Component<{
    images?: any[];
}, {}, "">;
type $$ComponentProps = {
    images?: any[];
};
