/**
 * Get the site configuration
 * @returns {Object} Site configuration object
 */
export function getSiteConfig(): Object;
/**
 * Get all markdown posts from the posts directory
 * @returns {Array} Array of post objects with metadata and slug
 */
export function getAllPosts(): any[];
/**
 * Get the latest (most recent) post with full content
 * @returns {Object|null} The latest post object with content, or null if no posts exist
 */
export function getLatestPost(): Object | null;
/**
 * Get all recipes from the recipes directory
 * @returns {Array} Array of recipe objects with metadata and slug
 */
export function getAllRecipes(): any[];
/**
 * Get a single post by slug
 * @param {string} slug - The post slug
 * @returns {Object|null} Post object with content and metadata
 */
export function getPostBySlug(slug: string): Object | null;
/**
 * Extract headers from markdown content for table of contents
 * @param {string} markdown - The raw markdown content
 * @returns {Array} Array of header objects with level, text, and id
 */
export function extractHeaders(markdown: string): any[];
/**
 * Process anchor tags in HTML content
 * Converts <!-- anchor:tagname --> comments to identifiable span elements
 * @param {string} html - The HTML content
 * @returns {string} HTML with anchor markers converted to spans
 */
export function processAnchorTags(html: string): string;
/**
 * Get gutter content for a recipe by slug
 * @param {string} slug - The recipe slug
 * @returns {Array} Array of gutter items with content and position info
 */
export function getRecipeGutterContent(slug: string): any[];
/**
 * Get gutter content for a blog post by slug
 * @param {string} slug - The post slug
 * @returns {Array} Array of gutter items with content and position info
 */
export function getGutterContent(slug: string): any[];
/**
 * Get gutter content for the home page
 * @param {string} slug - The page slug (e.g., 'home')
 * @returns {Array} Array of gutter items with content and position info
 */
export function getHomeGutterContent(slug: string): any[];
/**
 * Get gutter content for the contact page
 * @param {string} slug - The page slug (e.g., 'contact')
 * @returns {Array} Array of gutter items with content and position info
 */
export function getContactGutterContent(slug: string): any[];
/**
 * Get the home page content
 * @returns {Object|null} Home page object with content, metadata, and galleries
 */
export function getHomePage(): Object | null;
/**
 * Get the contact page content
 * @returns {Object|null} Contact page object with content and metadata
 */
export function getContactPage(): Object | null;
/**
 * Get the about page content
 * @returns {Object|null} About page object with content and metadata
 */
export function getAboutPage(): Object | null;
/**
 * Get gutter content for the about page
 * @param {string} slug - The page slug (e.g., 'about')
 * @returns {Array} Array of gutter items with content and position info
 */
export function getAboutGutterContent(slug: string): any[];
/**
 * Get recipe metadata (step icons, etc.) for a recipe by slug
 * @param {string} slug - The recipe slug
 * @returns {Object|null} Recipe metadata with instruction icons
 */
export function getRecipeSidecar(slug: string): Object | null;
/**
 * Get a single recipe by slug
 * @param {string} slug - The recipe slug
 * @returns {Object|null} Recipe object with content and metadata
 */
export function getRecipeBySlug(slug: string): Object | null;
/**
 * Render Mermaid diagrams in the DOM
 * This should be called after the content is mounted
 */
export function renderMermaidDiagrams(): Promise<void>;
