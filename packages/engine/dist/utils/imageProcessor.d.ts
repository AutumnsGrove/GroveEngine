/**
 * Client-side image processing utility
 * Handles WebP conversion, quality adjustment, EXIF stripping, and hash generation
 */
/**
 * Calculate SHA-256 hash of file for duplicate detection
 * @param {File|Blob} file - The file to hash
 * @returns {Promise<string>} Hex string of the hash
 */
export function calculateFileHash(file: File | Blob): Promise<string>;
/**
 * Process an image: convert to WebP, adjust quality, strip EXIF
 * Drawing to canvas automatically strips EXIF data including GPS
 *
 * @param {File} file - Original image file
 * @param {Object} options - Processing options
 * @param {number} options.quality - Quality 0-100 (default 80)
 * @param {boolean} options.convertToWebP - Convert to WebP format (default true)
 * @param {boolean} options.fullResolution - Skip resizing (default false)
 * @returns {Promise<{ blob: Blob, width: number, height: number, originalSize: number, processedSize: number }>}
 */
export function processImage(file: File, options?: {
    quality: number;
    convertToWebP: boolean;
    fullResolution: boolean;
}): Promise<{
    blob: Blob;
    width: number;
    height: number;
    originalSize: number;
    processedSize: number;
}>;
/**
 * Generate a date-based path for organizing uploads
 * Format: photos/YYYY/MM/DD/
 * @returns {string} Date-based folder path
 */
export function generateDatePath(): string;
/**
 * Generate a clean filename from original name
 * @param {string} originalName - Original filename
 * @param {boolean} useWebP - Whether to use .webp extension
 * @returns {string} Sanitized filename
 */
export function sanitizeFilename(originalName: string, useWebP?: boolean): string;
/**
 * Format bytes to human-readable string
 * @param {number} bytes - Size in bytes
 * @returns {string} Formatted size
 */
export function formatBytes(bytes: number): string;
/**
 * Calculate compression ratio
 * @param {number} original - Original size in bytes
 * @param {number} processed - Processed size in bytes
 * @returns {string} Percentage saved
 */
export function compressionRatio(original: number, processed: number): string;
