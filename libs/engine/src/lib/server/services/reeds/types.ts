export interface CommentRecord {
	id: string;
	tenant_id: string;
	post_id: string;
	author_id: string;
	author_name: string;
	author_email: string;
	parent_id: string | null;
	content: string;
	content_html: string | null;
	is_public: number;
	status: string;
	moderation_note: string | null;
	moderated_at: string | null;
	moderated_by: string | null;
	created_at: string;
	updated_at: string;
	edited_at: string | null;
}

export interface CommentSettingsRecord {
	tenant_id: string;
	comments_enabled: number;
	public_comments_enabled: number;
	who_can_comment: string;
	show_comment_count: number;
	notify_on_reply: number;
	notify_on_pending: number;
	notify_on_thread_reply: number;
	updated_at: string;
}

export interface ThreadedComment extends CommentRecord {
	replies: ThreadedComment[];
	depth: number;
}

export interface BlockedCommenterRecord {
	blocked_user_id: string;
	reason: string | null;
	created_at: string;
}
