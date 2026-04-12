import { marked, type Token } from "marked";
import { markedHighlight } from "marked-highlight";
import { createHighlighter, type Highlighter } from "shiki";

let highlighter: Highlighter | null = null;

export async function initRenderer(): Promise<void> {
	highlighter = await createHighlighter({
		themes: ["vitesse-dark"],
		langs: [
			"typescript",
			"javascript",
			"svelte",
			"html",
			"css",
			"json",
			"jsonc",
			"yaml",
			"toml",
			"bash",
			"sql",
			"go",
			"python",
		],
	});

	marked.use(
		markedHighlight({
			highlight(code, lang) {
				if (!highlighter) return code;
				if (!lang) return escapeHtml(code);
				const normalizedLang = lang.toLowerCase().trim();
				const supportedLangs = highlighter.getLoadedLanguages();
				if (!supportedLangs.includes(normalizedLang as never)) {
					return escapeHtml(code);
				}
				try {
					return highlighter.codeToHtml(code, {
						lang: normalizedLang,
						theme: "vitesse-dark",
					});
				} catch {
					return escapeHtml(code);
				}
			},
		}),
	);

	const renderer = new marked.Renderer();

	renderer.code = ({ text, lang }: Token & { text: string; lang?: string }) => {
		if (!lang) {
			return `<pre class="ascii-art"><code>${escapeHtml(text)}</code></pre>`;
		}
		const highlighted = highlighter
			? (() => {
					const normalizedLang = lang.toLowerCase().trim();
					const supportedLangs = highlighter.getLoadedLanguages();
					if (!supportedLangs.includes(normalizedLang as never)) {
						return `<pre><code>${escapeHtml(text)}</code></pre>`;
					}
					try {
						return highlighter.codeToHtml(text, { lang: normalizedLang, theme: "vitesse-dark" });
					} catch {
						return `<pre><code>${escapeHtml(text)}</code></pre>`;
					}
				})()
			: `<pre><code>${escapeHtml(text)}</code></pre>`;
		return highlighted;
	};

	// Checkboxes in list items
	renderer.listitem = ({
		text,
		task,
		checked,
	}: Token & { text: string; task: boolean; checked?: boolean }) => {
		if (task) {
			const checkbox = `<input type="checkbox" ${checked ? "checked" : ""} disabled />`;
			return `<li>${checkbox} ${text}</li>`;
		}
		return `<li>${text}</li>`;
	};

	marked.use({ renderer });
	marked.setOptions({ gfm: true, breaks: false });
}

export function renderMarkdown(content: string): string {
	return marked.parse(content) as string;
}

export function escapeHtml(text: string): string {
	return text
		.replace(/&/g, "&amp;")
		.replace(/</g, "&lt;")
		.replace(/>/g, "&gt;")
		.replace(/"/g, "&quot;")
		.replace(/'/g, "&#39;");
}
