/**
 * Looking Glass — Standalone Claude Code session viewer.
 *
 * A lightweight Bun server that scans ~/.claude/projects/ for JSONL sessions,
 * renders them with rich tool displays, and streams active sessions via SSE.
 *
 * Usage: bun run server.ts
 */

import { initRenderer } from "./markdown.ts";
import { scanAllSessions } from "./scanner.ts";
import { getActiveSessionIds, isSessionActive, createLiveStream } from "./live.ts";
import { parseClaudeJsonl } from "./parse.ts";
import { layout } from "./pages/layout.ts";
import { sessionsPage } from "./pages/sessions.ts";
import { detailPage } from "./pages/detail.ts";

const PORT = 4444;

// ─── Already-running check ──────────────────────────────────────────────────

try {
	const res = await fetch(`http://localhost:${PORT}/api/health`, {
		signal: AbortSignal.timeout(400),
	});
	if (res.ok) {
		console.log(`\n🔮 Looking Glass is already running — http://localhost:${PORT}\n`);
		process.exit(0);
	}
} catch {
	// Port is free — proceed
}

// ─── Boot ───────────────────────────────────────────────────────────────────

console.log("🔮 Looking Glass is waking up…");

// Init shiki (the only slow part — no index to build)
await initRenderer();

// Initial session scan
const sessions = scanAllSessions();

console.log(`\n🔮 Looking Glass — http://localhost:${PORT}`);
console.log(`   ${sessions.length} sessions discovered\n`);

// ─── Helpers ────────────────────────────────────────────────────────────────

function notFound(msg = "Not found"): Response {
	return new Response(
		layout({
			title: "404",
			content: `
			<div class="lg-empty">
				<div class="lg-empty-icon">🍂</div>
				<div class="lg-empty-msg">${msg}</div>
				<a href="/" style="display:inline-block;margin-top:1rem;font-size:0.85rem;">← Back to sessions</a>
			</div>`,
			currentPath: "/404",
		}),
		{ status: 404, headers: { "Content-Type": "text/html; charset=utf-8" } },
	);
}

function html(content: string, title: string, currentPath: string): Response {
	return new Response(layout({ title, content, currentPath }), {
		headers: { "Content-Type": "text/html; charset=utf-8" },
	});
}

function json(data: unknown): Response {
	return new Response(JSON.stringify(data, null, 2), {
		headers: { "Content-Type": "application/json; charset=utf-8" },
	});
}

// ─── Server ─────────────────────────────────────────────────────────────────

let server;
try {
	server = Bun.serve({
		port: PORT,
		hostname: "localhost",

		async fetch(req) {
			const url = new URL(req.url);
			const path = url.pathname;

			try {
				// ── Session list (home) ─────────────────────────────────────────
				if (path === "/" || path === "/sessions") {
					const sessions = scanAllSessions();
					const activeIds = getActiveSessionIds(sessions);
					return html(sessionsPage(sessions, activeIds), "Sessions", "/sessions");
				}

				// ── SSE live stream (must match before detail route) ────────────
				if (path.match(/^\/sessions\/[a-zA-Z0-9-]+\/live$/)) {
					const sessionId = path.split("/")[2];
					const sessions = scanAllSessions();
					const session = sessions.find((s) => s.sessionId === sessionId);
					if (!session) return notFound("Session not found");
					const parsed = parseClaudeJsonl(session.filePath);
					return createLiveStream(session.filePath, parsed.githubRepo);
				}

				// ── Session detail ──────────────────────────────────────────────
				if (path.startsWith("/sessions/")) {
					const sessionId = decodeURIComponent(path.slice("/sessions/".length)).replace(
						/[^a-z0-9-]/gi,
						"",
					);
					if (!sessionId) return notFound("Invalid session ID.");
					const sessions = scanAllSessions();
					const session = sessions.find((s) => s.sessionId === sessionId);
					if (!session) return notFound(`Session not found: ${sessionId}`);
					const active = isSessionActive(session.filePath);
					const content = detailPage(session, active);
					if (!content) return notFound("Failed to parse session.");
					return html(content, `Session: ${sessionId.slice(0, 8)}…`, path);
				}

				// ── JSON API ────────────────────────────────────────────────────
				if (path === "/api/health") {
					return json({ status: "ok" });
				}

				if (path === "/api/sessions") {
					const sessions = scanAllSessions();
					const activeIds = getActiveSessionIds(sessions);
					return json(
						sessions.map((s) => ({
							...s,
							active: activeIds.has(s.sessionId),
						})),
					);
				}

				// ── Favicon ─────────────────────────────────────────────────────
				if (path === "/favicon.ico") {
					return new Response(null, { status: 204 });
				}

				return notFound();
			} catch (err) {
				console.error("Server error:", err);
				return new Response("Internal server error", { status: 500 });
			}
		},
	});
} catch (err: unknown) {
	const e = err as NodeJS.ErrnoException;
	if (e?.code === "EADDRINUSE") {
		console.error(`\n✗  Port ${PORT} is in use.`);
		console.error(`   To free it: kill $(lsof -ti :${PORT})\n`);
		process.exit(1);
	}
	throw err;
}
