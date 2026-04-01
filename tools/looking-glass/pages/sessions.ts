/**
 * Looking Glass — Session list page.
 *
 * Groups active sessions at the top with a live indicator, then renders
 * past sessions grouped by project (largest projects first). Each project
 * group shows at most 20 sessions with a "more" indicator.
 */

import type { SessionMeta } from "../types.ts";
import { escHtml, formatDate, emptyState } from "./layout.ts";

// ─── Session List Page ─────────────────────────────────────────────────────

export function sessionsPage(sessions: SessionMeta[], activeIds: Set<string>): string {
	if (sessions.length === 0) {
		return emptyState("~", "No Claude Code sessions found.");
	}

	const activeSessions = sessions.filter((s) => activeIds.has(s.sessionId));
	const pastSessions = sessions.filter((s) => !activeIds.has(s.sessionId));

	// Count per project for summary line
	const projectCounts = new Map<string, number>();
	for (const s of sessions) {
		projectCounts.set(s.project, (projectCounts.get(s.project) ?? 0) + 1);
	}
	const projectSummary = [...projectCounts.entries()]
		.sort((a, b) => b[1] - a[1])
		.map(([p, n]) => `${escHtml(p)} (${n})`)
		.join(" · ");

	// ── Active section ──────────────────────────────────────────────────────

	const activeSection =
		activeSessions.length > 0
			? `<div class="lg-section">
			<div class="lg-section-title"><span class="claude-live-dot" style="width:8px;height:8px;border-radius:50%;background:#81c784;display:inline-block;"></span> Active (${activeSessions.length})</div>
			${activeSessions.map((s) => renderRow(s, true)).join("")}
		</div>`
			: "";

	// ── Past sessions grouped by project ────────────────────────────────────

	const byProject = new Map<string, SessionMeta[]>();
	for (const s of pastSessions) {
		const list = byProject.get(s.project) ?? [];
		list.push(s);
		byProject.set(s.project, list);
	}

	const pastSection = [...byProject.entries()]
		.sort((a, b) => b[1].length - a[1].length)
		.map(
			([project, group]) => `
			<div class="lg-project-group">
				<div class="lg-project-name">${escHtml(project)} (${group.length})</div>
				${group
					.slice(0, 20)
					.map((s) => renderRow(s, false))
					.join("")}
				${group.length > 20 ? `<div style="font-size:0.72rem;color:var(--text-muted);padding:0.4rem 1rem;">+ ${group.length - 20} more sessions</div>` : ""}
			</div>`,
		)
		.join("");

	// ── Assemble page ───────────────────────────────────────────────────────

	return `
	<div class="lg-page-header">
		<h1 class="lg-page-title">Sessions</h1>
		<p class="lg-page-subtitle">${sessions.length} sessions · ${projectSummary}${activeSessions.length > 0 ? ` · <span style="color:#81c784;">${activeSessions.length} active</span>` : ""}</p>
	</div>
	${activeSection}
	<div class="lg-section">
		<div class="lg-section-title">Past Sessions</div>
		${pastSection}
	</div>`;
}

// ─── Session Row ───────────────────────────────────────────────────────────

function renderRow(s: SessionMeta, isActive: boolean): string {
	const badge = isActive
		? `<span class="claude-live-badge"><span class="claude-live-dot"></span> LIVE</span>`
		: "";
	return `
	<a href="/sessions/${escHtml(s.sessionId)}" class="lg-session-row${isActive ? " active" : ""}">
		<div>
			<div class="lg-session-title">${escHtml(s.slug ?? s.sessionId.slice(0, 8) + "...")} ${badge}</div>
			<div class="lg-session-meta">${escHtml(s.sessionId.slice(0, 12))}... ${s.gitBranch ? "· " + escHtml(s.gitBranch) : ""}</div>
		</div>
		<span class="tag">${escHtml(s.project)}</span>
		${s.createdAt ? `<span class="lg-session-meta">${formatDate(s.createdAt)}</span>` : "<span></span>"}
		<span class="lg-session-msgs">${s.messageCount} msgs · ${s.toolCallCount} tools</span>
	</a>`;
}
