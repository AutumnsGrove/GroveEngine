/**
 * Base Email Template
 *
 * Provides the consistent Grove look for all emails:
 * - Warm cream background
 * - Centered container
 * - Header with logo
 * - Content area with soft green card
 * - Footer with signature and unsubscribe
 */

// =============================================================================
// Grove Email Colors
// =============================================================================

export const COLORS = {
  warmCream: "#fefdfb",
  softGreen: "#f0fdf4",
  barkBrown: "#3d2914",
  groveGreen: "#16a34a",
  textMuted: "rgba(61, 41, 20, 0.6)",
  textSubtle: "rgba(61, 41, 20, 0.4)",
} as const;

// =============================================================================
// Base Template Wrapper
// =============================================================================

export interface BaseEmailOptions {
  /** Preview text shown in email clients */
  previewText?: string;
  /** Hide the Grove logo header */
  hideHeader?: boolean;
  /** Hide the footer with signature */
  hideFooter?: boolean;
  /** Custom signature (default: "— Autumn") */
  signature?: string;
  /** Main content HTML */
  content: string;
}

/**
 * Wrap content in the Grove email template.
 */
export function wrapEmail(options: BaseEmailOptions): string {
  const {
    previewText,
    hideHeader = false,
    hideFooter = false,
    signature = "— Autumn",
    content,
  } = options;

  const preview = previewText
    ? `<div style="display:none;max-height:0;overflow:hidden;">${escapeHtml(previewText)}</div>`
    : "";

  const header = hideHeader
    ? ""
    : `
    <div style="text-align: center; padding-bottom: 30px;">
      <a href="https://grove.place" style="display: inline-block;">
        <img src="https://grove.place/logo.svg" width="48" height="48" alt="Grove" style="display: inline-block;">
      </a>
    </div>
  `;

  const footer = hideFooter
    ? ""
    : `
    <div style="text-align: center; padding-top: 40px;">
      <p style="margin: 0 0 8px 0; font-size: 14px; color: ${COLORS.barkBrown}; opacity: 0.6;">${escapeHtml(signature)}</p>
      <p style="margin: 0 0 16px 0; font-size: 12px; color: ${COLORS.barkBrown}; opacity: 0.5;"><em>A place to be.</em></p>
      <p style="margin: 0; font-size: 11px; color: ${COLORS.barkBrown}; opacity: 0.4;">
        <a href="https://grove.place" style="color: inherit; text-decoration: none;">grove.place</a>
        &nbsp;·&nbsp;
        <a href="{{{RESEND_UNSUBSCRIBE_URL}}}" style="color: inherit; text-decoration: none;">step away (unsubscribe)</a>
      </p>
    </div>
  `;

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light">
  <meta name="supported-color-schemes" content="light">
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Georgia&display=swap');
  </style>
</head>
<body style="margin: 0; padding: 0; background-color: ${COLORS.warmCream}; font-family: Georgia, Cambria, 'Times New Roman', serif;">
  ${preview}
  <div style="max-width: 600px; margin: 0 auto; padding: 40px 20px;">
    ${header}
    <div style="padding: 30px; background-color: ${COLORS.softGreen}; border-radius: 12px;">
      ${content}
    </div>
    ${footer}
  </div>
</body>
</html>`;
}

// =============================================================================
// HTML Helpers
// =============================================================================

/**
 * Escape HTML special characters.
 */
export function escapeHtml(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

/**
 * Create a paragraph with Grove styling.
 */
export function paragraph(text: string): string {
  return `<p style="margin: 0 0 16px 0; font-size: 16px; line-height: 1.6; color: ${COLORS.barkBrown};">${text}</p>`;
}

/**
 * Create a heading with Grove styling.
 */
export function heading(text: string, level: 1 | 2 | 3 = 2): string {
  const sizes = { 1: "24px", 2: "20px", 3: "18px" };
  return `<h${level} style="margin: 0 0 16px 0; font-size: ${sizes[level]}; font-weight: normal; line-height: 1.3; color: ${COLORS.barkBrown};">${escapeHtml(text)}</h${level}>`;
}

/**
 * Create a button with Grove styling.
 */
export function button(text: string, href: string): string {
  return `
    <div style="text-align: center; margin: 24px 0;">
      <a href="${escapeHtml(href)}" style="display: inline-block; padding: 12px 24px; background-color: ${COLORS.groveGreen}; color: white; text-decoration: none; border-radius: 8px; font-size: 16px; font-weight: 500;">${escapeHtml(text)}</a>
    </div>
  `;
}

/**
 * Create a horizontal divider.
 */
export function divider(): string {
  return `<hr style="border: none; border-top: 1px solid rgba(61, 41, 20, 0.1); margin: 24px 0;">`;
}

/**
 * Create a highlighted box.
 */
export function highlight(content: string): string {
  return `
    <div style="padding: 16px; background-color: rgba(22, 163, 74, 0.1); border-radius: 8px; margin: 16px 0;">
      ${content}
    </div>
  `;
}

/**
 * Create a code display (for verification codes).
 */
export function codeBox(code: string): string {
  return `
    <div style="text-align: center; margin: 24px 0;">
      <div style="display: inline-block; padding: 16px 32px; background-color: white; border: 2px solid ${COLORS.groveGreen}; border-radius: 8px; font-size: 32px; font-weight: bold; letter-spacing: 8px; color: ${COLORS.barkBrown};">${escapeHtml(code)}</div>
    </div>
  `;
}

/**
 * Create a link with Grove styling.
 */
export function link(text: string, href: string): string {
  return `<a href="${escapeHtml(href)}" style="color: ${COLORS.groveGreen}; text-decoration: none;">${escapeHtml(text)}</a>`;
}

/**
 * Convert HTML to plain text.
 */
export function htmlToText(html: string): string {
  return html
    .replace(/<a[^>]+href="([^"]*)"[^>]*>([^<]*)<\/a>/gi, "$2 ($1)")
    .replace(/<h[1-6][^>]*>([^<]*)<\/h[1-6]>/gi, "\n$1\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<li[^>]*>/gi, "• ")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#039;/g, "'")
    .replace(/\n\s*\n\s*\n/g, "\n\n")
    .trim();
}
