/**
 * Create a session token for a user
 * @param {Object} user - User data
 * @param {string} user.email - User email address
 * @param {string} secret - Session secret
 * @returns {Promise<string>} - Signed JWT token
 */
export function createSession(user: {
    email: string;
}, secret: string): Promise<string>;
/**
 * Verify a session token and return user data
 * @param {string} token - Session token
 * @param {string} secret - Session secret
 * @returns {Promise<Object|null>} - User data or null if invalid
 */
export function verifySession(token: string, secret: string): Promise<Object | null>;
/**
 * Create Set-Cookie header value for session
 * @param {string} token - Session token
 * @param {boolean} isProduction - Whether in production (for secure flag)
 * @returns {string} - Cookie header value
 */
export function createSessionCookie(token: string, isProduction?: boolean): string;
/**
 * Create Set-Cookie header value to clear session
 * @returns {string} - Cookie header value
 */
export function clearSessionCookie(): string;
/**
 * Parse session token from cookie header
 * @param {string} cookieHeader - Cookie header value
 * @returns {string|null} - Session token or null
 */
export function parseSessionCookie(cookieHeader: string): string | null;
/**
 * Check if an email is in the allowed admin list
 * @param {string} email - Email address to check
 * @param {string} allowedList - Comma-separated list of allowed emails
 * @returns {boolean} - Whether the user is allowed
 */
export function isAllowedAdmin(email: string, allowedList: string): boolean;
