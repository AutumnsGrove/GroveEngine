/**
 * Claude Code JSONL session parser.
 *
 * Reads ~/.claude/projects/ JSONL files and preserves the full content block
 * structure (text, tool_use, tool_result, thinking, image) instead of
 * flattening to plain text. Ported from simonw/claude-code-transcripts.
 */

import { readFileSync } from "fs";
import type { ClaudeContentBlock, ClaudeParsedMessage, ClaudeParsedSession } from "./types.ts";

// Git commit output: [branch hash] message
const COMMIT_PATTERN = /\[[\w\-/]+ ([a-f0-9]{7,})\] (.+?)(?:\n|$)/g;

// GitHub repo from git push output
const GITHUB_REPO_PATTERN = /github\.com\/([a-zA-Z0-9_-]+\/[a-zA-Z0-9_-]+)\/pull\/new\//;

// ─── Parse ───────────────────────────────────────────────────────────────────

export function parseClaudeJsonl(filePath: string): ClaudeParsedSession {
	const raw = readFileSync(filePath, "utf8");
	const lines = raw.split("\n").filter(Boolean);
	const messages: ClaudeParsedMessage[] = [];

	for (const line of lines) {
		try {
			const obj = JSON.parse(line) as Record<string, unknown>;
			const entryType = obj.type as string;

			if (entryType !== "user" && entryType !== "assistant") continue;

			const msg = obj.message as Record<string, unknown> | undefined;
			if (!msg) continue;

			const rawContent = msg.content;
			const content = normalizeContent(rawContent);
			if (content.length === 0) continue;

			const isToolResultOnly = content.every((b) => b.type === "tool_result");

			messages.push({
				type: entryType as "user" | "assistant",
				timestamp: (obj.timestamp as string) ?? "",
				content,
				isCompactSummary: !!obj.isCompactSummary,
				isToolResultOnly,
			});
		} catch {
			// Skip malformed lines
		}
	}

	const githubRepo = detectGithubRepo(messages);
	return { messages, githubRepo };
}

/**
 * Parse only new lines from a JSONL file starting at a byte offset.
 * Returns the new messages and the updated byte offset.
 */
export function parseClaudeJsonlIncremental(
	filePath: string,
	byteOffset: number,
): { messages: ClaudeParsedMessage[]; newOffset: number } {
	const raw = readFileSync(filePath, "utf8");
	const bytes = Buffer.byteLength(raw, "utf8");

	if (bytes <= byteOffset) {
		return { messages: [], newOffset: byteOffset };
	}

	const newContent = Buffer.from(raw, "utf8").subarray(byteOffset).toString("utf8");
	const lines = newContent.split("\n").filter(Boolean);
	const messages: ClaudeParsedMessage[] = [];

	for (const line of lines) {
		try {
			const obj = JSON.parse(line) as Record<string, unknown>;
			const entryType = obj.type as string;

			if (entryType !== "user" && entryType !== "assistant") continue;

			const msg = obj.message as Record<string, unknown> | undefined;
			if (!msg) continue;

			const rawContent = msg.content;
			const content = normalizeContent(rawContent);
			if (content.length === 0) continue;

			messages.push({
				type: entryType as "user" | "assistant",
				timestamp: (obj.timestamp as string) ?? "",
				content,
				isCompactSummary: !!obj.isCompactSummary,
				isToolResultOnly: content.every((b) => b.type === "tool_result"),
			});
		} catch {
			// Skip malformed lines
		}
	}

	return { messages, newOffset: bytes };
}

// ─── Content Normalization ───────────────────────────────────────────────────

function normalizeContent(raw: unknown): ClaudeContentBlock[] {
	if (typeof raw === "string") {
		return raw.trim() ? [{ type: "text" as const, text: raw }] : [];
	}

	if (!Array.isArray(raw)) return [];

	const blocks: ClaudeContentBlock[] = [];
	for (const item of raw) {
		if (!item || typeof item !== "object") continue;
		const block = item as Record<string, unknown>;
		const blockType = block.type as string;

		switch (blockType) {
			case "text":
				if (typeof block.text === "string" && block.text.trim()) {
					blocks.push({ type: "text", text: block.text });
				}
				break;

			case "thinking":
				if (typeof block.thinking === "string" && block.thinking.trim()) {
					blocks.push({ type: "thinking", thinking: block.thinking });
				} else if (block.signature) {
					// Redacted thinking — content hidden but thinking occurred
					blocks.push({ type: "thinking", thinking: "" });
				}
				break;

			case "tool_use":
				blocks.push({
					type: "tool_use",
					id: (block.id as string) ?? "",
					name: (block.name as string) ?? "Unknown",
					input: (block.input as Record<string, unknown>) ?? {},
				});
				break;

			case "tool_result":
				blocks.push({
					type: "tool_result",
					tool_use_id: block.tool_use_id as string | undefined,
					content: block.content as string | ClaudeContentBlock[],
					is_error: !!block.is_error,
				});
				break;

			case "image":
				if (block.source && typeof block.source === "object") {
					const src = block.source as Record<string, unknown>;
					blocks.push({
						type: "image",
						source: {
							media_type: (src.media_type as string) ?? "image/png",
							data: (src.data as string) ?? "",
						},
					});
				}
				break;
		}
	}

	return blocks;
}

// ─── GitHub Repo Detection ───────────────────────────────────────────────────

function detectGithubRepo(messages: ClaudeParsedMessage[]): string | null {
	for (const msg of messages) {
		for (const block of msg.content) {
			if (block.type === "tool_result") {
				const content = block.content;
				if (typeof content === "string") {
					const match = GITHUB_REPO_PATTERN.exec(content);
					if (match) return match[1];
				}
			}
		}
	}
	return null;
}

// ─── Commit Detection ────────────────────────────────────────────────────────

export interface CommitInfo {
	hash: string;
	message: string;
}

export function findCommitsInText(text: string): CommitInfo[] {
	const commits: CommitInfo[] = [];
	COMMIT_PATTERN.lastIndex = 0;
	let match: RegExpExecArray | null;
	while ((match = COMMIT_PATTERN.exec(text)) !== null) {
		commits.push({ hash: match[1], message: match[2] });
	}
	return commits;
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

export function extractTextFromContent(blocks: ClaudeContentBlock[]): string {
	return blocks
		.filter((b): b is { type: "text"; text: string } => b.type === "text")
		.map((b) => b.text)
		.join(" ")
		.trim();
}
