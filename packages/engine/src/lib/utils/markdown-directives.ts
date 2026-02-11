/**
 * Grove Fenced Directive Plugin for markdown-it
 *
 * Syntax: ::name[content]::
 *
 * Registers a block rule that matches lines like:
 *   ::gallery[https://cdn.grove.place/a.jpg, https://cdn.grove.place/b.jpg]::
 *
 * A directive handler map dispatches by name. Currently supports:
 *   - gallery: renders an image grid
 *
 * Future directives (callout, embed, aside) plug into the handler map.
 */

import type MarkdownIt from "markdown-it";
import type StateBlock from "markdown-it/lib/rules_block/state_block.mjs";

/**
 * Escape HTML special characters for safe embedding in attributes and content.
 */
function escapeHtml(str: string): string {
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

// ============================================================================
// Directive Handlers
// ============================================================================

type DirectiveHandler = (content: string) => string | null;

/**
 * Gallery directive: renders a CSS grid of images.
 *
 * Input content: comma-separated URLs
 * Output: .grove-gallery container with .grove-gallery-item figures
 */
function handleGallery(content: string): string | null {
  const urls = content
    .split(",")
    .map((u) => u.trim())
    .filter((u) => u.length > 0);

  if (urls.length === 0) return null;

  const items = urls
    .map((url) => {
      const safeUrl = escapeHtml(url);
      return `<figure class="grove-gallery-item"><img src="${safeUrl}" alt="" loading="lazy" /></figure>`;
    })
    .join("\n  ");

  return `<div class="grove-gallery" data-images="${urls.length}">\n  ${items}\n</div>\n`;
}

/** Map of directive names to their handlers */
const directiveHandlers: Record<string, DirectiveHandler> = {
  gallery: handleGallery,
};

// ============================================================================
// Block Rule
// ============================================================================

/** Regex matching a directive line: ::name[content]:: */
const DIRECTIVE_RE = /^::(\w+)\[([^\]]*)\]::$/;

/**
 * markdown-it block rule for Grove fenced directives.
 *
 * Scans each line for the ^::name[content]::$ pattern. When matched,
 * dispatches to the appropriate handler and emits an html_block token.
 */
function directiveBlockRule(
  state: StateBlock,
  startLine: number,
  _endLine: number,
  silent: boolean,
): boolean {
  const pos = state.bMarks[startLine] + state.tShift[startLine];
  const max = state.eMarks[startLine];
  const lineText = state.src.slice(pos, max).trim();

  const match = DIRECTIVE_RE.exec(lineText);
  if (!match) return false;

  // In validation mode, just confirm we'd match
  if (silent) return true;

  const directiveName = match[1].toLowerCase();
  const directiveContent = match[2];

  const handler = directiveHandlers[directiveName];
  if (!handler) return false;

  const html = handler(directiveContent);
  if (!html) return false;

  // Emit an html_block token with the rendered content
  const token = state.push("html_block", "", 0);
  token.content = html;
  token.map = [startLine, startLine + 1];

  state.line = startLine + 1;
  return true;
}

// ============================================================================
// Plugin Export
// ============================================================================

/**
 * markdown-it plugin that transforms ::name[content]:: directives into HTML.
 *
 * Usage:
 *   import { groveDirectivePlugin } from "$lib/utils/markdown-directives";
 *   md.use(groveDirectivePlugin);
 */
export function groveDirectivePlugin(md: MarkdownIt): void {
  md.block.ruler.before("paragraph", "grove_directive", directiveBlockRule, {
    alt: ["paragraph", "reference", "blockquote"],
  });
}
