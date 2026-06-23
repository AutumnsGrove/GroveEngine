import type { GutterItem, ProcessedAnchor, ImageCacheEntry } from "./gutter-manager.types.js";

export const EMPTY_ANCHOR: ProcessedAnchor = {
	raw: "",
	isHeading: false,
	headingLevel: 0,
	isAnchorTag: false,
	isParagraph: false,
	paragraphIndex: 0,
	displayText: "",
	type: "paragraph",
};

export function getHeadingLevel(anchor: string | undefined): number {
	if (!anchor) return 0;
	const match = anchor.match(/^#{1,6}/);
	return match ? Math.min(match[0].length, 6) : 0;
}

export function createProcessedAnchor(anchor: string): ProcessedAnchor {
	const isHeading = anchor.startsWith("#");
	const headingLevel = getHeadingLevel(anchor);
	const isAnchorTag = anchor.startsWith("anchor:");
	const paragraphMatch = anchor.match(/^paragraph:(\d+)$/);
	const isParagraph = paragraphMatch !== null;
	const paragraphIndex = isParagraph ? parseInt(paragraphMatch[1], 10) : 0;
	const displayText = isHeading
		? anchor.replace(/^#+\s*/, "")
		: isAnchorTag
			? anchor.replace("anchor:", "")
			: isParagraph
				? `Paragraph ${paragraphIndex}`
				: anchor;
	const type = isHeading
		? `heading level ${headingLevel}`
		: isAnchorTag
			? "anchor tag"
			: "paragraph";

	return {
		raw: anchor,
		isHeading,
		headingLevel,
		isAnchorTag,
		isParagraph,
		paragraphIndex,
		displayText,
		type,
	};
}

export function generateAnchorName(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9\s-]/g, "")
		.replace(/\s+/g, "-")
		.substring(0, 30);
}

export function getItemPreview(item: GutterItem): string {
	if (item.type === "comment" && item.content) {
		return item.content.substring(0, 50) + (item.content.length > 50 ? "..." : "");
	}
	if (item.type === "photo") {
		return item.caption || item.url || "Photo";
	}
	if (item.type === "gallery") {
		return `${item.images?.length || 0} images`;
	}
	if (item.type === "embed") {
		const label = item.embedProvider ? `[${item.embedProvider}] ` : "";
		return label + (item.embedTitle || item.embedUrl || "Embed");
	}
	return "";
}

const imageCache = new Map<string, ImageCacheEntry>();
const CACHE_TTL = 5 * 60 * 1000;

export function getCachedImage(key: string): string | null {
	const cached = imageCache.get(key);
	if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
		return cached.url;
	}
	return null;
}

export function setCachedImage(key: string, url: string): void {
	imageCache.set(key, { url, timestamp: Date.now() });
}
