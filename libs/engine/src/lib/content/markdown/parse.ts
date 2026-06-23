import matter from "@11ty/gray-matter";
import { sanitizeMarkdown } from "../../utils/sanitize.js";
import { SUPPRESS_MARKER } from "./suppress.js";
import { md } from "./renderer.js";
import { generateHeadingId } from "./heading-id.js";
import type { Header, Frontmatter, ParsedContent } from "./types.js";

export { generateHeadingId } from "./heading-id.js";

export function extractHeaders(markdown: string): Header[] {
	const headers: Header[] = [];

	const markdownWithoutCodeBlocks = markdown.replace(/```[\s\S]*?```/g, "");

	const headerRegex = /^(#{1,6})\s+(.+)$/gm;

	let match;
	while ((match = headerRegex.exec(markdownWithoutCodeBlocks)) !== null) {
		const level = match[1].length;
		const rawText = match[2].trim();

		if (rawText.includes(SUPPRESS_MARKER)) continue;

		const text = rawText;
		const id = generateHeadingId(text);

		headers.push({ level, text, id });
	}

	return headers;
}

export function processAnchorTags(html: string): string {
	return html.replace(
		/<!--\s*anchor:([\w-]+)\s*-->/g,
		(_match, tagname) => `<span class="anchor-marker" data-anchor="${tagname}"></span>`,
	);
}

export function parseMarkdownContent(markdownContent: string): ParsedContent {
	const { data, content: markdown } = matter(markdownContent);

	let htmlContent = md.render(markdown);
	htmlContent = processAnchorTags(htmlContent);
	htmlContent = sanitizeMarkdown(htmlContent);

	const headers = extractHeaders(markdown);

	return {
		data: data as Frontmatter,
		content: htmlContent,
		headers,
		rawMarkdown: markdown,
	};
}

export function parseMarkdownContentSanitized(markdownContent: string): ParsedContent {
	const { data, content: markdown } = matter(markdownContent);
	const htmlContent = sanitizeMarkdown(md.render(markdown));
	const headers = extractHeaders(markdown);

	return {
		data: data as Frontmatter,
		content: htmlContent,
		headers,
	};
}
