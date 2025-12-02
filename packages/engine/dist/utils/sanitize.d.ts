/**
 * Sanitize HTML content to prevent XSS attacks
 * @param {string} html - Raw HTML string to sanitize
 * @returns {string} - Sanitized HTML safe for rendering
 */
export function sanitizeHTML(html: string): string;
/**
 * Sanitize SVG content specifically (stricter rules for SVG)
 * @param {string} svg - Raw SVG string to sanitize
 * @returns {string} - Sanitized SVG safe for rendering
 */
export function sanitizeSVG(svg: string): string;
/**
 * Sanitize markdown-generated HTML with appropriate security rules
 * This is a convenience wrapper for sanitizeHTML with markdown-specific settings
 * @param {string} markdownHTML - HTML generated from markdown parsing
 * @returns {string} - Sanitized HTML safe for rendering
 */
export function sanitizeMarkdown(markdownHTML: string): string;
/**
 * Sanitize URL to prevent dangerous protocols
 * @param {string} url - URL to sanitize
 * @returns {string} - Sanitized URL (returns empty string if dangerous)
 */
export function sanitizeURL(url: string): string;
