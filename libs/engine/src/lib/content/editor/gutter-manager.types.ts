export interface GutterItem {
	type: string;
	anchor?: string;
	content?: string;
	url?: string;
	file?: string;
	caption?: string;
	images?: GalleryImage[];
	embedUrl?: string;
	embedProvider?: string;
	embedHtml?: string;
	embedTitle?: string;
	embedThumbnail?: string;
}

export interface GalleryImage {
	url: string;
	alt?: string;
	caption?: string;
}

export interface CdnImage {
	key: string;
	url: string;
}

export interface ProcessedAnchor {
	raw: string;
	isHeading: boolean;
	headingLevel: number;
	isAnchorTag: boolean;
	isParagraph: boolean;
	paragraphIndex: number;
	displayText: string;
	type: string;
}

export interface ParagraphAnchor {
	index: number;
	preview: string;
}

export interface ImageCacheEntry {
	url: string;
	timestamp: number;
}
