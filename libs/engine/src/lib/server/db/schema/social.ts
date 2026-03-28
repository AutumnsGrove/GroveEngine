/**
 * Social Domain Schema — Meadow, Reeds (Comments), Feedback
 *
 * Community interaction tables: feed, comments, reactions, follows.
 */

import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";
import { tenants } from "./platform.js";
import { posts } from "./content.js";

// ─────────────────────────────────────────────────────────────────────────────
// SOCIAL: Meadow (Community Feed)
// ─────────────────────────────────────────────────────────────────────────────

export const meadowPosts = sqliteTable(
	"meadow_posts",
	{
		id: text("id").primaryKey(),
		tenantId: text("tenant_id")
			.notNull()
			.references(() => tenants.id, { onDelete: "cascade" }),
		guid: text("guid").notNull(),
		title: text("title").notNull(),
		description: text("description"),
		contentHtml: text("content_html"),
		link: text("link").notNull(),
		authorName: text("author_name"),
		authorSubdomain: text("author_subdomain"),
		tags: text("tags").default("[]"),
		featuredImage: text("featured_image"),
		publishedAt: integer("published_at").notNull(),
		fetchedAt: integer("fetched_at").notNull(),
		contentHash: text("content_hash"),
		score: real("score").default(0),
		reactionCounts: text("reaction_counts").default("{}"),

		// 077: Moderation visibility
		visible: integer("visible").default(1),

		// 078: Notes support
		postType: text("post_type").notNull().default("bloom"),
		userId: text("user_id"),
		body: text("body"),

		// Blazes (088)
		blaze: text("blaze"),
	},
	(table) => [uniqueIndex("idx_meadow_posts_tenant_guid").on(table.tenantId, table.guid)],
);

export const meadowVotes = sqliteTable(
	"meadow_votes",
	{
		id: text("id").primaryKey(),
		userId: text("user_id").notNull(),
		postId: text("post_id")
			.notNull()
			.references(() => meadowPosts.id, { onDelete: "cascade" }),
		createdAt: integer("created_at").notNull(),
	},
	(table) => [uniqueIndex("idx_meadow_votes_user_post").on(table.userId, table.postId)],
);

export const meadowReactions = sqliteTable(
	"meadow_reactions",
	{
		id: text("id").primaryKey(),
		userId: text("user_id").notNull(),
		postId: text("post_id")
			.notNull()
			.references(() => meadowPosts.id, { onDelete: "cascade" }),
		emoji: text("emoji").notNull(),
		createdAt: integer("created_at").notNull(),
	},
	(table) => [
		uniqueIndex("idx_meadow_reactions_unique").on(table.userId, table.postId, table.emoji),
	],
);

export const meadowBookmarks = sqliteTable(
	"meadow_bookmarks",
	{
		id: text("id").primaryKey(),
		userId: text("user_id").notNull(),
		postId: text("post_id")
			.notNull()
			.references(() => meadowPosts.id, { onDelete: "cascade" }),
		createdAt: integer("created_at").notNull(),
	},
	(table) => [uniqueIndex("idx_meadow_bookmarks_user_post").on(table.userId, table.postId)],
);

export const meadowFollows = sqliteTable(
	"meadow_follows",
	{
		id: text("id").primaryKey(),
		followerId: text("follower_id").notNull(),
		followedTenantId: text("followed_tenant_id")
			.notNull()
			.references(() => tenants.id, { onDelete: "cascade" }),
		createdAt: integer("created_at").notNull(),
	},
	(table) => [
		uniqueIndex("idx_meadow_follows_unique").on(table.followerId, table.followedTenantId),
	],
);

export const meadowReports = sqliteTable("meadow_reports", {
	id: text("id").primaryKey(),
	userId: text("user_id").notNull(),
	postId: text("post_id")
		.notNull()
		.references(() => meadowPosts.id, { onDelete: "cascade" }),
	reason: text("reason").notNull(),
	details: text("details"),
	status: text("status", { enum: ["pending", "reviewed", "actioned", "dismissed"] })
		.notNull()
		.default("pending"),
	createdAt: integer("created_at").notNull(),
	reviewedAt: integer("reviewed_at"),
	reviewedBy: text("reviewed_by"),
});

// ─────────────────────────────────────────────────────────────────────────────
// SOCIAL: Reeds (Comments)
// ─────────────────────────────────────────────────────────────────────────────

export const comments = sqliteTable("comments", {
	id: text("id").primaryKey(),
	tenantId: text("tenant_id")
		.notNull()
		.references(() => tenants.id, { onDelete: "cascade" }),
	postId: text("post_id")
		.notNull()
		.references(() => posts.id, { onDelete: "cascade" }),
	authorId: text("author_id").notNull(),
	authorName: text("author_name").notNull().default(""),
	authorEmail: text("author_email").notNull().default(""),
	parentId: text("parent_id"),
	content: text("content").notNull(),
	contentHtml: text("content_html"),
	isPublic: integer("is_public").notNull().default(1),
	status: text("status").notNull().default("pending"),
	moderationNote: text("moderation_note"),
	moderatedAt: text("moderated_at"),
	moderatedBy: text("moderated_by"),
	createdAt: text("created_at")
		.notNull()
		.default(sql`(datetime('now'))`),
	updatedAt: text("updated_at")
		.notNull()
		.default(sql`(datetime('now'))`),
	editedAt: text("edited_at"),
});

export const commentRateLimits = sqliteTable(
	"comment_rate_limits",
	{
		userId: text("user_id").notNull(),
		limitType: text("limit_type").notNull(),
		periodStart: text("period_start").notNull(),
		count: integer("count").notNull().default(0),
	},
	(table) => [
		// Composite primary key via unique index (SQLite)
		uniqueIndex("idx_comment_rate_limits_pk").on(table.userId, table.limitType),
	],
);

export const blockedCommenters = sqliteTable(
	"blocked_commenters",
	{
		tenantId: text("tenant_id")
			.notNull()
			.references(() => tenants.id, { onDelete: "cascade" }),
		blockedUserId: text("blocked_user_id").notNull(),
		reason: text("reason"),
		createdAt: text("created_at")
			.notNull()
			.default(sql`(datetime('now'))`),
	},
	(table) => [uniqueIndex("idx_blocked_commenters_pk").on(table.tenantId, table.blockedUserId)],
);

export const commentSettings = sqliteTable("comment_settings", {
	tenantId: text("tenant_id")
		.primaryKey()
		.references(() => tenants.id, { onDelete: "cascade" }),
	commentsEnabled: integer("comments_enabled").default(1),
	publicCommentsEnabled: integer("public_comments_enabled").default(1),
	whoCanComment: text("who_can_comment").default("anyone"),
	showCommentCount: integer("show_comment_count").default(1),
	notifyOnReply: integer("notify_on_reply").default(1),
	notifyOnPending: integer("notify_on_pending").default(1),
	notifyOnThreadReply: integer("notify_on_thread_reply").default(1),
	updatedAt: text("updated_at").default(sql`(datetime('now'))`),
});

// ─────────────────────────────────────────────────────────────────────────────
// SOCIAL: Trace Feedback
// ─────────────────────────────────────────────────────────────────────────────

export const traceFeedback = sqliteTable("trace_feedback", {
	id: text("id").primaryKey(),
	sourcePath: text("source_path").notNull(),
	vote: text("vote", { enum: ["up", "down"] }).notNull(),
	comment: text("comment"),
	ipHash: text("ip_hash").notNull(),
	userAgent: text("user_agent"),
	createdAt: integer("created_at").default(sql`(unixepoch())`),
	readAt: integer("read_at"),
	archivedAt: integer("archived_at"),
});
