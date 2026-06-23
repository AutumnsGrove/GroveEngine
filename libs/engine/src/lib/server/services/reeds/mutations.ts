import type { TenantDb } from "../database.js";
import { renderMarkdown } from "@autumnsgrove/grove-markdown";
import type { CommentRecord, CommentSettingsRecord } from "./types.js";

export function stripControlChars(input: string): string {
	return input.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F\x80-\x9F\u2028\u2029]/g, "");
}

export async function createComment(
	tenantDb: TenantDb,
	data: {
		postId: string;
		authorId: string;
		authorName: string;
		authorEmail: string;
		content: string;
		isPublic: boolean;
		parentId?: string;
	},
): Promise<string> {
	const cleanContent = stripControlChars(data.content);
	const cleanName = stripControlChars(data.authorName);
	const contentHtml = renderMarkdown(cleanContent);

	const status = data.isPublic ? "pending" : "approved";

	return tenantDb.insert("comments", {
		post_id: data.postId,
		author_id: data.authorId,
		author_name: cleanName,
		author_email: data.authorEmail,
		parent_id: data.parentId || null,
		content: cleanContent,
		content_html: contentHtml,
		is_public: data.isPublic ? 1 : 0,
		status,
	});
}

const EDIT_WINDOW_MINUTES = 15;

export function isWithinEditWindow(createdAt: string): boolean {
	const created = new Date(createdAt).getTime();
	const cutoff = Date.now() - EDIT_WINDOW_MINUTES * 60 * 1000;
	return created > cutoff;
}

export async function editComment(
	tenantDb: TenantDb,
	commentId: string,
	newContent: string,
): Promise<boolean> {
	const existing = await tenantDb.findById<CommentRecord>("comments", commentId);
	if (!existing || existing.content === "[deleted]") {
		return false;
	}

	const cleanContent = stripControlChars(newContent);
	const contentHtml = renderMarkdown(cleanContent);
	const changes = await tenantDb.update(
		"comments",
		{
			content: cleanContent,
			content_html: contentHtml,
			edited_at: new Date().toISOString(),
		},
		"id = ?",
		[commentId],
	);
	return changes > 0;
}

export async function deleteComment(tenantDb: TenantDb, commentId: string): Promise<boolean> {
	const hasReplies = await tenantDb.exists("comments", "parent_id = ?", [commentId]);

	if (hasReplies) {
		const changes = await tenantDb.update(
			"comments",
			{
				content: "[deleted]",
				content_html: "<p>[deleted]</p>",
				author_name: "[deleted]",
				status: "approved",
			},
			"id = ?",
			[commentId],
		);
		return changes > 0;
	} else {
		return tenantDb.deleteById("comments", commentId);
	}
}

export async function moderateComment(
	tenantDb: TenantDb,
	commentId: string,
	action: "approve" | "reject" | "spam",
	moderatorId: string,
	note?: string,
): Promise<boolean> {
	const statusMap = {
		approve: "approved",
		reject: "rejected",
		spam: "spam",
	};

	const changes = await tenantDb.update(
		"comments",
		{
			status: statusMap[action],
			moderated_at: new Date().toISOString(),
			moderated_by: moderatorId,
			moderation_note: note || null,
		},
		"id = ?",
		[commentId],
	);
	return changes > 0;
}

export async function upsertCommentSettings(
	tenantDb: TenantDb,
	settings: Partial<Omit<CommentSettingsRecord, "tenant_id" | "updated_at">>,
): Promise<void> {
	const existing = await tenantDb.queryOne<CommentSettingsRecord>("comment_settings");

	if (existing) {
		await tenantDb.update(
			"comment_settings",
			{
				...settings,
				updated_at: new Date().toISOString(),
			},
			"tenant_id = ?",
			[tenantDb.tenantId],
		);
	} else {
		await tenantDb.insert("comment_settings", {
			...settings,
			updated_at: new Date().toISOString(),
		});
	}
}
