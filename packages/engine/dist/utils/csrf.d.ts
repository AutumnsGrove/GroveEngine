/**
 * CSRF Protection Utilities
 * Validates requests come from same origin
 */
/**
 * Generate cryptographically secure CSRF token
 * @returns {string} UUID v4 token
 */
export function generateCSRFToken(): string;
/**
 * Validate CSRF token from request against session token
 * @param {Request} request - The incoming request
 * @param {string} sessionToken - The token stored in the session
 * @returns {boolean}
 */
export function validateCSRFToken(request: Request, sessionToken: string): boolean;
/**
 * Validate CSRF token from request headers (origin-based fallback)
 * @param {Request} request
 * @returns {boolean}
 */
export function validateCSRF(request: Request): boolean;
