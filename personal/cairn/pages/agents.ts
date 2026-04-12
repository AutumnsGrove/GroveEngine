import { readFileSync } from "fs";
import type { CairnIndex } from "../index.ts";
import { loadCrushMessages } from "../index.ts";
import { escHtml, formatDate, emptyState } from "./layout.ts";
import type { CrushMessage } from "../types.ts";
import { parseClaudeJsonl } from "./claude-parse.ts";
import { renderClaudeMessage, CLAUDE_VIEWER_JS } from "./claude-render.ts";
import { getActiveSessionIds } from "./claude-live.ts";

// ─── Agent Dashboard ──────────────────────────────────────────────────────────

export function agentsDashboard(idx: CairnIndex): string {
	const { crushSessions, claudeSessions, stats } = idx;

	const crushTotal = crushSessions.reduce((s, c) => s + (c.cost ?? 0), 0);
	const crushPromptTokens = crushSessions.reduce((s, c) => s + (c.promptTokens ?? 0), 0);
	const crushCompletionTokens = crushSessions.reduce((s, c) => s + (c.completionTokens ?? 0), 0);

	// File heatmap: count files from Crush sessions
	// (We'd need per-session file data, but we can show session activity instead)
	const recentCrush = crushSessions.slice(0, 8);
	const recentClaude = claudeSessions.slice(0, 8);

	const crushRows = recentCrush
		.map(
			(s) => `
		<a href="/agents/crush/${escHtml(s.id)}" style="display:grid;grid-template-columns:1fr auto auto;gap:1rem;align-items:center;padding:0.65rem 0.9rem;background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:6px;text-decoration:none;margin-bottom:0.4rem;transition:border-color 0.15s;">
			<div>
				<div class="session-title">${escHtml(s.title)}</div>
				<div class="session-meta">${formatDate(s.updatedAt)}</div>
			</div>
			<span class="session-msgs">${s.messageCount} msgs</span>
			<span class="session-cost">$${(s.cost ?? 0).toFixed(2)}</span>
		</a>`,
		)
		.join("");

	const claudeRows = recentClaude
		.map(
			(s) => `
		<a href="/agents/claude/${escHtml(s.sessionId)}" style="display:grid;grid-template-columns:1fr auto auto;gap:1rem;align-items:center;padding:0.65rem 0.9rem;background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:6px;text-decoration:none;margin-bottom:0.4rem;transition:border-color 0.15s;">
			<div>
				<div class="session-title">${escHtml(s.slug ?? s.sessionId)}</div>
				<div class="session-meta">${s.gitBranch ? escHtml(s.gitBranch) + " · " : ""}${s.createdAt ? formatDate(s.createdAt) : ""}</div>
			</div>
			<span class="session-msgs">${s.messageCount} msgs</span>
			<span class="session-msgs" style="color:var(--text-muted);">${s.toolCallCount} tools</span>
		</a>`,
		)
		.join("");

	return `
<div class="page-header">
	<h1 class="page-title">🤖 Agent Activity</h1>
	<p class="page-subtitle">Every session, every decision, every stone on the pile.</p>
</div>

<!-- Summary stats -->
<div class="stats-grid mb-3">
	<div class="stat-card">
		<div class="stat-number">${crushSessions.length}</div>
		<div class="stat-label">Crush Sessions</div>
	</div>
	<div class="stat-card">
		<div class="stat-number">$${crushTotal.toFixed(2)}</div>
		<div class="stat-label">Total Crush Cost</div>
	</div>
	<div class="stat-card">
		<div class="stat-number">${(crushPromptTokens / 1000).toFixed(0)}k</div>
		<div class="stat-label">Prompt Tokens</div>
	</div>
	<div class="stat-card">
		<div class="stat-number">${(crushCompletionTokens / 1000).toFixed(0)}k</div>
		<div class="stat-label">Completion Tokens</div>
	</div>
	<div class="stat-card">
		<div class="stat-number">${claudeSessions.length}</div>
		<div class="stat-label">Claude Sessions</div>
	</div>
</div>

<div style="display:grid;grid-template-columns:1fr 1fr;gap:2rem;align-items:start;">
	<div>
		<div class="section-header mb-2">
			<span class="section-title">💬 Crush Sessions</span>
			<a href="/agents/crush" style="margin-left:auto;font-size:0.72rem;color:var(--text-muted);">all ${crushSessions.length} →</a>
		</div>
		${crushRows || emptyState("💬", "No Crush sessions found.")}
	</div>
	<div>
		<div class="section-header mb-2">
			<span class="section-title">📜 Claude Sessions</span>
			<a href="/agents/claude" style="margin-left:auto;font-size:0.72rem;color:var(--text-muted);">all ${claudeSessions.length} →</a>
		</div>
		${claudeRows || emptyState("📜", "No Claude sessions found.")}
	</div>
</div>
`;
}

// ─── Crush Session List ───────────────────────────────────────────────────────

export function crushSessionsPage(idx: CairnIndex): string {
	const { crushSessions } = idx;

	if (crushSessions.length === 0) {
		return emptyState("💬", "No Crush sessions found.");
	}

	const totalCost = crushSessions.reduce((s, c) => s + (c.cost ?? 0), 0);

	const rows = crushSessions
		.map(
			(s) => `
		<a href="/agents/crush/${escHtml(s.id)}" style="display:grid;grid-template-columns:1fr 80px 80px 80px;gap:1rem;align-items:center;padding:0.65rem 1rem;background:var(--glass-bg);border:1px solid var(--glass-border);border-radius:6px;text-decoration:none;margin-bottom:0.4rem;transition:border-color 0.15s;">
			<div>
				<div class="session-title">${escHtml(s.title)}</div>
				<div class="session-meta">${formatDate(s.updatedAt)}</div>
			</div>
			<span class="session-msgs" style="text-align:right;">${s.messageCount} msgs</span>
			<span class="session-msgs" style="text-align:right;color:var(--accent-blue);">${((s.promptTokens + s.completionTokens) / 1000).toFixed(1)}k tok</span>
			<span class="session-cost" style="text-align:right;">$${(s.cost ?? 0).toFixed(2)}</span>
		</a>`,
		)
		.join("");

	return `
<div class="page-header">
	<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;">
		<div>
			<h1 class="page-title">💬 Crush Sessions</h1>
			<p class="page-subtitle">${crushSessions.length} sessions · $${totalCost.toFixed(2)} total</p>
		</div>
		<a href="/agents" style="font-size:0.78rem;color:var(--text-secondary);">← Agents</a>
	</div>
</div>

<div style="display:grid;grid-template-columns:1fr 80px 80px 80px;gap:1rem;padding:0.4rem 1rem;font-size:0.68rem;font-weight:700;letter-spacing:0.06em;text-transform:uppercase;color:var(--text-muted);margin-bottom:0.25rem;">
	<span>Session</span>
	<span style="text-align:right;">Msgs</span>
	<span style="text-align:right;">Tokens</span>
	<span style="text-align:right;">Cost</span>
</div>

${rows}
`;
}

// ─── Crush Session Detail ─────────────────────────────────────────────────────

export function crushSessionDetailPage(idx: CairnIndex, sessionId: string): string | null {
	const session = idx.crushSessions.find((s) => s.id === sessionId);
	if (!session) return null;

	const messages = loadCrushMessages(sessionId);

	const messagesHtml =
		messages.length === 0
			? `<p style="color:var(--text-muted);font-style:italic;">No messages found.</p>`
			: messages.map((m) => renderCrushMessage(m)).join("");

	return `
<div class="breadcrumb">
	<a href="/">Cairn</a><span class="sep">/</span>
	<a href="/agents">Agents</a><span class="sep">/</span>
	<a href="/agents/crush">Crush</a><span class="sep">/</span>
	<span>${escHtml(session.title)}</span>
</div>

<div style="display:grid;grid-template-columns:1fr 240px;gap:2rem;align-items:start;">
	<div>
		<div class="doc-frontmatter" style="margin-bottom:1.5rem;">
			<div class="doc-frontmatter-title">💬 ${escHtml(session.title)}</div>
			<div class="doc-frontmatter-meta">
				<span class="tag">${session.messageCount} messages</span>
				<span class="tag tag-green">$${(session.cost ?? 0).toFixed(2)}</span>
				<span class="tag tag-blue">${((session.promptTokens + session.completionTokens) / 1000).toFixed(1)}k tokens</span>
				<span style="color:var(--text-muted);font-size:0.72rem;">${formatDate(session.createdAt)}</span>
			</div>
		</div>

		<div style="display:flex;flex-direction:column;gap:0.75rem;">
			${messagesHtml}
		</div>
	</div>

	<!-- Sidebar stats -->
	<div class="doc-toc">
		<div class="toc-title">Session Info</div>
		<div style="display:flex;flex-direction:column;gap:0.5rem;margin-top:0.5rem;">
			<div style="font-size:0.75rem;">
				<div style="color:var(--text-muted);font-size:0.68rem;margin-bottom:0.1rem;">Cost</div>
				<div style="color:var(--accent-green);font-family:var(--font-mono);">$${(session.cost ?? 0).toFixed(4)}</div>
			</div>
			<div style="font-size:0.75rem;">
				<div style="color:var(--text-muted);font-size:0.68rem;margin-bottom:0.1rem;">Prompt Tokens</div>
				<div style="font-family:var(--font-mono);">${session.promptTokens.toLocaleString()}</div>
			</div>
			<div style="font-size:0.75rem;">
				<div style="color:var(--text-muted);font-size:0.68rem;margin-bottom:0.1rem;">Completion Tokens</div>
				<div style="font-family:var(--font-mono);">${session.completionTokens.toLocaleString()}</div>
			</div>
			<div style="font-size:0.75rem;">
				<div style="color:var(--text-muted);font-size:0.68rem;margin-bottom:0.1rem;">Created</div>
				<div>${formatDate(session.createdAt)}</div>
			</div>
			<div style="font-size:0.75rem;">
				<div style="color:var(--text-muted);font-size:0.68rem;margin-bottom:0.1rem;">Updated</div>
				<div>${formatDate(session.updatedAt)}</div>
			</div>
		</div>
	</div>
</div>
`;
}

function renderCrushMessage(m: CrushMessage): string {
	const isUser = m.role === "user";
	const bgColor = isUser ? "rgba(122, 158, 196, 0.08)" : "rgba(255, 255, 255, 0.03)";
	const borderColor = isUser ? "rgba(122, 158, 196, 0.2)" : "var(--glass-border)";
	const roleLabel = isUser ? "You" : (m.model ?? m.provider ?? "Crush");

	// Extract text from parts
	let text = "";
	if (Array.isArray(m.parts)) {
		for (const part of m.parts) {
			if (typeof part === "string") {
				text += part;
			} else if (part && typeof part === "object") {
				const p = part as Record<string, unknown>;
				if (p.type === "text" && typeof p.text === "string") {
					text += p.text;
				} else if (p.type === "tool_use") {
					text += `\n\`[tool: ${p.name}]\`\n`;
				} else if (p.type === "tool_result") {
					text += `\n\`[tool result]\`\n`;
				}
			}
		}
	}

	const truncated = text.length > 2000 ? text.slice(0, 2000) + "\n\n*[truncated…]*" : text;
	const escaped = escHtml(truncated);

	return `
<div style="background:${bgColor};border:1px solid ${borderColor};border-radius:8px;padding:0.9rem 1rem;">
	<div style="display:flex;align-items:center;gap:0.5rem;margin-bottom:0.5rem;">
		<span style="font-size:0.7rem;font-weight:700;text-transform:uppercase;letter-spacing:0.08em;color:${isUser ? "var(--accent-blue)" : "var(--accent-warm)"};">${escHtml(roleLabel)}</span>
		<span style="font-size:0.68rem;color:var(--text-muted);">${formatDate(m.createdAt)}</span>
	</div>
	<div style="font-size:0.82rem;color:var(--text-secondary);white-space:pre-wrap;line-height:1.6;">${escaped}</div>
</div>`;
}

// ─── Claude Session List ──────────────────────────────────────────────────────

export async function claudeSessionsPage(idx: CairnIndex): Promise<string> {
	const { claudeSessions } = idx;

	if (claudeSessions.length === 0) {
		return emptyState("📜", "No Claude Code sessions found.");
	}

	// Detect active sessions
	const activeIds = await getActiveSessionIds(claudeSessions);

	const activeSessions = claudeSessions.filter((s) => activeIds.has(s.sessionId));
	const pastSessions = claudeSessions.filter((s) => !activeIds.has(s.sessionId));

	// Count sessions per project for the subtitle
	const projectCounts = new Map<string, number>();
	for (const s of claudeSessions) {
		projectCounts.set(s.project, (projectCounts.get(s.project) ?? 0) + 1);
	}
	const projectSummary = [...projectCounts.entries()]
		.sort((a, b) => b[1] - a[1])
		.map(([p, n]) => `${escHtml(p)} (${n})`)
		.join(" · ");

	function renderSessionRow(s: (typeof claudeSessions)[0], isActive: boolean): string {
		const badge = isActive
			? `<span class="claude-live-badge"><span class="claude-live-dot"></span> LIVE</span>`
			: "";
		return `
		<a href="/agents/claude/${escHtml(s.sessionId)}" style="display:grid;grid-template-columns:1fr auto auto auto auto;gap:1rem;align-items:center;padding:0.65rem 1rem;background:var(--glass-bg);border:1px solid ${isActive ? "rgba(122, 184, 140, 0.3)" : "var(--glass-border)"};border-radius:6px;text-decoration:none;margin-bottom:0.4rem;transition:border-color 0.15s;">
			<div>
				<div class="session-title" style="display:flex;align-items:center;gap:0.5rem;">${escHtml(s.slug ?? s.sessionId.slice(0, 8) + "…")} ${badge}</div>
				<div class="session-meta" style="font-family:var(--font-mono);font-size:0.68rem;">${escHtml(s.sessionId.slice(0, 12))}… ${s.gitBranch ? "· " + escHtml(s.gitBranch) : ""}</div>
			</div>
			<span class="tag" style="white-space:nowrap;">${escHtml(s.project)}</span>
			${s.createdAt ? `<span class="session-meta">${formatDate(s.createdAt)}</span>` : "<span></span>"}
			<span class="session-msgs">${s.messageCount} msgs</span>
			<span class="session-msgs" style="color:var(--accent-blue);">${s.toolCallCount} tools</span>
		</a>`;
	}

	const activeSection =
		activeSessions.length > 0
			? `<div class="claude-sessions-section">
			<div class="claude-sessions-section-title"><span class="claude-live-dot" style="width:8px;height:8px;border-radius:50%;background:#81c784;display:inline-block;"></span> Active Sessions (${activeSessions.length})</div>
			${activeSessions.map((s) => renderSessionRow(s, true)).join("")}
		</div>`
			: "";

	const pastSection =
		pastSessions.length > 0
			? `<div class="claude-sessions-section">
			<div class="claude-sessions-section-title">Past Sessions (${pastSessions.length})</div>
			${pastSessions.map((s) => renderSessionRow(s, false)).join("")}
		</div>`
			: "";

	return `
<div class="page-header">
	<div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:1rem;">
		<div>
			<h1 class="page-title">Claude Sessions</h1>
			<p class="page-subtitle">${claudeSessions.length} sessions across all projects · ${projectSummary}${activeSessions.length > 0 ? ` · <span style="color:#81c784;">${activeSessions.length} active</span>` : ""}</p>
		</div>
		<a href="/agents" style="font-size:0.78rem;color:var(--text-secondary);">← Agents</a>
	</div>
</div>

${activeSection}
${pastSection}
`;
}

// ─── Claude Session Detail ────────────────────────────────────────────────────

export function claudeSessionDetailPage(
	idx: CairnIndex,
	sessionId: string,
	isActive = false,
): string | null {
	const session = idx.claudeSessions.find((s) => s.sessionId === sessionId);
	if (!session) return null;

	// Parse the full JSONL with rich content blocks
	let parsed;
	try {
		parsed = parseClaudeJsonl(session.filePath);
	} catch {
		return null;
	}

	const { messages, githubRepo } = parsed;

	// Render all messages with full tool rendering
	const msgsHtml = messages
		.map((msg) => renderClaudeMessage(msg, githubRepo))
		.filter(Boolean)
		.join("");

	// Count tool-only messages for filter
	const toolOnlyCount = messages.filter((m) => m.isToolResultOnly).length;

	const liveIndicator = isActive
		? `<span class="claude-live-badge"><span class="claude-live-dot"></span> LIVE</span>`
		: "";

	const liveBar = isActive
		? `<div class="claude-live-bar">
		<div class="claude-live-bar-left">
			<div class="claude-live-status">
				<span class="claude-live-status-dot connected" id="live-status-dot"></span>
				<span id="live-status-text">Connected</span>
			</div>
			<span class="claude-live-badge"><span class="claude-live-dot"></span> LIVE</span>
		</div>
		<div>
			<button class="claude-follow-btn active" id="follow-toggle" onclick="toggleFollow()">Following</button>
			<button class="claude-scroll-btn" onclick="window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'})">↓ Bottom</button>
		</div>
	</div>`
		: "";

	const liveScript = isActive
		? `
<script>
var following = true;
var source = new EventSource('/agents/claude/${escHtml(sessionId)}/live');

source.onmessage = function(e) {
	var data = JSON.parse(e.data);
	var container = document.getElementById('claude-messages');
	if (data.type === 'append' && data.html) {
		container.insertAdjacentHTML('beforeend', data.html);
		// Re-init truncation and timestamps on new content
		initTruncation(container);
		formatTimestamps(container);
		if (following) {
			window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
		}
	}
};

source.onerror = function() {
	var dot = document.getElementById('live-status-dot');
	var text = document.getElementById('live-status-text');
	if (dot) { dot.classList.remove('connected'); dot.classList.add('disconnected'); }
	if (text) { text.textContent = 'Reconnecting…'; }
};

source.onopen = function() {
	var dot = document.getElementById('live-status-dot');
	var text = document.getElementById('live-status-text');
	if (dot) { dot.classList.remove('disconnected'); dot.classList.add('connected'); }
	if (text) { text.textContent = 'Connected'; }
};

window.addEventListener('scroll', function() {
	var atBottom = window.innerHeight + window.scrollY >= document.body.scrollHeight - 100;
	following = atBottom;
	var btn = document.getElementById('follow-toggle');
	if (btn) {
		btn.classList.toggle('active', following);
		btn.textContent = following ? 'Following' : 'Follow';
	}
});

function toggleFollow() {
	following = !following;
	var btn = document.getElementById('follow-toggle');
	btn.classList.toggle('active', following);
	btn.textContent = following ? 'Following' : 'Follow';
	if (following) {
		window.scrollTo({ top: document.body.scrollHeight, behavior: 'smooth' });
	}
}
</script>`
		: "";

	return `
<div class="breadcrumb">
	<a href="/">Cairn</a><span class="sep">/</span>
	<a href="/agents">Agents</a><span class="sep">/</span>
	<a href="/agents/claude">Claude</a><span class="sep">/</span>
	<span style="font-family:var(--font-mono);font-size:0.85em;">${escHtml(sessionId.slice(0, 12))}…</span>
</div>

<div style="display:grid;grid-template-columns:1fr 220px;gap:2rem;align-items:start;">
	<div>
		<div class="doc-frontmatter" style="margin-bottom:1.5rem;">
			<div class="doc-frontmatter-title" style="display:flex;align-items:center;gap:0.75rem;">
				📜 ${escHtml(session.slug ?? sessionId)} ${liveIndicator}
			</div>
			<div class="doc-frontmatter-meta">
				<span class="tag">${messages.length} messages</span>
				<span class="tag tag-blue">${session.toolCallCount} tool calls</span>
				${session.gitBranch ? `<span class="tag">${escHtml(session.gitBranch)}</span>` : ""}
				${session.version ? `<span class="tag tag-warm">v${escHtml(session.version)}</span>` : ""}
				${session.createdAt ? `<span style="color:var(--text-muted);font-size:0.72rem;">${formatDate(session.createdAt)}</span>` : ""}
			</div>
		</div>

		<div id="message-thread">
			${
				toolOnlyCount > 0
					? `<div class="claude-filter-toolbar">
				<button class="claude-filter-btn" id="filter-toggle" onclick="toggleToolOnly(this)">Hide tool-only</button>
				<span>${toolOnlyCount} tool-only message${toolOnlyCount !== 1 ? "s" : ""}</span>
			</div>`
					: ""
			}
			<div id="claude-messages" style="display:flex;flex-direction:column;gap:0.5rem;">
			${msgsHtml}
			</div>
		</div>
	</div>

	<div class="doc-toc">
		<div class="toc-title">Session Info</div>
		<div style="display:flex;flex-direction:column;gap:0.5rem;margin-top:0.5rem;">
			<div style="font-size:0.75rem;">
				<div style="color:var(--text-muted);font-size:0.68rem;margin-bottom:0.1rem;">Project</div>
				<div><span class="tag">${escHtml(session.project)}</span></div>
			</div>
			<div style="font-size:0.75rem;">
				<div style="color:var(--text-muted);font-size:0.68rem;margin-bottom:0.1rem;">Session ID</div>
				<div style="font-family:var(--font-mono);font-size:0.68rem;word-break:break-all;">${escHtml(sessionId)}</div>
			</div>
			<div style="font-size:0.75rem;">
				<div style="color:var(--text-muted);font-size:0.68rem;margin-bottom:0.1rem;">Slug</div>
				<div>${escHtml(session.slug ?? "—")}</div>
			</div>
			<div style="font-size:0.75rem;">
				<div style="color:var(--text-muted);font-size:0.68rem;margin-bottom:0.1rem;">Branch</div>
				<div>${escHtml(session.gitBranch ?? "—")}</div>
			</div>
			<div style="font-size:0.75rem;">
				<div style="color:var(--text-muted);font-size:0.68rem;margin-bottom:0.1rem;">Messages</div>
				<div>${messages.length}</div>
			</div>
			<div style="font-size:0.75rem;">
				<div style="color:var(--text-muted);font-size:0.68rem;margin-bottom:0.1rem;">Tool Calls</div>
				<div>${session.toolCallCount}</div>
			</div>
			${
				githubRepo
					? `<div style="font-size:0.75rem;">
				<div style="color:var(--text-muted);font-size:0.68rem;margin-bottom:0.1rem;">Repository</div>
				<div><a href="https://github.com/${escHtml(githubRepo)}" target="_blank" rel="noopener" style="font-size:0.72rem;">${escHtml(githubRepo)}</a></div>
			</div>`
					: ""
			}
		</div>
	</div>
</div>

${liveBar}

<script>
${CLAUDE_VIEWER_JS}

function toggleToolOnly(btn) {
	var msgs = document.getElementById('claude-messages');
	var hiding = msgs.classList.toggle('hide-tool-only');
	btn.classList.toggle('active', hiding);
	btn.textContent = hiding ? 'Show tool-only' : 'Hide tool-only';
}

// Hide tool-only messages when class is applied
var style = document.createElement('style');
style.textContent = '.hide-tool-only .claude-msg-tool-reply { display: none; }';
document.head.appendChild(style);
</script>
${liveScript}
`;
}
