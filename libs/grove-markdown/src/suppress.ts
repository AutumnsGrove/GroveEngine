/**
 * Grove Suppress-Heading Plugin for markdown-it
 *
 * Adds a `::suppress::` marker that can be placed on a heading line to
 * render it as a visual heading (big text) without listing it in the
 * table of contents. Some authors use headings purely for visual
 * styling and want a way to opt out of the TOC for those cases.
 *
 * Accepted placements:
 *   ### ::suppress:: feeling good about this
 *   ### feeling good about this ::suppress::
 *   ::suppress:: ### feeling good about this    (prefix form)
 *
 * The prefix form is rewritten to the suffix form before block parsing,
 * so all three flow through one code path from inline processing
 * onward.
 *
 * Skipping from the table of contents is handled separately by
 * `extractHeaders` in markdown.ts — that function runs against the raw
 * markdown and looks for the same marker substring. Both paths must
 * agree.
 */

import type MarkdownIt from "markdown-it";
import type StateCore from "markdown-it/lib/rules_core/state_core.mjs";
import type Token from "markdown-it/lib/token.mjs";

/** Literal marker text. */
export const SUPPRESS_MARKER = "::suppress::";

/** Matches the marker anywhere in a string (global). */
export const SUPPRESS_MARKER_RE = /::suppress::/g;

/**
 * Matches a line where the marker is a prefix before an ATX heading.
 * Captures the heading portion (level marks + text) for rewriting.
 * Multiline + anchored so only full lines are touched.
 */
const SUPPRESS_PREFIX_LINE_RE = /^::suppress::[ \t]+(#{1,6}[ \t]+.+)$/gm;

/**
 * Check whether a raw heading line is marked for TOC suppression.
 * Used by `extractHeaders` to skip marked headings. Returns true for
 * all three accepted placements.
 */
export function isSuppressedHeadingLine(line: string): boolean {
	return line.includes(SUPPRESS_MARKER);
}

/**
 * Core rule: rewrite the prefix form to the suffix form so one set of
 * downstream logic handles every variant. Runs before block parsing
 * so markdown-it actually sees a valid heading line on the other side.
 */
function suppressPreprocess(state: StateCore): void {
	if (!state.src.includes(SUPPRESS_MARKER)) return;
	state.src = state.src.replace(SUPPRESS_PREFIX_LINE_RE, "$1 " + SUPPRESS_MARKER);
}

/**
 * Core rule: walk heading inline tokens and scrub `::suppress::` from
 * their content and child text tokens so the rendered heading shows
 * clean text. Runs after inline parsing so inline children are
 * populated.
 *
 * We also set `token.meta.suppressed = true` on the heading_open token
 * so any downstream renderer that cares (for example, a TOC-aware
 * renderer in the future) can read the flag without re-parsing the
 * content. The current heading_open rule in markdown.ts doesn't read
 * this flag yet — extractHeaders handles the TOC filtering on the raw
 * markdown side — but the metadata is free and harmless to set.
 */
function suppressHeadings(state: StateCore): void {
	const tokens = state.tokens;
	for (let i = 0; i < tokens.length - 1; i++) {
		if (tokens[i].type !== "heading_open") continue;
		const inline = tokens[i + 1];
		if (!inline || inline.type !== "inline") continue;
		if (!inline.content.includes(SUPPRESS_MARKER)) continue;

		// Scrub the flat content string (used by heading_open for id generation)
		inline.content = inline.content.replace(SUPPRESS_MARKER_RE, "").replace(/\s+/g, " ").trim();

		// Scrub every text child and drop any that become empty
		if (inline.children) {
			const cleaned: Token[] = [];
			for (const child of inline.children) {
				if (child.type === "text") {
					child.content = child.content.replace(SUPPRESS_MARKER_RE, "");
					if (child.content === "") continue;
				}
				cleaned.push(child);
			}
			// Trim leading whitespace on the first text child, trailing on the last
			if (cleaned.length > 0) {
				const first = cleaned[0];
				if (first.type === "text") first.content = first.content.replace(/^\s+/, "");
				const last = cleaned[cleaned.length - 1];
				if (last.type === "text") last.content = last.content.replace(/\s+$/, "");
			}
			inline.children = cleaned;
		}

		// Flag the heading for any renderer that wants to know
		tokens[i].meta = { ...(tokens[i].meta ?? {}), suppressed: true };
	}
}

/**
 * markdown-it plugin. Register once per markdown-it instance.
 *
 * Usage:
 *   import { suppressHeadingPlugin } from "@autumnsgrove/grove-markdown";
 *   md.use(suppressHeadingPlugin);
 */
export function suppressHeadingPlugin(md: MarkdownIt): void {
	md.core.ruler.before("block", "grove_suppress_preprocess", suppressPreprocess);
	md.core.ruler.after("inline", "grove_suppress_headings", suppressHeadings);
}
