/**
 * Live session streaming via Server-Sent Events.
 *
 * - Active session detection via ~/.claude/sessions/ PID files
 * - SSE endpoint that tails JSONL files every 2 seconds
 * - Pre-rendered HTML fragments pushed to the client
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import type { SessionMeta } from "./types.ts";
import { parseClaudeJsonlIncremental } from "./parse.ts";
import { renderClaudeMessage } from "./render.ts";

// Cache active session IDs for 5 seconds
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
 * Claude Code process. Verifies PID is alive with kill(pid, 0).
 */
function readLiveSessionIds(): Set<string> {
	const ids = new Set<string>();
	try {
		const files = readdirSync(SESSIONS_DIR).filter((f) => f.endsWith(".json"));
		for (const file of files) {
			try {
				const raw = readFileSync(join(SESSIONS_DIR, file), "utf8");
				const entry = JSON.parse(raw) as SessionPidEntry;
				process.kill(entry.pid, 0);
				ids.add(entry.sessionId);
			} catch {
				// Stale PID file or process gone
			}
		}
	} catch {
		// Sessions dir doesn't exist
	}
	return ids;
}

export function getActiveSessionIds(sessions: SessionMeta[]): Set<string> {
	const now = Date.now();
	if (_activeCache && now - _activeCache.at < CACHE_TTL) {
		return _activeCache.ids;
	}

	const liveIds = readLiveSessionIds();
	const activeIds = new Set<string>();
	for (const session of sessions) {
		if (liveIds.has(session.sessionId)) {
			activeIds.add(session.sessionId);
		}
	}

	_activeCache = { ids: activeIds, at: now };
	return activeIds;
}

export function isSessionActive(filePath: string): boolean {
	const sessionId = filePath.split("/").pop()?.replace(".jsonl", "") ?? "";
	const liveIds = readLiveSessionIds();
	return liveIds.has(sessionId);
}

export function createLiveStream(filePath: string, githubRepo: string | null): Response {
	let byteOffset: number;
	let cancelled = false;

	try {
		const raw = readFileSync(filePath, "utf8");
		byteOffset = Buffer.byteLength(raw, "utf8");
	} catch {
		byteOffset = 0;
	}

	const stream = new ReadableStream({
		start(controller) {
			const encoder = new TextEncoder();
			controller.enqueue(encoder.encode(": connected\n\n"));

			const interval = setInterval(() => {
				if (cancelled) {
					clearInterval(interval);
					return;
				}

				try {
					const { messages, newOffset } = parseClaudeJsonlIncremental(filePath, byteOffset);

					if (messages.length > 0) {
						byteOffset = newOffset;
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
					// File may be gone or truncated
				}
			}, 2000);

			const cleanup = () => {
				cancelled = true;
				clearInterval(interval);
			};

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
			"X-Accel-Buffering": "no",
		},
	});
}
