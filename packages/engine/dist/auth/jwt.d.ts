/**
 * Sign a JWT payload
 * @param {Object} payload - The payload to sign
 * @param {string} secret - The secret key
 * @returns {Promise<string>} - The signed JWT token
 */
export function signJwt(payload: Object, secret: string): Promise<string>;
/**
 * Verify and decode a JWT token
 * @param {string} token - The JWT token to verify
 * @param {string} secret - The secret key
 * @returns {Promise<Object|null>} - The decoded payload or null if invalid
 */
export function verifyJwt(token: string, secret: string): Promise<Object | null>;
