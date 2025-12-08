/**
 * Client-side API utility with automatic CSRF token injection
 * Provides fetch wrapper with security headers and error handling
 */
/**
 * Get CSRF token from cookie or meta tag
 * @returns {string|null} CSRF token or null if not found
 */
export function getCSRFToken(): string | null;
/**
 * Fetch wrapper with automatic CSRF token injection
 * @param {string} url - API endpoint URL
 * @param {RequestInit} options - Fetch options
 * @returns {Promise<any>} Response JSON
 * @throws {Error} If request fails
 */
export function apiRequest(url: string, options?: RequestInit): Promise<any>;
export namespace api {
    export function get(url: string, options?: RequestInit): Promise<any>;
    export function post(url: string, body: any, options?: RequestInit): Promise<any>;
    export function put(url: string, body: any, options?: RequestInit): Promise<any>;
    export function _delete(url: string, options?: RequestInit): Promise<any>;
    export { _delete as delete };
    export function patch(url: string, body: any, options?: RequestInit): Promise<any>;
}
