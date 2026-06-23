import { renderMarkdown } from "./renderer.js";
import type { GutterItem, GutterManifest, GalleryImage } from "./types.js";

function isValidUrl(urlString: string): boolean {
	try {
		const url = new URL(urlString);
		return url.protocol === "http:" || url.protocol === "https:";
	} catch {
		return false;
	}
}

export function processGutterContent(
	slug: string,
	manifestModules: Record<string, GutterManifest | { default: GutterManifest }>,
	markdownModules: Record<string, string>,
	imageModules: Record<string, string>,
): GutterItem[] {
	const manifestEntry = Object.entries(manifestModules).find(([filepath]) => {
		const parts = filepath.split("/");
		const folder = parts[parts.length - 3];
		return folder === slug;
	});

	if (!manifestEntry) {
		return [];
	}

	const manifestData = manifestEntry[1];
	const manifest: GutterManifest = "default" in manifestData ? manifestData.default : manifestData;

	if (!manifest.items || !Array.isArray(manifest.items)) {
		return [];
	}

	return manifest.items
		.map((item): GutterItem | null => {
			const { images: rawImages, ...baseItem } = item;

			if (item.type === "comment" || item.type === "markdown") {
				const mdEntry = Object.entries(markdownModules).find(([filepath]) => {
					return filepath.includes(`/${slug}/gutter/${item.file}`);
				});

				if (mdEntry) {
					const markdownContent = mdEntry[1];
					const htmlContent = renderMarkdown(markdownContent);

					return {
						...baseItem,
						content: htmlContent,
					};
				}
			} else if (item.type === "photo" || item.type === "image") {
				if (item.file && isValidUrl(item.file)) {
					return {
						...baseItem,
						src: item.file,
					};
				}

				const imgEntry = Object.entries(imageModules).find(([filepath]) => {
					return filepath.includes(`/${slug}/gutter/${item.file}`);
				});

				if (imgEntry) {
					return {
						...baseItem,
						src: imgEntry[1],
					};
				}
			} else if (item.type === "emoji") {
				if (item.url) {
					return {
						...baseItem,
						src: item.url,
					};
				} else if (item.file) {
					const imgEntry = Object.entries(imageModules).find(([filepath]) => {
						return filepath.includes(`/${slug}/gutter/${item.file}`);
					});

					if (imgEntry) {
						return {
							...baseItem,
							src: imgEntry[1],
						};
					}
				}
				return baseItem;
			} else if (item.type === "gallery") {
				const originalImageCount = (rawImages || []).length;
				const images: GalleryImage[] = (rawImages || [])
					.map((img): GalleryImage | null => {
						if (img.url) {
							if (!isValidUrl(img.url)) {
								console.warn(`Invalid URL in gallery for "${slug}": ${img.url}`);
								return null;
							}
							return {
								url: img.url,
								alt: img.alt || "",
								caption: img.caption || "",
							};
						}

						if (img.file) {
							const imgEntry = Object.entries(imageModules).find(([filepath]) => {
								return filepath.includes(`/${slug}/gutter/${img.file}`);
							});

							if (imgEntry) {
								return {
									url: imgEntry[1],
									alt: img.alt || "",
									caption: img.caption || "",
								};
							} else {
								console.warn(`Local file not found in gallery for "${slug}": ${img.file}`);
							}
						}

						return null;
					})
					.filter((img): img is GalleryImage => img !== null);

				if (images.length > 0) {
					return {
						...baseItem,
						images,
					};
				} else if (originalImageCount > 0) {
					console.warn(
						`Gallery in "${slug}" has ${originalImageCount} image(s) defined but none could be resolved`,
					);
				}
			}

			return baseItem;
		})
		.filter(
			(item): item is GutterItem =>
				item !== null && (!!item.content || !!item.src || !!item.images || item.type === "emoji"),
		);
}
