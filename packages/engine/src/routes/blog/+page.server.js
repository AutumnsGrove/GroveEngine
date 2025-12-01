import { getAllPosts } from '$lib/utils/markdown.js';

// Disable prerendering - posts are fetched from D1 at runtime
// This also ensures user auth state is available for the admin link
export const prerender = false;

export async function load({ locals, platform }) {
	let posts = [];

	// Try D1 database first (posts created via admin panel)
	if (platform?.env?.POSTS_DB) {
		try {
			const result = await platform.env.POSTS_DB.prepare(
				`SELECT slug, title, date, tags, description
				 FROM posts
				 ORDER BY date DESC`
			).all();

			posts = result.results.map((post) => ({
				slug: post.slug,
				title: post.title,
				date: post.date,
				tags: post.tags ? JSON.parse(post.tags) : [],
				description: post.description || ''
			}));
		} catch (err) {
			console.error('D1 fetch error for posts list:', err);
			// Fall through to filesystem fallback
		}
	}

	// If no D1 posts, fall back to filesystem (for local dev or if D1 is empty)
	if (posts.length === 0) {
		posts = getAllPosts();
	}

	return {
		posts,
		user: locals.user || null
	};
}
