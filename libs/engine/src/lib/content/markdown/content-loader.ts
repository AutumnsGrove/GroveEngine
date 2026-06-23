import {
	processMarkdownModules,
	getItemBySlug,
	getPageByFilename,
	getSiteConfigFromModule,
} from "./modules.js";
import { processGutterContent } from "./gutter.js";
import type { ContentLoader, ContentLoaderConfig, GutterModules } from "./types.js";

export function createContentLoader(config: ContentLoaderConfig): ContentLoader {
	const {
		posts = {},
		recipes = {},
		about = {},
		home = {},
		contact = {},
		siteConfig = {},
		postGutter = {},
		recipeGutter = {},
		recipeMetadata = {},
		aboutGutter = {},
		homeGutter = {},
		contactGutter = {},
	} = config;

	const loader: ContentLoader = {
		getAllPosts() {
			return processMarkdownModules(posts);
		},

		getAllRecipes() {
			return processMarkdownModules(recipes);
		},

		getLatestPost() {
			const allPosts = processMarkdownModules(posts);
			if (allPosts.length === 0) {
				return null;
			}
			return loader.getPostBySlug(allPosts[0].slug);
		},

		getPostBySlug(slug: string) {
			return getItemBySlug(slug, posts, {
				gutterModules: postGutter.manifest ? (postGutter as GutterModules) : undefined,
			});
		},

		getRecipeBySlug(slug: string) {
			return getItemBySlug(slug, recipes, {
				gutterModules: recipeGutter.manifest ? (recipeGutter as GutterModules) : undefined,
				sidecarModules: recipeMetadata,
			});
		},

		getHomePage() {
			return getPageByFilename("home.md", home, {
				gutterModules: homeGutter.manifest ? (homeGutter as GutterModules) : undefined,
				slug: "home",
			});
		},

		getAboutPage() {
			return getPageByFilename("about.md", about, {
				gutterModules: aboutGutter.manifest ? (aboutGutter as GutterModules) : undefined,
				slug: "about",
			});
		},

		getContactPage() {
			return getPageByFilename("contact.md", contact, {
				gutterModules: contactGutter.manifest ? (contactGutter as GutterModules) : undefined,
				slug: "contact",
			});
		},

		getSiteConfig() {
			return getSiteConfigFromModule(siteConfig);
		},

		getGutterContent(slug: string) {
			if (!postGutter.manifest) return [];
			return processGutterContent(
				slug,
				postGutter.manifest,
				postGutter.markdown || {},
				postGutter.images || {},
			);
		},

		getRecipeGutterContent(slug: string) {
			if (!recipeGutter.manifest) return [];
			return processGutterContent(
				slug,
				recipeGutter.manifest,
				recipeGutter.markdown || {},
				recipeGutter.images || {},
			);
		},

		getHomeGutterContent(slug: string) {
			if (!homeGutter.manifest) return [];
			return processGutterContent(
				slug,
				homeGutter.manifest,
				homeGutter.markdown || {},
				homeGutter.images || {},
			);
		},

		getAboutGutterContent(slug: string) {
			if (!aboutGutter.manifest) return [];
			return processGutterContent(
				slug,
				aboutGutter.manifest,
				aboutGutter.markdown || {},
				aboutGutter.images || {},
			);
		},

		getContactGutterContent(slug: string) {
			if (!contactGutter.manifest) return [];
			return processGutterContent(
				slug,
				contactGutter.manifest,
				contactGutter.markdown || {},
				contactGutter.images || {},
			);
		},

		getRecipeSidecar(slug: string) {
			const entry = Object.entries(recipeMetadata).find(([filepath]) => {
				const parts = filepath.split("/");
				const folder = parts[parts.length - 3];
				return folder === slug;
			});

			if (!entry) {
				return null;
			}

			const data = entry[1] as { default?: unknown } | unknown;
			return typeof data === "object" && data !== null && "default" in data ? data.default : data;
		},
	};

	return loader;
}
