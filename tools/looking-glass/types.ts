// ─── Content Blocks ─────────────────────────────────────────────────────────

export interface ClaudeTextBlock {
	type: "text";
	text: string;
}

export interface ClaudeThinkingBlock {
	type: "thinking";
	thinking: string;
}

export interface ClaudeToolUseBlock {
	type: "tool_use";
	id: string;
	name: string;
	input: Record<string, unknown>;
}

export interface ClaudeToolResultBlock {
	type: "tool_result";
	tool_use_id?: string;
	content: string | ClaudeContentBlock[];
	is_error?: boolean;
}

export interface ClaudeImageBlock {
	type: "image";
	source: { media_type: string; data: string };
}

export type ClaudeContentBlock =
	| ClaudeTextBlock
	| ClaudeThinkingBlock
	| ClaudeToolUseBlock
	| ClaudeToolResultBlock
	| ClaudeImageBlock;

export interface ClaudeParsedMessage {
	type: "user" | "assistant";
	timestamp: string;
	content: ClaudeContentBlock[];
	isCompactSummary?: boolean;
	isToolResultOnly?: boolean;
}

export interface ClaudeParsedSession {
	messages: ClaudeParsedMessage[];
	githubRepo: string | null;
}

// ─── Session Metadata ───────────────────────────────────────────────────────

export interface SessionMeta {
	sessionId: string;
	project: string;
	projectDir: string;
	filePath: string;
	slug?: string;
	messageCount: number;
	toolCallCount: number;
	createdAt?: Date;
	gitBranch?: string;
	version?: string;
	fileSize: number;
}
