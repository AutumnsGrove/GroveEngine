/**
 * Reeds Comment Service — Re-export Barrel
 *
 * This file re-exports from the reeds/ module for backward compatibility.
 * Prefer importing directly from the focused modules:
 *   - reeds/types.ts         — CommentRecord, CommentSettingsRecord, etc.
 *   - reeds/queries.ts       — reads, threading, settings lookup
 *   - reeds/mutations.ts     — create, edit, delete, moderate, settings upsert
 *   - reeds/blocked.ts       — user blocking (raw D1, cross-tenant)
 *   - reeds/rate-limiting.ts — comment rate limiting (raw D1, cross-tenant)
 */

export {
	// Types
	type CommentRecord,
	type CommentSettingsRecord,
	type ThreadedComment,
	type BlockedCommenterRecord,
	// Queries
	getCommentSettings,
	getApprovedComments,
	getPrivateReplies,
	getPendingComments,
	getPendingCount,
	getModeratedComments,
	getAllPrivateReplies,
	getCommentCount,
	getCommentById,
	buildCommentTree,
	// Mutations
	stripControlChars,
	createComment,
	isWithinEditWindow,
	editComment,
	deleteComment,
	moderateComment,
	upsertCommentSettings,
	// Blocked Users
	isUserBlocked,
	blockCommenter,
	unblockCommenter,
	getBlockedCommenters,
	// Rate Limiting
	checkCommentRateLimit,
} from "./reeds/index.js";
