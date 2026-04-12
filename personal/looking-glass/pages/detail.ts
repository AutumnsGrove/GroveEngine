/**
 * Looking Glass — Session detail page.
 *
 * Renders a full Claude Code session with tool-use/tool-result pairing,
 * a filter toolbar for hiding tool-only messages, and live SSE streaming
 * for active sessions. The sidebar shows session metadata and links.
 */

import type { SessionMeta } from "../types.ts";
import { parseClaudeJsonl } from "../parse.ts";
import { renderPairedMessages, CLAUDE_VIEWER_JS } from "../render.ts";
import { escHtml, formatDate } from "./layout.ts";

// ─── Detail Page ───────────────────────────────────────────────────────────

export function detailPage(session: SessionMeta, isActive: boolean): string | null {
	let parsed;
	try {
		parsed = parseClaudeJsonl(session.filePath);
	} catch {
		return null;
	}

	const { messages, githubRepo } = parsed;

	// Render with tool pairing
	const msgsHtml = renderPairedMessages(messages, githubRepo);

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
			<button class="claude-scroll-btn" onclick="window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'})">Bottom</button>
		</div>
	</div>`
		: "";

	const liveScript = isActive ? buildLiveScript(session.sessionId) : "";

	return `
<div class="lg-breadcrumb">
	<a href="/">Looking Glass</a><span class="sep">/</span>
	<a href="/sessions">Sessions</a><span class="sep">/</span>
	<span style="font-family:var(--font-mono);font-size:0.85em;">${escHtml(session.sessionId.slice(0, 12))}...</span>
</div>

<div style="display:grid;grid-template-columns:1fr 220px;gap:2rem;align-items:start;" class="lg-detail-grid">
	<div>
		${renderDetailHeader(session, messages.length, liveIndicator, githubRepo)}

		<div id="message-thread">
			${renderFilterToolbar(toolOnlyCount)}
			<div id="lg-messages" style="display:flex;flex-direction:column;gap:0.5rem;">
			${msgsHtml}
			</div>
		</div>
	</div>

	${renderSidebar(session, messages.length, githubRepo)}
</div>

${liveBar}

<script>
${CLAUDE_VIEWER_JS}

function toggleToolOnly(btn) {
	var msgs = document.getElementById('lg-messages');
	var hiding = msgs.classList.toggle('hide-tool-only');
	btn.classList.toggle('active', hiding);
	btn.textContent = hiding ? 'Show tool-only' : 'Hide tool-only';
}

var style = document.createElement('style');
style.textContent = '.hide-tool-only .lg-msg-tool-reply { display: none; }';
document.head.appendChild(style);
</script>
${liveScript}`;
}

// ─── Detail Header ─────────────────────────────────────────────────────────

function renderDetailHeader(
	session: SessionMeta,
	messageCount: number,
	liveIndicator: string,
	githubRepo: string | null,
): string {
	return `<div class="lg-detail-header">
	<div style="display:flex;justify-content:space-between;align-items:flex-start;">
		<div class="lg-detail-title">
			${escHtml(session.slug ?? session.sessionId)} ${liveIndicator}
		</div>
		<button class="claude-scroll-btn" onclick="window.scrollTo({top:document.body.scrollHeight,behavior:'smooth'})" style="flex-shrink:0;">↓ Bottom</button>
	</div>
	<div class="lg-detail-meta">
		<span class="tag">${messageCount} messages</span>
		<span class="tag tag-blue">${session.toolCallCount} tool calls</span>
		${session.gitBranch ? `<span class="tag">${escHtml(session.gitBranch)}</span>` : ""}
		${session.version ? `<span class="tag tag-warm">v${escHtml(session.version)}</span>` : ""}
		${session.createdAt ? `<span style="color:var(--text-muted);font-size:0.72rem;">${formatDate(session.createdAt)}</span>` : ""}
	</div>
</div>`;
}

// ─── Filter Toolbar ────────────────────────────────────────────────────────

function renderFilterToolbar(toolOnlyCount: number): string {
	if (toolOnlyCount === 0) return "";
	return `<div class="lg-filter-toolbar">
	<button class="lg-filter-btn" id="filter-toggle" onclick="toggleToolOnly(this)">Hide tool-only</button>
	<span>${toolOnlyCount} tool-only message${toolOnlyCount !== 1 ? "s" : ""}</span>
</div>`;
}

// ─── Sidebar ───────────────────────────────────────────────────────────────

function renderSidebar(
	session: SessionMeta,
	messageCount: number,
	githubRepo: string | null,
): string {
	return `<div class="lg-sidebar">
	<div class="lg-sidebar-title">Session Info</div>
	<div class="lg-sidebar-item">
		<div class="lg-sidebar-label">Project</div>
		<div><span class="tag">${escHtml(session.project)}</span></div>
	</div>
	<div class="lg-sidebar-item">
		<div class="lg-sidebar-label">Session ID</div>
		<div style="font-family:var(--font-mono);font-size:0.68rem;word-break:break-all;">${escHtml(session.sessionId)}</div>
	</div>
	<div class="lg-sidebar-item">
		<div class="lg-sidebar-label">Slug</div>
		<div>${escHtml(session.slug ?? "—")}</div>
	</div>
	<div class="lg-sidebar-item">
		<div class="lg-sidebar-label">Branch</div>
		<div>${escHtml(session.gitBranch ?? "—")}</div>
	</div>
	<div class="lg-sidebar-item">
		<div class="lg-sidebar-label">Messages</div>
		<div>${messageCount}</div>
	</div>
	<div class="lg-sidebar-item">
		<div class="lg-sidebar-label">Tool Calls</div>
		<div>${session.toolCallCount}</div>
	</div>
	<div class="lg-sidebar-item">
		<div class="lg-sidebar-label">File Size</div>
		<div style="font-family:var(--font-mono);">${(session.fileSize / 1024).toFixed(0)} KB</div>
	</div>
	${
		githubRepo
			? `<div class="lg-sidebar-item">
		<div class="lg-sidebar-label">Repository</div>
		<div><a href="https://github.com/${escHtml(githubRepo)}" target="_blank" rel="noopener" style="font-size:0.72rem;">${escHtml(githubRepo)}</a></div>
	</div>`
			: ""
	}
</div>`;
}

// ─── Live SSE Script ───────────────────────────────────────────────────────

function buildLiveScript(sessionId: string): string {
	return `
<script>
var following = true;
var source = new EventSource('/sessions/${escHtml(sessionId)}/live');

source.onmessage = function(e) {
	var data = JSON.parse(e.data);
	var container = document.getElementById('lg-messages');
	if (data.type === 'append' && data.html) {
		container.insertAdjacentHTML('beforeend', data.html);
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
	if (text) { text.textContent = 'Reconnecting...'; }
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
</script>`;
}
