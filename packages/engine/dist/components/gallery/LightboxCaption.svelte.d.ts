export default LightboxCaption;
type LightboxCaption = {
    $on?(type: string, callback: (e: any) => void): () => void;
    $set?(props: Partial<$$ComponentProps>): void;
};
declare const LightboxCaption: import("svelte").Component<{
    caption?: string;
}, {}, "">;
type $$ComponentProps = {
    caption?: string;
};
