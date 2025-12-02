/**
 * Toast notification utility for displaying temporary messages
 * Wraps sonner toast with consistent defaults and API
 *
 * @example
 * import { toast } from "./";
 * toast.success("Profile updated!");
 *
 * @example
 * toast.error("Failed to save changes", { description: "Please try again" });
 *
 * @example
 * const toastId = toast.loading("Saving...");
 * // later...
 * toast.dismiss(toastId);
 */
export declare const toast: {
    /**
     * Show a success toast notification
     *
     * @param message - Success message to display
     * @param options - Optional duration (default: 3000ms) and description
     */
    success: (message: string, options?: {
        duration?: number;
        description?: string;
    }) => void;
    /**
     * Show an error toast notification
     *
     * @param message - Error message to display
     * @param options - Optional duration (default: 4000ms) and description
     */
    error: (message: string, options?: {
        duration?: number;
        description?: string;
    }) => void;
    /**
     * Show an info toast notification
     *
     * @param message - Info message to display
     * @param options - Optional duration (default: 3000ms) and description
     */
    info: (message: string, options?: {
        duration?: number;
        description?: string;
    }) => void;
    /**
     * Show a warning toast notification
     *
     * @param message - Warning message to display
     * @param options - Optional duration (default: 3500ms) and description
     */
    warning: (message: string, options?: {
        duration?: number;
        description?: string;
    }) => void;
    /**
     * Show a loading toast notification (persists until dismissed)
     *
     * @param message - Loading message to display
     * @returns Toast ID for later dismissal
     */
    loading: (message: string) => string | number;
    /**
     * Show a promise-based toast that updates based on promise state
     *
     * @param promise - Promise to track
     * @param messages - Loading, success, and error messages
     */
    promise: <T>(promise: Promise<T>, messages: {
        loading: string;
        success: string;
        error: string;
    }) => void;
    /**
     * Dismiss a specific toast by ID
     *
     * @param toastId - Optional toast ID (from loading() return value)
     */
    dismiss: (toastId?: string | number) => void;
    /**
     * Dismiss all toasts
     */
    dismissAll: () => void;
};
