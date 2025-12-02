interface Props {
    position?: "top-left" | "top-center" | "top-right" | "bottom-left" | "bottom-center" | "bottom-right";
    theme?: "light" | "dark" | "system";
}
declare const Toast: import("svelte").Component<Props, {}, "">;
type Toast = ReturnType<typeof Toast>;
export default Toast;
