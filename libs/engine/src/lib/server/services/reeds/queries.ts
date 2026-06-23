import type { TenantDb } from "../database.js";
import type { CommentRecord, CommentSettingsRecord, ThreadedComment } from "./types.js";

const DEFAULT_SETTINGS: Omit<CommentSettingsRecord, "tenant_id" | "updated_at"> = {
	comments_enabled: 1,
	public_comments_enabled: 1,
	who_can_comment: "anyone",
	show_comment_count: 1,
	notify_on_reply: 1,
	notify_on_pending: 1,
	notify_on_thread_reply: 1,
};

export async function getCommentSettings(tenantDb: TenantDb): Promise<CommentSettingsRecord> {
	const settings = await tenantDb.queryOne<CommentSettingsRecord>("comment_settings");

	if (settings) return settings;

	return {
		tenant_id: tenantDb.tenantId,
		...DEFAULT_SETTINGS,
		updated_at: new Date().toISOString(),
	};
}

export async function getApprovedComments(
	tenantDb: TenantDb,
	postId: string,
): Promise<CommentRecord[]> {
	return tenantDb.queryMany<CommentRecord>(
		"comments",
		"post_id = ? AND is_public = 1 AND status = ?",
		[postId, "approved"],
		{ orderBy: "created_at ASC" },
	);
}

export async function getPrivateReplies(
	tenantDb: TenantDb,
	postId: string,
): Promise<CommentRecord[]> {
	return tenantDb.queryMany<CommentRecord>("comments", "post_id = ? AND is_public = 0", [postId], {
		orderBy: "created_at DESC",
	});
}

export async function getPendingComments(tenantDb: TenantDb): Promise<CommentRecord[]> {
	return tenantDb.queryMany<CommentRecord>(
		"comments",
		"is_public = 1 AND status = ?",
		["pending"],
		{ orderBy: "created_at ASC", limit: 100 },
	);
}

export async function getPendingCount(tenantDb: TenantDb): Promise<number> {
	return tenantDb.count("comments", "is_public = 1 AND status = ?", ["pending"]);
}

export async function getModeratedComments(tenantDb: TenantDb): Promise<CommentRecord[]> {
	return tenantDb.queryMany<CommentRecord>(
		"comments",
		"is_public = 1 AND status IN (?, ?)",
		["rejected", "spam"],
		{ orderBy: "moderated_at DESC", limit: 100 },
	);
}

export async function getAllPrivateReplies(tenantDb: TenantDb): Promise<CommentRecord[]> {
	return tenantDb.queryMany<CommentRecord>("comments", "is_public = 0", [], {
		orderBy: "created_at DESC",
		limit: 100,
	});
}

export async function getCommentCount(tenantDb: TenantDb, postId: string): Promise<number> {
	return tenantDb.count("comments", "post_id = ? AND is_public = 1 AND status = ?", [
		postId,
		"approved",
	]);
}

export async function getCommentById(
	tenantDb: TenantDb,
	commentId: string,
): Promise<CommentRecord | null> {
	return tenantDb.findById<CommentRecord>("comments", commentId);
}

const MAX_THREAD_DEPTH = 3;

export function buildCommentTree(comments: CommentRecord[]): ThreadedComment[] {
	const map = new Map<string, ThreadedComment>();
	const roots: ThreadedComment[] = [];

	for (const comment of comments) {
		map.set(comment.id, { ...comment, replies: [], depth: 0 });
	}

	for (const comment of comments) {
		const node = map.get(comment.id)!;

		if (!comment.parent_id || !map.has(comment.parent_id)) {
			node.depth = 0;
			roots.push(node);
		} else {
			const parent = map.get(comment.parent_id)!;
			node.depth = parent.depth + 1;

			if (node.depth < MAX_THREAD_DEPTH) {
				parent.replies.push(node);
			} else {
				node.depth = MAX_THREAD_DEPTH - 1;
				parent.replies.push(node);
			}
		}
	}

	return roots;
}
