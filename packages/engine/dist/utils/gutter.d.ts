/**
 * Shared Gutter Utilities
 *
 * This module provides common utilities for gutter content positioning
 * and anchor resolution. Used by ContentWithGutter component and related
 * functionality across the site.
 */
/**
 * Parse anchor string to determine anchor type and value
 * @param {string} anchor - The anchor string from manifest
 * @returns {Object} Object with type and value properties
 */
export function parseAnchor(anchor: string): Object;
/**
 * Generate a unique key for an anchor (used for grouping and positioning)
 * @param {string} anchor - The anchor string
 * @param {Array} headers - Array of header objects with id and text
 * @returns {string} A unique key for the anchor
 */
export function getAnchorKey(anchor: string, headers?: any[]): string;
/**
 * Get all unique anchors from items (preserving order)
 * @param {Array} items - Array of gutter items
 * @returns {Array} Array of unique anchor strings
 */
export function getUniqueAnchors(items: any[]): any[];
/**
 * Get display label for an anchor (used in overflow section)
 * @param {string} anchor - The anchor string
 * @returns {string} Human-readable label for the anchor
 */
export function getAnchorLabel(anchor: string): string;
/**
 * Get items that match a specific anchor
 * @param {Array} items - Array of gutter items
 * @param {string} anchor - The anchor to match
 * @returns {Array} Items matching the anchor
 */
export function getItemsForAnchor(items: any[], anchor: string): any[];
/**
 * Get items that don't have a valid anchor (orphan items shown at top)
 * @param {Array} items - Array of gutter items
 * @param {Array} headers - Array of header objects
 * @returns {Array} Items without valid anchors
 */
export function getOrphanItems(items: any[], headers?: any[]): any[];
/**
 * Find the DOM element for an anchor within a content element
 * @param {string} anchor - The anchor string
 * @param {HTMLElement} contentEl - The content container element
 * @param {Array} headers - Array of header objects
 * @returns {HTMLElement|null} The DOM element or null if not found
 */
export function findAnchorElement(anchor: string, contentEl: HTMLElement, headers?: any[]): HTMLElement | null;
