export default Lightbox;
type Lightbox = {
    $on?(type: string, callback: (e: any) => void): () => void;
    $set?(props: Partial<$$ComponentProps>): void;
};
declare const Lightbox: import("svelte").Component<{
    src?: string;
    alt?: string;
    caption?: string;
    isOpen?: boolean;
    onClose?: Function;
}, {}, "">;
type $$ComponentProps = {
    src?: string;
    alt?: string;
    caption?: string;
    isOpen?: boolean;
    onClose?: Function;
};
