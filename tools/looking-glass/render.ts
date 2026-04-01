/**
 * Looking Glass — HTML renderer for Claude Code sessions.
 *
 * Extracted from Cairn's claude-render.ts with one major enhancement:
 * tool-use / tool-result pairing. Instead of rendering tool calls and their
 * results as disconnected bubbles, `renderPairedMessages` matches each
 * `tool_use` block with its corresponding `tool_result` from the next
 * message(s) and renders them together in a single visual unit.
 *
 * Structural CSS classes use the `lg-` prefix (looking-glass).
 * Inner tool renderers keep the proven `claude-` prefix for style continuity.
 */

import { renderMarkdown, escapeHtml } from "./markdown.ts";
import type {
	ClaudeContentBlock,
	ClaudeParsedMessage,
	ClaudeToolUseBlock,
	ClaudeToolResultBlock,
} from "./types.ts";
import { findCommitsInText } from "./parse.ts";

// ─── Paired Message Renderer ────────────────────────────────────────────────

/**
 * Render all messages with tool-use/tool-result pairing.
 * Tool calls and their results appear together instead of as disconnected bubbles.
 */
export function renderPairedMessages(
	messages: ClaudeParsedMessage[],
	githubRepo: string | null,
): string {
	const parts: string[] = [];
	const consumed = new Set<number>(); // indices of consumed tool-result-only messages

	for (let i = 0; i < messages.length; i++) {
		if (consumed.has(i)) continue;
		const msg = messages[i];

		if (msg.type === "assistant") {
			// Collect tool_use IDs from this message
			const toolUseIds = new Set<string>();
			for (const block of msg.content) {
				if (block.type === "tool_use") toolUseIds.add(block.id);
			}

			// Look ahead for tool-result-only messages
			const resultMap = new Map<string, ClaudeToolResultBlock>();
			if (toolUseIds.size > 0) {
				for (let j = i + 1; j < messages.length; j++) {
					const next = messages[j];
					if (!next.isToolResultOnly) break;
					for (const block of next.content) {
						if (block.type === "tool_result" && block.tool_use_id) {
							resultMap.set(block.tool_use_id, block);
						}
					}
					consumed.add(j);
				}
			}

			parts.push(renderAssistantMessage(msg, resultMap, githubRepo));
		} else {
			// Regular user message (not tool-result-only, or unmatched)
			parts.push(renderUserMessage(msg, githubRepo));
		}
	}

	return parts.join("");
}

// ─── Single-Message Renderer (SSE / live stream path) ───────────────────────

/**
 * Render a single message without pairing context.
 * Used by the SSE live stream where messages arrive one at a time.
 */
export function renderClaudeMessage(msg: ClaudeParsedMessage, githubRepo: string | null): string {
	if (msg.type === "assistant") {
		return renderAssistantMessage(msg, new Map(), githubRepo);
	}
	return renderUserMessage(msg, githubRepo);
}

// ─── Message-Level Renderers ────────────────────────────────────────────────

function renderAssistantMessage(
	msg: ClaudeParsedMessage,
	resultMap: Map<string, ClaudeToolResultBlock>,
	githubRepo: string | null,
): string {
	const contentParts: string[] = [];

	for (const block of msg.content) {
		if (block.type === "tool_use") {
			const result = resultMap.get(block.id);
			if (result) {
				// Paired: tool call + result together
				contentParts.push(
					`<div class="lg-tool-pair">${renderToolUse(block)}${renderToolResult(result, githubRepo)}</div>`,
				);
			} else {
				// No result yet (maybe still running)
				contentParts.push(renderToolUse(block));
			}
		} else {
			contentParts.push(renderContentBlock(block, githubRepo));
		}
	}

	const contentHtml = contentParts.join("");
	if (!contentHtml.trim()) return "";

	return messageShell("lg-msg-assistant", "Assistant", msg, contentHtml);
}

function renderUserMessage(msg: ClaudeParsedMessage, githubRepo: string | null): string {
	// If it's tool-result-only and wasn't consumed, render as tool reply
	if (msg.isToolResultOnly) {
		const contentHtml = msg.content.map((block) => renderContentBlock(block, githubRepo)).join("");
		if (!contentHtml.trim()) return "";
		return messageShell("lg-msg-tool-reply", "Tool Reply", msg, contentHtml);
	}

	const contentHtml = msg.content.map((block) => renderContentBlock(block, githubRepo)).join("");
	if (!contentHtml.trim()) return "";
	return messageShell("lg-msg-user", "User", msg, contentHtml);
}

// ─── Message Shell ──────────────────────────────────────────────────────────

function messageShell(
	roleClass: string,
	roleLabel: string,
	msg: ClaudeParsedMessage,
	contentHtml: string,
): string {
	const msgId = `msg-${msg.timestamp.replace(/[:.]/g, "-")}`;
	const wrapper = msg.isCompactSummary
		? `<details class="claude-continuation"><summary>Session continuation summary</summary>${shell(roleClass, roleLabel, msgId, msg.timestamp, contentHtml)}</details>`
		: shell(roleClass, roleLabel, msgId, msg.timestamp, contentHtml);
	return wrapper;
}

function shell(
	roleClass: string,
	roleLabel: string,
	msgId: string,
	timestamp: string,
	contentHtml: string,
): string {
	return `<div class="claude-msg ${roleClass}" id="${msgId}">
	<div class="claude-msg-header">
		<span class="claude-role-label">${roleLabel}</span>
		<a href="#${msgId}" class="claude-timestamp-link"><time datetime="${escapeHtml(timestamp)}" data-timestamp="${escapeHtml(timestamp)}">${escapeHtml(timestamp)}</time></a>
	</div>
	<div class="claude-msg-content">${contentHtml}</div>
</div>`;
}

// ─── Content Block Dispatch ─────────────────────────────────────────────────

export function renderContentBlock(block: ClaudeContentBlock, githubRepo: string | null): string {
	switch (block.type) {
		case "text":
			return renderAssistantText(block.text);
		case "thinking":
			return renderThinkingBlock(block.thinking);
		case "tool_use":
			return renderToolUse(block);
		case "tool_result":
			return renderToolResult(block, githubRepo);
		case "image":
			return renderImageBlock(block.source.media_type, block.source.data);
		default:
			return `<pre class="claude-json">${escapeHtml(JSON.stringify(block, null, 2))}</pre>`;
	}
}

// ─── Text & Thinking ────────────────────────────────────────────────────────

function renderAssistantText(text: string): string {
	if (!text.trim()) return "";
	const html = renderMarkdown(text);
	return `<div class="claude-assistant-text">${html}</div>`;
}

function renderThinkingBlock(thinking: string): string {
	if (!thinking.trim()) {
		// Redacted or empty extended thinking — show subtle indicator
		return `<div class="lg-thinking-redacted"><span class="lg-thinking-icon">\u{1F4AD}</span> Extended thinking</div>`;
	}
	const html = renderMarkdown(thinking);
	return `<details class="claude-thinking">
	<summary class="claude-thinking-label">Thinking</summary>
	${html}
</details>`;
}

// ─── Tool Use Dispatch ──────────────────────────────────────────────────────

function renderToolUse(block: ClaudeToolUseBlock): string {
	const { name, input, id } = block;

	switch (name) {
		case "Edit":
			return renderEditTool(input, id);
		case "Write":
			return renderWriteTool(input, id);
		case "Bash":
		case "BashOutput":
			return renderBashTool(input, id);
		case "TodoWrite":
			return renderTodoWrite(input, id);
		case "Read":
			return renderReadTool(input, id);
		case "Glob":
			return renderGlobTool(input, id);
		case "Grep":
			return renderGrepTool(input, id);
		case "Agent":
			return renderAgentTool(input, id);
		default:
			return renderGenericTool(name, input, id);
	}
}

// ─── Edit Tool ──────────────────────────────────────────────────────────────

function renderEditTool(input: Record<string, unknown>, toolId: string): string {
	const filePath = (input.file_path as string) ?? "Unknown file";
	const oldString = (input.old_string as string) ?? "";
	const newString = (input.new_string as string) ?? "";
	const replaceAll = !!input.replace_all;
	const fileName = filePath.split("/").pop() ?? filePath;

	return `<div class="claude-file-tool claude-edit-tool" data-tool-id="${escapeHtml(toolId)}">
	<div class="claude-file-header claude-edit-header">
		<span class="claude-file-icon">\u270F\uFE0F</span> Edit
		<span class="claude-file-path">${escapeHtml(fileName)}</span>
		${replaceAll ? '<span class="claude-edit-replace-all">(replace all)</span>' : ""}
	</div>
	<div class="claude-file-fullpath">${escapeHtml(filePath)}</div>
	${truncatable(`
		<div class="claude-edit-section claude-edit-old">
			<div class="claude-edit-label">\u2212</div>
			<pre class="claude-edit-content">${escapeHtml(oldString)}</pre>
		</div>
		<div class="claude-edit-section claude-edit-new">
			<div class="claude-edit-label">+</div>
			<pre class="claude-edit-content">${escapeHtml(newString)}</pre>
		</div>
	`)}
</div>`;
}

// ─── Write Tool ─────────────────────────────────────────────────────────────

function renderWriteTool(input: Record<string, unknown>, toolId: string): string {
	const filePath = (input.file_path as string) ?? "Unknown file";
	const content = (input.content as string) ?? "";
	const fileName = filePath.split("/").pop() ?? filePath;

	return `<div class="claude-file-tool claude-write-tool" data-tool-id="${escapeHtml(toolId)}">
	<div class="claude-file-header claude-write-header">
		<span class="claude-file-icon">\u{1F4DD}</span> Write
		<span class="claude-file-path">${escapeHtml(fileName)}</span>
	</div>
	<div class="claude-file-fullpath">${escapeHtml(filePath)}</div>
	${truncatable(`<pre class="claude-file-content">${escapeHtml(content)}</pre>`)}
</div>`;
}

// ─── Bash Tool ──────────────────────────────────────────────────────────────

function renderBashTool(input: Record<string, unknown>, toolId: string): string {
	const command = (input.command as string) ?? "";
	const description = (input.description as string) ?? "";

	return `<div class="claude-tool-use claude-bash-tool" data-tool-id="${escapeHtml(toolId)}">
	<div class="claude-tool-header"><span class="claude-tool-icon">$</span> Bash</div>
	${description ? `<div class="claude-tool-description">${escapeHtml(description)}</div>` : ""}
	${truncatable(`<pre class="claude-bash-command">${escapeHtml(command)}</pre>`)}
</div>`;
}

// ─── Read Tool ──────────────────────────────────────────────────────────────

function renderReadTool(input: Record<string, unknown>, toolId: string): string {
	const filePath = (input.file_path as string) ?? "";
	const fileName = filePath.split("/").pop() ?? filePath;
	const offset = input.offset as number | undefined;
	const limit = input.limit as number | undefined;
	const range =
		offset || limit
			? ` <span class="claude-read-range">${offset ? `offset:${offset}` : ""}${offset && limit ? " " : ""}${limit ? `limit:${limit}` : ""}</span>`
			: "";

	return `<div class="claude-tool-use claude-read-tool" data-tool-id="${escapeHtml(toolId)}">
	<div class="claude-tool-header"><span class="claude-tool-icon">\u{1F4D6}</span> Read <span class="claude-file-path">${escapeHtml(fileName)}</span>${range}</div>
	<div class="claude-file-fullpath">${escapeHtml(filePath)}</div>
</div>`;
}

// ─── Glob Tool ──────────────────────────────────────────────────────────────

function renderGlobTool(input: Record<string, unknown>, toolId: string): string {
	const pattern = (input.pattern as string) ?? "";
	const path = (input.path as string) ?? "";

	return `<div class="claude-tool-use" data-tool-id="${escapeHtml(toolId)}">
	<div class="claude-tool-header"><span class="claude-tool-icon">\u{1F50D}</span> Glob</div>
	<pre class="claude-bash-command">${escapeHtml(pattern)}${path ? `  in ${escapeHtml(path)}` : ""}</pre>
</div>`;
}

// ─── Grep Tool ──────────────────────────────────────────────────────────────

function renderGrepTool(input: Record<string, unknown>, toolId: string): string {
	const pattern = (input.pattern as string) ?? "";
	const path = (input.path as string) ?? "";
	const glob = (input.glob as string) ?? "";

	return `<div class="claude-tool-use" data-tool-id="${escapeHtml(toolId)}">
	<div class="claude-tool-header"><span class="claude-tool-icon">\u{1F50E}</span> Grep</div>
	<pre class="claude-bash-command">${escapeHtml(pattern)}${path ? `  in ${escapeHtml(path)}` : ""}${glob ? `  (${escapeHtml(glob)})` : ""}</pre>
</div>`;
}

// ─── Agent Tool ─────────────────────────────────────────────────────────────

function renderAgentTool(input: Record<string, unknown>, toolId: string): string {
	const description = (input.description as string) ?? "";
	const subagentType = (input.subagent_type as string) ?? "";
	const prompt = (input.prompt as string) ?? "";

	return `<div class="claude-tool-use claude-agent-tool" data-tool-id="${escapeHtml(toolId)}">
	<div class="claude-tool-header"><span class="claude-tool-icon">\u{1F916}</span> Agent${subagentType ? ` <span class="claude-agent-type">${escapeHtml(subagentType)}</span>` : ""}</div>
	${description ? `<div class="claude-tool-description">${escapeHtml(description)}</div>` : ""}
	${prompt ? truncatable(`<pre class="claude-agent-prompt">${escapeHtml(prompt)}</pre>`) : ""}
</div>`;
}

// ─── TodoWrite Tool ─────────────────────────────────────────────────────────

function renderTodoWrite(input: Record<string, unknown>, toolId: string): string {
	const todos = (input.todos as Array<Record<string, unknown>>) ?? [];
	if (todos.length === 0) return "";

	const items = todos
		.map((todo) => {
			const status = (todo.status as string) ?? "pending";
			const content = (todo.content as string) ?? "";
			let icon: string;
			let statusClass: string;

			switch (status) {
				case "completed":
					icon = "\u2713";
					statusClass = "claude-todo-completed";
					break;
				case "in_progress":
					icon = "\u2192";
					statusClass = "claude-todo-in-progress";
					break;
				default:
					icon = "\u25CB";
					statusClass = "claude-todo-pending";
					break;
			}

			return `<li class="claude-todo-item ${statusClass}"><span class="claude-todo-icon">${icon}</span><span class="claude-todo-content">${escapeHtml(content)}</span></li>`;
		})
		.join("");

	return `<div class="claude-todo-list" data-tool-id="${escapeHtml(toolId)}">
	<div class="claude-todo-header"><span class="claude-todo-header-icon">\u2630</span> Task List</div>
	<ul class="claude-todo-items">${items}</ul>
</div>`;
}

// ─── Generic Tool ───────────────────────────────────────────────────────────

function renderGenericTool(name: string, input: Record<string, unknown>, toolId: string): string {
	const description = (input.description as string) ?? "";
	const displayInput = { ...input };
	delete displayInput.description;

	const inputJson = JSON.stringify(displayInput, null, 2);

	return `<div class="claude-tool-use" data-tool-id="${escapeHtml(toolId)}">
	<div class="claude-tool-header"><span class="claude-tool-icon">\u2699</span> ${escapeHtml(name)}</div>
	${description ? `<div class="claude-tool-description">${escapeHtml(description)}</div>` : ""}
	${truncatable(`<pre class="claude-json">${escapeHtml(inputJson)}</pre>`)}
</div>`;
}

// ─── Tool Result ────────────────────────────────────────────────────────────

function renderToolResult(block: ClaudeToolResultBlock, githubRepo: string | null): string {
	const { content, is_error } = block;
	const errorClass = is_error ? " claude-tool-error" : "";
	let hasImages = false;
	let contentHtml: string;

	if (typeof content === "string") {
		// Check for git commits
		const commits = findCommitsInText(content);
		if (commits.length > 0) {
			const parts: string[] = [];
			let lastEnd = 0;
			// Re-run pattern to get positions
			const pattern = /\[[\w\-/]+ ([a-f0-9]{7,})\] (.+?)(?:\n|$)/g;
			let match: RegExpExecArray | null;
			while ((match = pattern.exec(content)) !== null) {
				const before = content.slice(lastEnd, match.index).trim();
				if (before) parts.push(`<pre>${escapeHtml(before)}</pre>`);
				parts.push(renderCommitCard(match[1], match[2], githubRepo));
				lastEnd = match.index + match[0].length;
			}
			const after = content.slice(lastEnd).trim();
			if (after) parts.push(`<pre>${escapeHtml(after)}</pre>`);
			contentHtml = parts.join("");
		} else {
			contentHtml = `<pre>${escapeHtml(content)}</pre>`;
		}
	} else if (Array.isArray(content)) {
		const parts: string[] = [];
		for (const item of content) {
			if (item && typeof item === "object" && "type" in item) {
				const typed = item as Record<string, unknown>;
				if (typed.type === "text" && typeof typed.text === "string") {
					parts.push(`<pre>${escapeHtml(typed.text)}</pre>`);
				} else if (typed.type === "image") {
					const src = typed.source as Record<string, unknown>;
					parts.push(
						renderImageBlock(
							(src?.media_type as string) ?? "image/png",
							(src?.data as string) ?? "",
						),
					);
					hasImages = true;
				} else {
					parts.push(
						`<pre class="claude-json">${escapeHtml(JSON.stringify(typed, null, 2))}</pre>`,
					);
				}
			}
		}
		contentHtml = parts.join("");
	} else {
		contentHtml = `<pre class="claude-json">${escapeHtml(JSON.stringify(content, null, 2))}</pre>`;
	}

	if (hasImages) {
		return `<div class="claude-tool-result${errorClass}">${contentHtml}</div>`;
	}

	return `<div class="claude-tool-result${errorClass}">${truncatable(contentHtml)}</div>`;
}

// ─── Image Block ────────────────────────────────────────────────────────────

function renderImageBlock(mediaType: string, data: string): string {
	// Validate base64 data contains only safe characters to prevent attribute injection
	const safeData = data.replace(/[^A-Za-z0-9+/=\n\r]/g, "");
	return `<div class="claude-image-block"><img src="data:${escapeHtml(mediaType)};base64,${safeData}" style="max-width:100%;border-radius:6px;" loading="lazy"></div>`;
}

// ─── Commit Card ────────────────────────────────────────────────────────────

function renderCommitCard(hash: string, message: string, githubRepo: string | null): string {
	const shortHash = hash.slice(0, 7);
	if (githubRepo) {
		const link = `https://github.com/${githubRepo}/commit/${hash}`;
		return `<div class="claude-commit-card"><a href="${escapeHtml(link)}" target="_blank" rel="noopener"><span class="claude-commit-hash">${shortHash}</span> ${escapeHtml(message)}</a></div>`;
	}
	return `<div class="claude-commit-card"><span class="claude-commit-hash">${shortHash}</span> ${escapeHtml(message)}</div>`;
}

// ─── Truncation Wrapper ─────────────────────────────────────────────────────

function truncatable(innerHtml: string): string {
	return `<div class="claude-truncatable"><div class="claude-truncatable-content">${innerHtml}</div><button class="claude-expand-btn" type="button">Show more</button></div>`;
}

// ─── Client-Side JS ─────────────────────────────────────────────────────────

/**
 * Inline JavaScript for the session detail page.
 * Handles: timestamp formatting, JSON syntax coloring, truncation toggle.
 */
export const CLAUDE_VIEWER_JS = `
// -- Timestamp formatting --
function formatTimestamps(root) {
	(root || document).querySelectorAll('time[data-timestamp]').forEach(function(el) {
		var ts = el.getAttribute('data-timestamp');
		var date = new Date(ts);
		if (isNaN(date.getTime())) return;
		var now = new Date();
		var isToday = date.toDateString() === now.toDateString();
		var timeStr = date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit', second: '2-digit' });
		if (isToday) { el.textContent = timeStr; }
		else { el.textContent = date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }) + ' ' + timeStr; }
	});
}
formatTimestamps();

// -- JSON syntax coloring --
document.querySelectorAll('pre.claude-json').forEach(function(el) {
	// Re-escape textContent before inserting as innerHTML to prevent XSS
	// (textContent decodes entities, so raw <, >, & in values would be unescaped)
	var text = el.textContent;
	text = text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
	text = text.replace(/&quot;([^&]*?)&quot;:/g, '<span style="color:#ce93d8">&quot;$1&quot;</span>:');
	text = text.replace(/: &quot;([^&]*?)&quot;/g, ': <span style="color:#81d4fa">&quot;$1&quot;</span>');
	text = text.replace(/: (\\d+)/g, ': <span style="color:#ffcc80">$1</span>');
	text = text.replace(/: (true|false|null)/g, ': <span style="color:#f48fb1">$1</span>');
	el.innerHTML = text;
});

// -- Truncation toggle --
function initTruncation(root) {
	(root || document).querySelectorAll('.claude-truncatable').forEach(function(wrapper) {
		var content = wrapper.querySelector('.claude-truncatable-content');
		var btn = wrapper.querySelector('.claude-expand-btn');
		if (!content || !btn) return;
		if (content.scrollHeight > 250) {
			wrapper.classList.add('truncated');
			btn.addEventListener('click', function() {
				if (wrapper.classList.contains('truncated')) {
					wrapper.classList.remove('truncated');
					wrapper.classList.add('expanded');
					btn.textContent = 'Show less';
				} else {
					wrapper.classList.remove('expanded');
					wrapper.classList.add('truncated');
					btn.textContent = 'Show more';
				}
			});
		}
	});
}
initTruncation();
`;
