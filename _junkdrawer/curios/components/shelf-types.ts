export interface ShelfItem {
	id: string;
	url: string;
	title: string;
	creator: string | null;
	description: string | null;
	coverUrl: string | null;
	thumbnailUrl: string | null;
	category: string | null;
	isStatus1: boolean;
	isStatus2: boolean;
	rating: number | null;
	note: string | null;
}

export interface Shelf {
	id: string;
	name: string;
	description: string | null;
	preset: string;
	displayMode: string;
	material: string;
	creatorLabel: string;
	status1Label: string;
	status2Label: string;
	isFeatured: boolean;
	groupByCategory: boolean;
	items: ShelfItem[];
}

export function renderStars(rating: number | null): string {
	if (!rating) return "";
	return "\u2605".repeat(rating) + "\u2606".repeat(5 - rating);
}

export function extractDomain(url: string): string | null {
	try {
		return new URL(url).hostname.replace(/^www\./, "");
	} catch {
		return null;
	}
}

export function faviconUrl(url: string): string | null {
	try {
		const host = new URL(url).hostname;
		return `https://www.google.com/s2/favicons?domain=${host}&sz=16`;
	} catch {
		return null;
	}
}

export function spineColor(category: string | null, index: number): string {
	const palette = [
		"#8B6914",
		"#6B4423",
		"#4A6741",
		"#7B4B8A",
		"#4A708B",
		"#8B3A3A",
		"#556B2F",
		"#8B7355",
		"#5B3A6B",
		"#6B8E23",
	];
	if (category) {
		let hash = 0;
		for (let i = 0; i < category.length; i++) {
			hash = ((hash << 5) - hash + category.charCodeAt(i)) | 0;
		}
		return palette[Math.abs(hash) % palette.length];
	}
	return palette[index % palette.length];
}

export function masonryGradient(category: string | null, index: number): string {
	const palette = [
		"#8B6914",
		"#6B4423",
		"#4A6741",
		"#7B4B8A",
		"#4A708B",
		"#8B3A3A",
		"#556B2F",
		"#8B7355",
		"#5B3A6B",
		"#6B8E23",
	];
	let base: string;
	if (category) {
		let hash = 0;
		for (let i = 0; i < category.length; i++) {
			hash = ((hash << 5) - hash + category.charCodeAt(i)) | 0;
		}
		base = palette[Math.abs(hash) % palette.length];
	} else {
		base = palette[index % palette.length];
	}
	const r = parseInt(base.slice(1, 3), 16);
	const g = parseInt(base.slice(3, 5), 16);
	const b = parseInt(base.slice(5, 7), 16);
	const lighter = `rgb(${Math.min(255, r + 60)}, ${Math.min(255, g + 60)}, ${Math.min(255, b + 60)})`;
	return `linear-gradient(135deg, ${base}, ${lighter})`;
}
