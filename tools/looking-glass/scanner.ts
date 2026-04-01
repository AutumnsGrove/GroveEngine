/**
 * Claude Code session scanner.
 * Discovers all JSONL session files across ~/.claude/projects/.
 */

import { readFileSync, readdirSync, statSync } from "fs";
import { join } from "path";
import { homedir } from "os";
import type { SessionMeta } from "./types.ts";

const CLAUDE_PROJECTS_DIR = join(homedir(), ".claude", "projects");

// Cache with TTL to avoid re-scanning on every page load
let _cache: { sessions: SessionMeta[]; at: number } | null = null;
const CACHE_TTL = 30_000; // 30 seconds

/**
 * Derive a human-readable project name from a ~/.claude/projects/ dir name.
 * e.g. "-Users-autumn-Documents-Projects-Lattice" → "Lattice"
 */
function deriveProjectName(dirName: string): string {
	const parts = dirName.split("-").filter(Boolean);
	const projectsIdx = parts.lastIndexOf("Projects");
	if (projectsIdx === -1) return dirName;
	const after = parts.slice(projectsIdx + 1);
	return after.length > 0 ? after.join("-") : "Projects";
}

function parseSessionFile(
	fullPath: string,
	sessionId: string,
	project: string,
	projectDir: string,
): SessionMeta | null {
	try {
		const st = statSync(fullPath);
		const raw = readFileSync(fullPath, "utf8");
		const allLines = raw.split("\n").filter(Boolean);
		const headerLines = allLines.slice(0, 50);

		let slug: string | undefined;
		let gitBranch: string | undefined;
		let version: string | undefined;
		let createdAt: Date | undefined;

		for (const line of headerLines) {
			try {
				const obj = JSON.parse(line) as Record<string, unknown>;
				if (obj.type === "progress" && obj.sessionId === sessionId) {
					slug = slug ?? (obj.slug as string | undefined);
					gitBranch = gitBranch ?? (obj.gitBranch as string | undefined);
					version = version ?? (obj.version as string | undefined);
					if (!createdAt && obj.data && typeof obj.data === "object") {
						const data = obj.data as Record<string, unknown>;
						if (data.timestamp) createdAt = new Date(data.timestamp as string);
					}
				}
			} catch {
				// skip malformed lines
			}
		}

		const messageCount = allLines.filter((l) => {
			try {
				const o = JSON.parse(l) as Record<string, unknown>;
				return o.type === "assistant" || o.type === "user";
			} catch {
				return false;
			}
		}).length;

		const toolCallCount = allLines.filter((l) => {
			try {
				const o = JSON.parse(l) as Record<string, unknown>;
				return o.type === "assistant" && l.includes("tool_use");
			} catch {
				return false;
			}
		}).length;

		return {
			sessionId,
			project,
			projectDir,
			filePath: fullPath,
			slug,
			messageCount,
			toolCallCount,
			createdAt,
			gitBranch,
			version,
			fileSize: st.size,
		};
	} catch {
		return null;
	}
}

export function scanAllSessions(forceRefresh = false): SessionMeta[] {
	const now = Date.now();
	if (!forceRefresh && _cache && now - _cache.at < CACHE_TTL) {
		return _cache.sessions;
	}

	const sessions: SessionMeta[] = [];

	let projectDirs: string[];
	try {
		projectDirs = readdirSync(CLAUDE_PROJECTS_DIR);
	} catch {
		return sessions;
	}

	for (const dirName of projectDirs) {
		const projectDir = join(CLAUDE_PROJECTS_DIR, dirName);

		let files: string[];
		try {
			const st = statSync(projectDir);
			if (!st.isDirectory()) continue;
			files = readdirSync(projectDir);
		} catch {
			continue;
		}

		const projectName = deriveProjectName(dirName);
		const jsonlFiles = files.filter((f) => f.endsWith(".jsonl")).sort();

		for (const file of jsonlFiles) {
			const sessionId = file.replace(".jsonl", "");
			const fullPath = join(projectDir, file);
			const session = parseSessionFile(fullPath, sessionId, projectName, dirName);
			if (session) sessions.push(session);
		}
	}

	// Sort newest first
	sessions.sort((a, b) => {
		if (!a.createdAt && !b.createdAt) return 0;
		if (!a.createdAt) return 1;
		if (!b.createdAt) return -1;
		return b.createdAt.getTime() - a.createdAt.getTime();
	});

	_cache = { sessions, at: now };
	return sessions;
}

export function groupByProject(sessions: SessionMeta[]): Map<string, SessionMeta[]> {
	const map = new Map<string, SessionMeta[]>();
	for (const s of sessions) {
		const list = map.get(s.project) ?? [];
		list.push(s);
		map.set(s.project, list);
	}
	return map;
}
