/**
 * Markdown Processing — Re-export Barrel
 *
 * This file re-exports from focused modules for backward compatibility.
 * Prefer importing directly from the specific module:
 *   - types.ts          — all interfaces (Header, Post, Page, ContentLoader, etc.)
 *   - heading-id.ts     — generateHeadingId
 *   - renderer.ts       — markdown-it config, renderMarkdown
 *   - parse.ts          — extractHeaders, parseMarkdownContent, processAnchorTags
 *   - gutter.ts         — processGutterContent
 *   - modules.ts        — processMarkdownModules, getItemBySlug, getPageByFilename
 *   - content-loader.ts — createContentLoader factory
 *   - registry.ts       — registerContentLoader, global accessor functions
 */

// Types
export type {
	Header,
	Frontmatter,
	ParsedContent,
	GalleryImage,
	GutterItemBase,
	GutterItem,
	GutterManifest,
	PostMeta,
	Post,
	Page,
	SiteConfig,
	ModuleMap,
	GutterModules,
	GetItemOptions,
	GetPageOptions,
	ContentLoader,
	ContentLoaderConfig,
} from "./types.js";

// Heading ID
export { generateHeadingId } from "./heading-id.js";

// Renderer
export { renderMarkdown } from "./renderer.js";

// Parsing
export {
	extractHeaders,
	processAnchorTags,
	parseMarkdownContent,
	parseMarkdownContentSanitized,
} from "./parse.js";

// Gutter
export { processGutterContent } from "./gutter.js";

// Module Processing
export {
	processMarkdownModules,
	getItemBySlug,
	getPageByFilename,
	getSiteConfigFromModule,
} from "./modules.js";

// Content Loader
export { createContentLoader } from "./content-loader.js";

// Global Registry
export {
	registerContentLoader,
	getAllPosts,
	getSiteConfig,
	getLatestPost,
	getHomePage,
	getPostBySlug,
	getAboutPage,
	getContactPage,
	getAllRecipes,
	getRecipeBySlug,
} from "./registry.js";
