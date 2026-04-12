/**
 * Looking Glass — HTML layout shell.
 *
 * Reads style.css once at startup and inlines it into every page.
 * No external CSS dependencies; fonts loaded from Google Fonts.
 */

import { readFileSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const CSS = readFileSync(join(__dirname, "..", "style.css"), "utf8");

// ─── Layout Shell ──────────────────────────────────────────────────────────

export function layout(opts: { title: string; content: string; currentPath: string }): string {
	return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1">
	<title>${escHtml(opts.title)} — Looking Glass</title>
	<link rel="preconnect" href="https://fonts.googleapis.com">
	<link href="https://fonts.googleapis.com/css2?family=Lexend:wght@300;400;500;600;700&family=JetBrains+Mono:wght@400;500;700&display=swap" rel="stylesheet">
	<style>${CSS}</style>
</head>
<body>
	<header class="lg-header">
		<a href="/" class="lg-logo">Looking Glass</a>
		<span style="font-size:0.72rem;color:var(--text-muted);">Claude Code Session Viewer</span>
	</header>
	<main class="lg-main">
		${opts.content}
	</main>
</body>
</html>`;
}

// ─── Helpers ───────────────────────────────────────────────────────────────

export function escHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;");
}

export function formatDate(d: Date | undefined): string {
	if (!d) return "—";
	const now = new Date();
	const isToday = d.toDateString() === now.toDateString();
	const time = d.toLocaleTimeString(undefined, {
		hour: "2-digit",
		minute: "2-digit",
	});
	if (isToday) return time;
	return d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) + " " + time;
}

export function emptyState(icon: string, msg: string): string {
	return `<div class="lg-empty"><div class="lg-empty-icon">${icon}</div><div class="lg-empty-msg">${escHtml(msg)}</div></div>`;
}
