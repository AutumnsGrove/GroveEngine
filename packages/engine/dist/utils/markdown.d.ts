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
 * Parse markdown content and convert to HTML
 * @param {string} markdownContent - The raw markdown content (may include frontmatter)
 * @returns {Object} Object with data (frontmatter), content (HTML), headers, and raw markdown
 */
export function parseMarkdownContent(markdownContent: string): Object;
/**
 * Parse markdown content with sanitization (for user-facing pages like home, about, contact)
 * @param {string} markdownContent - The raw markdown content (may include frontmatter)
 * @returns {Object} Object with data (frontmatter), content (sanitized HTML), headers
 */
export function parseMarkdownContentSanitized(markdownContent: string): Object;
/**
 * Get gutter content from provided modules
 * This is a utility function that processes gutter manifests, markdown, and images
 *
 * @param {string} slug - The page/post slug
 * @param {Object} manifestModules - The manifest modules (from import.meta.glob)
 * @param {Object} markdownModules - The markdown modules (from import.meta.glob)
 * @param {Object} imageModules - The image modules (from import.meta.glob)
 * @returns {Array} Array of gutter items with content and position info
 */
export function processGutterContent(slug: string, manifestModules: Object, markdownModules: Object, imageModules: Object): any[];
/**
 * Process a list of markdown files into post/recipe objects
 *
 * @param {Object} modules - The modules from import.meta.glob (filepath -> content)
 * @returns {Array} Array of post/content objects with metadata and slug
 */
export function processMarkdownModules(modules: Object): any[];
/**
 * Get a single item by slug from modules
 *
 * @param {string} slug - The item slug
 * @param {Object} modules - The modules from import.meta.glob (filepath -> content)
 * @param {Object} options - Optional configuration
 * @param {Object} options.gutterModules - Gutter modules { manifest, markdown, images }
 * @param {Object} options.sidecarModules - Sidecar/metadata modules (for recipes)
 * @returns {Object|null} Item object with content and metadata
 */
export function getItemBySlug(slug: string, modules: Object, options?: {
    gutterModules: Object;
    sidecarModules: Object;
}): Object | null;
/**
 * Get a page (home, about, contact) by filename from modules
 * Uses sanitization for security
 *
 * @param {string} filename - The filename to look for (e.g., "home.md", "about.md")
 * @param {Object} modules - The modules from import.meta.glob (filepath -> content)
 * @param {Object} options - Optional configuration
 * @param {Object} options.gutterModules - Gutter modules { manifest, markdown, images }
 * @param {string} options.slug - Override slug (defaults to filename without .md)
 * @returns {Object|null} Page object with content and metadata
 */
export function getPageByFilename(filename: string, modules: Object, options?: {
    gutterModules: Object;
    slug: string;
}): Object | null;
/**
 * Get site configuration from a config module
 *
 * @param {Object} configModule - The config module from import.meta.glob
 * @returns {Object} Site configuration object
 */
export function getSiteConfigFromModule(configModule: Object): Object;
/**
 * Create a configured content loader with all functions bound to the provided modules
 * This is the main factory function for creating a content loader in the consuming app
 *
 * @param {Object} config - Configuration object with all required modules
 * @param {Object} config.posts - Post modules from import.meta.glob
 * @param {Object} config.recipes - Recipe modules from import.meta.glob
 * @param {Object} config.about - About page modules from import.meta.glob
 * @param {Object} config.home - Home page modules from import.meta.glob
 * @param {Object} config.contact - Contact page modules from import.meta.glob
 * @param {Object} config.siteConfig - Site config module from import.meta.glob
 * @param {Object} config.postGutter - Post gutter modules { manifest, markdown, images }
 * @param {Object} config.recipeGutter - Recipe gutter modules { manifest, markdown, images }
 * @param {Object} config.recipeMetadata - Recipe metadata modules from import.meta.glob
 * @param {Object} config.aboutGutter - About gutter modules { manifest, markdown, images }
 * @param {Object} config.homeGutter - Home gutter modules { manifest, markdown, images }
 * @param {Object} config.contactGutter - Contact gutter modules { manifest, markdown, images }
 * @returns {Object} Object with all content loader functions
 */
export function createContentLoader(config: {
    posts: Object;
    recipes: Object;
    about: Object;
    home: Object;
    contact: Object;
    siteConfig: Object;
    postGutter: Object;
    recipeGutter: Object;
    recipeMetadata: Object;
    aboutGutter: Object;
    homeGutter: Object;
    contactGutter: Object;
}): Object;
/**
 * Register a content loader for the site
 * This should be called by the consuming site to provide access to content
 * @param {Object} loader - Object with getAllPosts, getSiteConfig, getLatestPost functions
 */
export function registerContentLoader(loader: Object): void;
/**
 * Get all blog posts
 * @returns {Array} Array of post objects
 */
export function getAllPosts(): any[];
/**
 * Get site configuration
 * @returns {Object} Site config object
 */
export function getSiteConfig(): Object;
/**
 * Get the latest post
 * @returns {Object|null} Latest post or null
 */
export function getLatestPost(): Object | null;
/**
 * Get home page content
 * @returns {Object|null} Home page data or null
 */
export function getHomePage(): Object | null;
/**
 * Get a post by its slug
 * @param {string} slug - The post slug
 * @returns {Object|null} Post object or null
 */
export function getPostBySlug(slug: string): Object | null;
/**
 * Get about page content
 * @returns {Object|null} About page data or null
 */
export function getAboutPage(): Object | null;
/**
 * Get contact page content
 * @returns {Object|null} Contact page data or null
 */
export function getContactPage(): Object | null;
/**
 * Get all recipes
 * @returns {Array} Array of recipe objects
 */
export function getAllRecipes(): any[];
/**
 * Get a recipe by its slug
 * @param {string} slug - The recipe slug
 * @returns {Object|null} Recipe object or null
 */
export function getRecipeBySlug(slug: string): Object | null;
