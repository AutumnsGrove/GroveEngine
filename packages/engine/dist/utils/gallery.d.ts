/**
 * Gallery utilities for filename parsing and filtering
 * Extracts metadata from smart filenames like:
 * - 2025-01-15_forest-walk.jpg → date: 2025-01-15, slug: forest-walk
 * - minecraft/build_2024-12-01.png → category: minecraft, date: 2024-12-01
 * - selfies/2024-summer.jpg → category: selfies, slug: 2024-summer
 */
/**
 * Parse a filename to extract metadata
 * @param {string} r2Key - R2 object key (e.g., 'minecraft/build.png' or '2025-01-15_photo.jpg')
 * @returns {Object} Parsed metadata: { category, date, slug, filename, extension }
 */
export function parseImageFilename(r2Key: string): Object;
/**
 * Get display title for an image (uses custom title or parsed slug)
 * @param {Object} image - Gallery image object
 * @returns {string} Human-readable title
 */
export function getImageTitle(image: Object): string;
/**
 * Get display date for an image (uses custom date or parsed date)
 * @param {Object} image - Gallery image object
 * @returns {string|null} YYYY-MM-DD date string or null
 */
export function getImageDate(image: Object): string | null;
/**
 * Filter images by search query (searches title, slug, filename)
 * @param {Array} images - Array of gallery images
 * @param {string} query - Search query
 * @returns {Array} Filtered images
 */
export function searchImages(images: any[], query: string): any[];
/**
 * Filter images by date range
 * @param {Array} images - Array of gallery images
 * @param {string|null} startDate - YYYY-MM-DD start date (inclusive)
 * @param {string|null} endDate - YYYY-MM-DD end date (inclusive)
 * @returns {Array} Filtered images
 */
export function filterImagesByDateRange(images: any[], startDate: string | null, endDate: string | null): any[];
/**
 * Filter images by tags
 * @param {Array} images - Array of gallery images (must include 'tags' array)
 * @param {Array} tagSlugs - Array of tag slugs to filter by
 * @returns {Array} Filtered images
 */
export function filterImagesByTags(images: any[], tagSlugs: any[]): any[];
/**
 * Filter images by category (parsed from path)
 * @param {Array} images - Array of gallery images
 * @param {string|null} category - Category to filter by
 * @returns {Array} Filtered images
 */
export function filterImagesByCategory(images: any[], category: string | null): any[];
/**
 * Extract unique years from image dates
 * @param {Array} images - Array of gallery images
 * @returns {Array} Sorted array of years (descending)
 */
export function getAvailableYears(images: any[]): any[];
/**
 * Extract unique categories from images
 * @param {Array} images - Array of gallery images
 * @returns {Array} Sorted array of categories
 */
export function getAvailableCategories(images: any[]): any[];
