import { getAllPosts } from '$lib/utils/markdown.js';

export const prerender = false;

export function load() {
	const posts = getAllPosts();

	// Extract all unique tags from posts
	const allTags = [...new Set(posts.flatMap(post => post.tags))].sort();

	return {
		posts,
		allTags
	};
}
