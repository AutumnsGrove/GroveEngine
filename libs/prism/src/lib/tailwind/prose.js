/**
 * Grove prose theme — shared @tailwindcss/typography CSS variable overrides.
 *
 * Maps Grove's semantic CSS custom properties onto the tw-prose-* variables
 * so the `prose` utility class inherits the Grove design system automatically.
 *
 * Usage in tailwind.config.js:
 *   import { groveProseConfig } from "@autumnsgrove/prism/tailwind/prose";
 *   export default {
 *     theme: { extend: { ...groveProseConfig } },
 *     plugins: [require("@tailwindcss/typography")],
 *   };
 */

/** @type {{ typography: (theme: Function) => Record<string, unknown> }} */
export const groveProseConfig = {
	typography: () => ({
		DEFAULT: {
			css: {
				"--tw-prose-body": "var(--color-foreground-muted)",
				"--tw-prose-headings": "var(--color-foreground)",
				"--tw-prose-lead": "var(--color-foreground-muted)",
				"--tw-prose-links": "var(--color-accent-text-muted)",
				"--tw-prose-bold": "var(--color-foreground)",
				"--tw-prose-counters": "var(--color-foreground-subtle)",
				"--tw-prose-bullets": "var(--color-foreground-subtle)",
				"--tw-prose-hr": "var(--color-border)",
				"--tw-prose-quotes": "var(--color-foreground)",
				"--tw-prose-quote-borders": "var(--color-accent-border)",
				"--tw-prose-captions": "var(--color-foreground-subtle)",
				"--tw-prose-code": "var(--color-foreground)",
				"--tw-prose-pre-code": "var(--color-foreground)",
				"--tw-prose-pre-bg": "var(--color-surface)",
				"--tw-prose-th-borders": "var(--color-border)",
				"--tw-prose-td-borders": "var(--color-border-subtle)",
				// Links
				a: {
					color: "var(--color-accent-text-muted)",
					textDecoration: "underline",
					"&:hover": {
						color: "var(--color-primary)",
					},
				},
				// Headings
				h1: {
					color: "var(--color-foreground)",
				},
				h2: {
					color: "var(--color-foreground)",
				},
				h3: {
					color: "var(--color-foreground)",
				},
				h4: {
					color: "var(--color-foreground)",
				},
				// Strong/bold
				strong: {
					color: "var(--color-foreground)",
				},
				// Code blocks
				code: {
					color: "var(--color-foreground)",
					backgroundColor: "var(--color-surface)",
					borderRadius: "0.25rem",
					padding: "0.125rem 0.25rem",
				},
				"code::before": {
					content: '""',
				},
				"code::after": {
					content: '""',
				},
				// Pre blocks
				pre: {
					backgroundColor: "var(--color-surface)",
					color: "var(--color-foreground)",
				},
				// Blockquotes
				blockquote: {
					borderLeftColor: "var(--color-accent-border)",
					color: "var(--color-foreground-muted)",
				},
				// Horizontal rules
				hr: {
					borderColor: "var(--color-border)",
				},
			},
		},
	}),
};
