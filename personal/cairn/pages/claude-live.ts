/**
 * Claude Code live session streaming via Server-Sent Events.
 *
 * Provides:
 * - Active session detection (via ~/.claude/sessions/ PID files)
 * - SSE endpoint that tails JSONL files every 2 seconds
 * - Pre-rendered HTML fragments pushed to the client
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import type { ClaudeSession, ClaudeActiveSession } from "../types.ts";
import { parseClaudeJsonlIncremental } from "./claude-parse.ts";
import { renderClaudeMessage } from "./claude-render.ts";

// ─── Active Session Detection ────────────────────────────────────────────────

// Cache active session IDs for 5 seconds to avoid excessive process checks
let _activeCache: { ids: Set<string>; at: number } | null = null;
const CACHE_TTL = 5000;

const SESSIONS_DIR = join(homedir(), ".claude", "sessions");

interface SessionPidEntry {
	pid: number;
	sessionId: string;
	cwd: string;
	startedAt: number;
}

/**
 * Read ~/.claude/sessions/*.json to find which session IDs have a live
 * Claude Code process. Each file is named {pid}.json and contains
 * { pid, sessionId, cwd, startedAt }.
 *
 * We verify the PID is still alive with kill(pid, 0).
 */
function readLiveSessionIds(): Set<string> {
	const ids = new Set<string>();
	try {
		const files = readdirSync(SESSIONS_DIR).filter((f) => f.endsWith(".json"));
		for (const file of files) {
			try {
				const raw = readFileSync(join(SESSIONS_DIR, file), "utf8");
				const entry = JSON.parse(raw) as SessionPidEntry;
				// kill(pid, 0) throws if process doesn't exist — no signal is sent
				process.kill(entry.pid, 0);
				ids.add(entry.sessionId);
			} catch {
				// Stale PID file or process gone — skip
			}
		}
	} catch {
		// Sessions dir doesn't exist — no active sessions
	}
	return ids;
}

/**
 * Check which sessions are currently active (have a running Claude process).
 */
export async function getActiveSessionIds(sessions: ClaudeSession[]): Promise<Set<string>> {
	const now = Date.now();
	if (_activeCache && now - _activeCache.at < CACHE_TTL) {
		return _activeCache.ids;
	}

	const liveIds = readLiveSessionIds();

	// Intersect with known sessions so we only return IDs Cairn knows about
	const activeIds = new Set<string>();
	for (const session of sessions) {
		if (liveIds.has(session.sessionId)) {
			activeIds.add(session.sessionId);
		}
	}

	_activeCache = { ids: activeIds, at: now };
	return activeIds;
}

/**
 * Check if a single session is currently active.
 */
export async function isSessionActive(filePath: string): Promise<boolean> {
	// Extract session ID from file path (filename without .jsonl)
	const sessionId = filePath.split("/").pop()?.replace(".jsonl", "") ?? "";
	const liveIds = readLiveSessionIds();
	return liveIds.has(sessionId);
}

// ─── SSE Live Stream ─────────────────────────────────────────────────────────

/**
 * Create a Server-Sent Events response that tails a JSONL file.
 * Polls every 2 seconds for new lines and sends pre-rendered HTML.
 */
export function createLiveStream(filePath: string, githubRepo: string | null): Response {
	let byteOffset: number;
	let cancelled = false;

	// Get initial file size as starting offset (client already has existing messages)
	try {
		const raw = readFileSync(filePath, "utf8");
		byteOffset = Buffer.byteLength(raw, "utf8");
	} catch {
		byteOffset = 0;
	}

	const stream = new ReadableStream({
		start(controller) {
			const encoder = new TextEncoder();

			// Send keepalive comment so client knows connection is alive
			controller.enqueue(encoder.encode(": connected\n\n"));

			// Poll every 2 seconds
			const interval = setInterval(() => {
				if (cancelled) {
					clearInterval(interval);
					return;
				}

				try {
					const { messages, newOffset } = parseClaudeJsonlIncremental(filePath, byteOffset);

					if (messages.length > 0) {
						byteOffset = newOffset;

						// Render new messages to HTML
						const html = messages
							.map((msg) => renderClaudeMessage(msg, githubRepo))
							.filter(Boolean)
							.join("");

						if (html) {
							const event = `data: ${JSON.stringify({ type: "append", html })}\n\n`;
							controller.enqueue(encoder.encode(event));
						}
					} else {
						byteOffset = newOffset;
					}
				} catch {
					// File may be gone or truncated — ignore
				}
			}, 2000);

			// Clean up on disconnect
			const cleanup = () => {
				cancelled = true;
				clearInterval(interval);
			};

			// Bun calls cancel() when the client disconnects
			(controller as unknown as { signal?: AbortSignal }).signal?.addEventListener(
				"abort",
				cleanup,
			);
		},

		cancel() {
			cancelled = true;
		},
	});

	return new Response(stream, {
		headers: {
			"Content-Type": "text/event-stream",
			"Cache-Control": "no-cache",
			Connection: "keep-alive",
			"X-Accel-Buffering": "no", // Disable nginx buffering if proxied
		},
	});
}
