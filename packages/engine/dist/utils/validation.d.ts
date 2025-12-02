/**
 * Validates file signature (magic bytes) to prevent MIME type spoofing
 * @param {File} file - The file to validate
 * @param {string} expectedType - Expected MIME type
 * @returns {Promise<boolean>} True if file signature matches expected type
 */
export function validateFileSignature(file: File, expectedType: string): Promise<boolean>;
/**
 * Sanitizes objects to prevent prototype pollution attacks
 * Recursively removes dangerous keys from objects
 * @param {*} obj - Object to sanitize
 * @returns {*} Sanitized object
 */
export function sanitizeObject(obj: any): any;
/**
 * Sanitizes filename to prevent injection attacks
 * Removes dangerous characters and keywords
 * @param {string} filename - Filename to sanitize
 * @returns {string} Sanitized filename
 */
export function sanitizeFilename(filename: string): string;
/**
 * Enhanced path traversal prevention
 * Validates that paths don't contain directory traversal attempts
 * @param {string} path - Path to validate
 * @returns {boolean} True if path is safe
 */
export function validatePath(path: string): boolean;
/**
 * Email validation (strengthened)
 * @param {string} email - Email address to validate
 * @returns {boolean} True if email is valid
 */
export function validateEmail(email: string): boolean;
/**
 * URL validation - only allows http/https protocols
 * @param {string} url - URL to validate
 * @returns {boolean} True if URL is valid
 */
export function validateURL(url: string): boolean;
/**
 * Slug validation - ensures URL-safe slugs
 * @param {string} slug - Slug to validate
 * @returns {boolean} True if slug is valid
 */
export function validateSlug(slug: string): boolean;
