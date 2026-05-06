// Utils barrel export
// Re-exports all utility functions from the utils module

export * from "./api";
export * from "./cn";
export * from "./csrf";
export * from "./date";
export * from "./debounce";
export * from "./errors";
export * from "./escape-html";
export * from "./format";
export * from "./id";
export * from "./schedule";
export * from "./shuffle";
export * from "./slugify";

// Gallery - explicit exports to avoid ambiguity
export {
	parseImageFilename,
	getImageTitle,
	getImageDate,
	searchImages,
	filterImagesByDateRange,
	filterImagesByTags,
	filterImagesByCategory,
	getAvailableYears,
	getAvailableCategories,
	type GalleryImage,
	type ImageTag,
	type ParsedImageMetadata,
} from "./gallery";

// Gutter - explicit exports to avoid ambiguity
export {
	parseAnchor,
	getAnchorKey,
	getUniqueAnchors,
	getAnchorLabel,
	getItemsForAnchor,
	getOrphanItems,
	findAnchorElement,
	type AnchorType,
	type ParsedAnchor,
	type Header,
	type GutterItem,
} from "./gutter";

export * from "../media/processing/imageProcessor";
export * from "./json";
export * from "../content/markdown/markdown";
export * from "./readability";
export * from "./sanitize";
export * from "./user";
export * from "./trace-path";
export * from "./validation";
export * from "./webhook-sanitizer";
export * from "./grove-url";

// Mentions - @username grove links
export { mentionsPlugin, processMentions } from "../content/markdown/mentions";

// Rehype GroveTerm plugin - explicit exports
export {
	rehypeGroveTerm,
	processGroveTerms,
	type RehypeGroveTermOptions,
} from "./rehype-groveterm";
