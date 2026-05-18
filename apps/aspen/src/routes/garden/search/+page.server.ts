import { getAllPosts } from "@autumnsgrove/grove-markdown";
import type { PageServerLoad } from "./$types.js";

export const prerender = false;

interface PostRow {
	slug: string;
	title: string;
	published_at: number | null;
	tags: string | null;
	description: string | null;
}

interface PostMeta {
	slug: string;
	title: string;
	date: string;
	tags: string[];
	description: string;
}

const POSTS_SQL = `SELECT slug, title, published_at, tags, description
FROM posts
WHERE tenant_id = ? AND status = 'published'
ORDER BY published_at DESC
LIMIT 100`;

function mapPostRow(post: PostRow): PostMeta {
	return {
		slug: post.slug,
		title: post.title,
		date: post.published_at
			? new Date(post.published_at * 1000).toISOString()
			: new Date().toISOString(),
		tags: post.tags ? JSON.parse(post.tags) : [],
		description: post.description || "",
	};
}

export const load: PageServerLoad = async ({ locals, platform }) => {
	let posts: PostMeta[] = [];
	const tenantId = locals.tenantId;
	const db = platform?.env?.DB;

	if (db && tenantId) {
		try {
			const result = await db.prepare(POSTS_SQL).bind(tenantId).all<PostRow>();
			posts = (result.results ?? []).map(mapPostRow);
		} catch (err) {
			console.error("[Garden Search] D1 fetch error:", err);
		}
	}

	// Fallback to filesystem for local dev
	if (posts.length === 0) {
		posts = getAllPosts().map((p) => ({ ...p }));
	}

	const allTags = [...new Set(posts.flatMap((post) => post.tags))].sort();

	return {
		posts,
		allTags,
	};
};
