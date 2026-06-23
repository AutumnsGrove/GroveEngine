import matter from "@11ty/gray-matter";
import { parseMarkdownContent, parseMarkdownContentSanitized } from "./parse.js";
import { processGutterContent } from "./gutter.js";
import type {
	PostMeta,
	Post,
	Page,
	ModuleMap,
	SiteConfig,
	GutterModules,
	GetItemOptions,
	GetPageOptions,
} from "./types.js";

export function processMarkdownModules(modules: ModuleMap): PostMeta[] {
	try {
		const items = Object.entries(modules)
			.map(([filepath, content]): PostMeta | null => {
				try {
					const filename = filepath.split("/").pop();
					if (!filename) return null;
					const slug = filename.replace(".md", "");
					const { data } = matter(content);

					return {
						slug,
						title: (data.title as string) || "Untitled",
						date: (data.date as string) || new Date().toISOString(),
						tags: (data.tags as string[]) || [],
						description: (data.description as string) || "",
					};
				} catch (err) {
					console.error(`Error processing file ${filepath}:`, err);
					return null;
				}
			})
			.filter((item): item is PostMeta => item !== null)
			.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

		return items;
	} catch (err) {
		console.error("Error in processMarkdownModules:", err);
		return [];
	}
}

export function getItemBySlug(
	slug: string,
	modules: ModuleMap,
	options: GetItemOptions = {},
): Post | null {
	const entry = Object.entries(modules).find(([filepath]) => {
		const filename = filepath.split("/").pop();
		if (!filename) return false;
		const fileSlug = filename.replace(".md", "");
		return fileSlug === slug;
	});

	if (!entry) {
		return null;
	}

	const rawContent = entry[1];
	const { data, content, headers } = parseMarkdownContent(rawContent);

	const result: Post = {
		slug,
		title: data.title || "Untitled",
		date: data.date || new Date().toISOString(),
		tags: data.tags || [],
		description: data.description || "",
		content,
		headers,
	};

	if (options.gutterModules?.manifest) {
		const { manifest, markdown = {}, images = {} } = options.gutterModules;
		result.gutterContent = processGutterContent(slug, manifest, markdown, images);
	}

	if (options.sidecarModules) {
		const sidecarEntry = Object.entries(options.sidecarModules).find(([filepath]) => {
			const parts = filepath.split("/");
			const folder = parts[parts.length - 3];
			return folder === slug;
		});

		if (sidecarEntry) {
			const sidecarData = sidecarEntry[1] as { default?: unknown } | unknown;
			result.sidecar =
				typeof sidecarData === "object" && sidecarData !== null && "default" in sidecarData
					? sidecarData.default
					: sidecarData;
		}
	}

	return result;
}

export function getPageByFilename(
	filename: string,
	modules: ModuleMap,
	options: GetPageOptions = {},
): Page | null {
	try {
		const entry = Object.entries(modules).find(([filepath]) => {
			return filepath.includes(filename);
		});

		if (!entry) {
			return null;
		}

		const rawContent = entry[1];
		const { data, content, headers } = parseMarkdownContentSanitized(rawContent);
		const slug = options.slug || filename.replace(".md", "");

		const result: Page = {
			slug,
			title: data.title || slug.charAt(0).toUpperCase() + slug.slice(1),
			description: data.description || "",
			content,
			headers,
		};

		if (data.date) result.date = data.date;
		if (data.hero) result.hero = data.hero;
		if (data.galleries) result.galleries = data.galleries;

		if (options.gutterModules?.manifest) {
			const { manifest, markdown = {}, images = {} } = options.gutterModules;
			result.gutterContent = processGutterContent(slug, manifest, markdown, images);
		}

		return result;
	} catch (err) {
		console.error(`Error in getPageByFilename for ${filename}:`, err);
		return null;
	}
}

export function getSiteConfigFromModule(
	configModule: Record<string, SiteConfig | { default: SiteConfig }>,
): SiteConfig {
	const entry = Object.entries(configModule)[0];
	if (entry) {
		const config = entry[1];
		return "default" in config ? config.default : config;
	}
	return {
		owner: { name: "Admin", email: "" },
		site: { title: "The Grove", description: "", copyright: "AutumnsGrove" },
		social: {},
	};
}
