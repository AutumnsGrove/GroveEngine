import type { ContentLoader, PostMeta, Post, Page, SiteConfig } from "./types.js";

let contentLoader: ContentLoader | null = null;

export function registerContentLoader(loader: ContentLoader): void {
	contentLoader = loader;
}

export function getAllPosts(): PostMeta[] {
	if (!contentLoader || !contentLoader.getAllPosts) {
		console.warn(
			"getAllPosts: No content loader registered. Call registerContentLoader() in your site.",
		);
		return [];
	}
	return contentLoader.getAllPosts();
}

export function getSiteConfig(): SiteConfig {
	if (!contentLoader || !contentLoader.getSiteConfig) {
		console.warn(
			"getSiteConfig: No content loader registered. Call registerContentLoader() in your site.",
		);
		return {
			owner: { name: "Admin", email: "" },
			site: { title: "Lattice Site", description: "", copyright: "" },
			social: {},
		};
	}
	return contentLoader.getSiteConfig();
}

export function getLatestPost(): Post | null {
	if (!contentLoader || !contentLoader.getLatestPost) {
		console.warn(
			"getLatestPost: No content loader registered. Call registerContentLoader() in your site.",
		);
		return null;
	}
	return contentLoader.getLatestPost();
}

export function getHomePage(): Page | null {
	if (!contentLoader || !contentLoader.getHomePage) {
		console.warn(
			"getHomePage: No content loader registered. Call registerContentLoader() in your site.",
		);
		return null;
	}
	return contentLoader.getHomePage();
}

export function getPostBySlug(slug: string): Post | null {
	if (!contentLoader || !contentLoader.getPostBySlug) {
		console.warn(
			"getPostBySlug: No content loader registered. Call registerContentLoader() in your site.",
		);
		return null;
	}
	return contentLoader.getPostBySlug(slug);
}

export function getAboutPage(): Page | null {
	if (!contentLoader || !contentLoader.getAboutPage) {
		console.warn(
			"getAboutPage: No content loader registered. Call registerContentLoader() in your site.",
		);
		return null;
	}
	return contentLoader.getAboutPage();
}

export function getContactPage(): Page | null {
	if (!contentLoader || !contentLoader.getContactPage) {
		console.warn(
			"getContactPage: No content loader registered. Call registerContentLoader() in your site.",
		);
		return null;
	}
	return contentLoader.getContactPage();
}

export function getAllRecipes(): PostMeta[] {
	if (!contentLoader || !contentLoader.getAllRecipes) {
		console.warn(
			"getAllRecipes: No content loader registered. Call registerContentLoader() in your site.",
		);
		return [];
	}
	return contentLoader.getAllRecipes();
}

export function getRecipeBySlug(slug: string): Post | null {
	if (!contentLoader || !contentLoader.getRecipeBySlug) {
		console.warn(
			"getRecipeBySlug: No content loader registered. Call registerContentLoader() in your site.",
		);
		return null;
	}
	return contentLoader.getRecipeBySlug(slug);
}
