/**
 * Claude Code live session streaming via Server-Sent Events.
 *
 * Provides:
 * - Active session detection (via fuser / file open check)
 * - SSE endpoint that tails JSONL files every 2 seconds
 * - Pre-rendered HTML fragments pushed to the client
 */

import { readFileSync, statSync } from "fs";
import type { ClaudeSession, ClaudeActiveSession } from "../types.ts";
import { parseClaudeJsonlIncremental } from "./claude-parse.ts";
import { renderClaudeMessage } from "./claude-render.ts";

// ─── Active Session Detection ────────────────────────────────────────────────

// Cache active session IDs for 5 seconds to avoid excessive fuser calls
let _activeCache: { ids: Set<string>; at: number } | null = null;
const CACHE_TTL = 5000;

/**
 * Check which sessions are currently active (have an open file handle).
 * Uses `fuser` on Linux to check if any process has the JSONL file open.
 * Falls back gracefully if fuser is not available.
 */
export async function getActiveSessionIds(
	sessions: ClaudeSession[],
): Promise<Set<string>> {
	const now = Date.now();
	if (_activeCache && now - _activeCache.at < CACHE_TTL) {
		return _activeCache.ids;
	}

	const activeIds = new Set<string>();

	// Batch check: run fuser on all session files
	for (const session of sessions) {
		try {
			const isActive = await isFileOpenByProcess(session.filePath);
			if (isActive) {
				activeIds.add(session.sessionId);
			}
		} catch {
			// fuser not available or file gone — skip
		}
	}

	_activeCache = { ids: activeIds, at: now };
	return activeIds;
}

/**
 * Check if a specific file is open by any process.
 * Returns true if fuser reports the file is in use.
 */
async function isFileOpenByProcess(filePath: string): Promise<boolean> {
	try {
		// Verify file exists first
		statSync(filePath);
	} catch {
		return false;
	}

	try {
		const proc = Bun.spawn(["fuser", filePath], {
			stdout: "pipe",
			stderr: "pipe",
		});
		const code = await proc.exited;
		return code === 0;
	} catch {
		// fuser not installed — fall back to recency heuristic
		try {
			const stat = statSync(filePath);
			return Date.now() - stat.mtimeMs < 30_000;
		} catch {
			return false;
		}
	}
}

/**
 * Check if a single session is currently active.
 */
export async function isSessionActive(filePath: string): Promise<boolean> {
	return isFileOpenByProcess(filePath);
}

// ─── SSE Live Stream ─────────────────────────────────────────────────────────

/**
 * Create a Server-Sent Events response that tails a JSONL file.
 * Polls every 2 seconds for new lines and sends pre-rendered HTML.
 */
export function createLiveStream(
	filePath: string,
	githubRepo: string | null,
): Response {
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
					const { messages, newOffset } = parseClaudeJsonlIncremental(
						filePath,
						byteOffset,
					);

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
