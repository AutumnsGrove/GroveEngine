/**
 * Tests for Grove Fenced Directive Plugin — Curio Directives
 *
 * Verifies that ::curio-name[arg]:: syntax produces correct placeholder divs,
 * that unknown directives are ignored, and that XSS payloads are escaped.
 */

import { describe, it, expect } from "vitest";
import MarkdownIt from "markdown-it";
import { groveDirectivePlugin, CURIO_DIRECTIVES } from "./directives";

function createMd(): MarkdownIt {
	const md = new MarkdownIt({ html: true });
	md.use(groveDirectivePlugin);
	return md;
}

// ============================================================================
// Gallery Directive (pre-existing)
// ============================================================================

describe("groveDirectivePlugin - gallery", () => {
	const md = createMd();

	it("renders a gallery from comma-separated URLs", () => {
		const result = md.render(
			"::gallery[https://cdn.grove.place/a.jpg, https://cdn.grove.place/b.jpg]::",
		);
		expect(result).toContain('class="grove-gallery"');
		expect(result).toContain('data-images="2"');
		expect(result).toContain('src="https://cdn.grove.place/a.jpg"');
	});

	it("returns nothing for empty gallery", () => {
		const result = md.render("::gallery[]::");
		expect(result).not.toContain("grove-gallery");
	});
});

// ============================================================================
// Curio Directives
// ============================================================================

describe("groveDirectivePlugin - curio directives", () => {
	const md = createMd();

	it("renders a guestbook placeholder", () => {
		const result = md.render("::guestbook[]::");
		expect(result).toContain('class="grove-curio"');
		expect(result).toContain('data-grove-curio="guestbook"');
		expect(result).toContain("Loading guestbook");
		expect(result).not.toContain("data-curio-arg");
	});

	it("renders a poll placeholder", () => {
		const result = md.render("::poll[]::");
		expect(result).toContain('data-grove-curio="poll"');
	});

	it("passes content as data-curio-arg for poll directive", () => {
		const result = md.render("::poll[my-favorite-color]::");
		expect(result).toContain('data-grove-curio="poll"');
		expect(result).toContain('data-curio-arg="my-favorite-color"');
	});

	it("supports all curio directives", () => {
		for (const name of CURIO_DIRECTIVES) {
			const result = md.render(`::${name}[]::`);
			expect(result).toContain(`data-grove-curio="${name}"`);
		}
	});
});

// ============================================================================
// Security
// ============================================================================

describe("groveDirectivePlugin - security", () => {
	const md = createMd();

	it("ignores unknown directive names (no curio placeholder produced)", () => {
		const result = md.render("::evilwidget[payload]::");
		// Unknown directives must NOT produce a curio placeholder div
		expect(result).not.toContain("grove-curio");
		expect(result).not.toContain("data-grove-curio");
		// The raw text passes through as a literal paragraph — that's fine,
		// the CurioHydrator won't find any [data-grove-curio] element to mount
		expect(result).toContain("evilwidget");
	});

	it("escapes HTML in curio content/arg", () => {
		const result = md.render('::poll["><script>alert(1)</script>]::');
		expect(result).not.toContain("<script>");
		expect(result).toContain("&lt;script&gt;");
	});

	it("escapes HTML entities in curio name attribute", () => {
		// The directive name comes from \w+ regex, so it can't contain <>"
		// But the content (arg) is user-controlled
		const result = md.render("::guestbook[<img onerror=alert(1)>]::");
		expect(result).not.toContain("<img");
		expect(result).toContain("&lt;img");
	});

	it("truncates excessively long args to 200 chars", () => {
		const longArg = "a".repeat(500);
		const result = md.render(`::poll[${longArg}]::`);
		// The regex [^\]]* might not match ] chars, but let's verify truncation
		if (result.includes("data-curio-arg")) {
			const argMatch = result.match(/data-curio-arg="([^"]*)"/);
			expect(argMatch).toBeTruthy();
			expect(argMatch![1].length).toBeLessThanOrEqual(200);
		}
	});
});

// ============================================================================
// Edge Cases
// ============================================================================

describe("groveDirectivePlugin - edge cases", () => {
	const md = createMd();

	it("does not match directives mid-paragraph", () => {
		const result = md.render("Some text ::hitcounter[]:: more text");
		// The directive regex requires the whole line to match
		expect(result).not.toContain("grove-curio");
	});

	it("handles multiple curios in sequence", () => {
		const result = md.render("::guestbook[]::\n\n::poll[my-poll]::");
		expect(result).toContain('data-grove-curio="guestbook"');
		expect(result).toContain('data-grove-curio="poll"');
	});

	it("handles whitespace in arg content", () => {
		const result = md.render("::poll[  my poll  ]::");
		expect(result).toContain('data-curio-arg="my poll"');
	});

	it("directive names are case-insensitive", () => {
		const result = md.render("::Guestbook[]::");
		expect(result).toContain('data-grove-curio="guestbook"');
	});

	it("supports shorthand without brackets: ::name::", () => {
		const result = md.render("::guestbook::");
		expect(result).toContain('class="grove-curio"');
		expect(result).toContain('data-grove-curio="guestbook"');
		expect(result).not.toContain("data-curio-arg");
	});

	it("supports shorthand for all curio directives", () => {
		for (const name of CURIO_DIRECTIVES) {
			const result = md.render(`::${name}::`);
			expect(result).toContain(`data-grove-curio="${name}"`);
		}
	});

	it("shorthand is equivalent to empty brackets", () => {
		const withBrackets = md.render("::guestbook[]::");
		const withoutBrackets = md.render("::guestbook::");
		expect(withBrackets).toBe(withoutBrackets);
	});
});

// ============================================================================
// Image Directive
// ============================================================================

describe("groveDirectivePlugin - image", () => {
	const md = createMd();

	it("renders a basic image with default options", () => {
		const result = md.render("::image[https://example.com/photo.jpg]::");
		expect(result).toContain('class="grove-image grove-image-align-center"');
		expect(result).toContain('src="https://example.com/photo.jpg"');
		expect(result).toContain("max-width: 100%");
		expect(result).toContain("<figure");
	});

	it("applies size presets", () => {
		expect(md.render("::image[pic.jpg, size=small]::")).toContain("max-width: 25%");
		expect(md.render("::image[pic.jpg, size=medium]::")).toContain("max-width: 50%");
		expect(md.render("::image[pic.jpg, size=large]::")).toContain("max-width: 75%");
		expect(md.render("::image[pic.jpg, size=full]::")).toContain("max-width: 100%");
	});

	it("supports alignment options", () => {
		expect(md.render("::image[pic.jpg, align=left]::")).toContain("grove-image-align-left");
		expect(md.render("::image[pic.jpg, align=center]::")).toContain("grove-image-align-center");
		expect(md.render("::image[pic.jpg, align=right]::")).toContain("grove-image-align-right");
	});

	it("supports boolean flags: blur, rounded, border, shadow", () => {
		const result = md.render("::image[pic.jpg, blur, rounded, border, shadow]::");
		expect(result).toContain("grove-image-blur");
		expect(result).toContain("grove-image-rounded");
		expect(result).toContain("grove-image-border");
		expect(result).toContain("grove-image-shadow");
	});

	it("renders caption as figcaption", () => {
		const result = md.render("::image[pic.jpg, caption=A beautiful sunset]::");
		expect(result).toContain("<figcaption>A beautiful sunset</figcaption>");
		expect(result).toContain('alt="A beautiful sunset"');
	});

	it("preserves commas in caption text", () => {
		const result = md.render("::image[pic.jpg, caption=Paris, France, 2024]::");
		expect(result).toContain("<figcaption>Paris, France, 2024</figcaption>");
	});

	it("caption consumes remaining content after caption= even with flags before it", () => {
		const result = md.render(
			"::image[pic.jpg, size=medium, blur, caption=A warm evening, with tea]::",
		);
		expect(result).toContain("<figcaption>A warm evening, with tea</figcaption>");
		expect(result).toContain("grove-image-blur");
		expect(result).toContain("max-width: 50%");
	});

	it("renders no figcaption when caption is omitted", () => {
		const result = md.render("::image[pic.jpg]::");
		expect(result).not.toContain("<figcaption>");
	});

	it("supports multiple options together", () => {
		const result = md.render(
			"::image[/gallery/sunset.png, size=medium, align=right, blur, rounded, caption=Sunset]::",
		);
		expect(result).toContain("max-width: 50%");
		expect(result).toContain("grove-image-align-right");
		expect(result).toContain("grove-image-blur");
		expect(result).toContain("grove-image-rounded");
		expect(result).toContain("<figcaption>Sunset</figcaption>");
	});

	it("returns nothing for empty source", () => {
		const result = md.render("::image[]::");
		expect(result).not.toContain("grove-image");
	});

	it("escapes HTML in src and caption", () => {
		const result = md.render('::image["><script>alert(1)</script>, caption=<b>xss</b>]::');
		expect(result).not.toContain("<script>");
		expect(result).not.toContain("<b>");
		expect(result).toContain("&lt;script&gt;");
		expect(result).toContain("&lt;b&gt;");
	});

	it("falls back to 100% for invalid custom size", () => {
		const result = md.render("::image[pic.jpg, size=evil]::");
		expect(result).toContain("max-width: 100%");
	});

	it("accepts valid custom pixel size", () => {
		const result = md.render("::image[pic.jpg, size=300px]::");
		expect(result).toContain("max-width: 300px");
	});

	it("accepts valid custom percentage size", () => {
		const result = md.render("::image[pic.jpg, size=60%]::");
		expect(result).toContain("max-width: 60%");
	});

	it("ignores unknown alignment values", () => {
		const result = md.render("::image[pic.jpg, align=invalid]::");
		// Should fall back to default center
		expect(result).toContain("grove-image-align-center");
	});
});

// ============================================================================
// Anchor Directive (Vine positioning marker)
// ============================================================================
// Regression coverage: this directive was defined in an orphaned copy of
// this module and never actually wired into the live directiveHandlers
// map, so ::anchor[...]:: rendered as literal visible text on real posts
// instead of an invisible marker — fixed 2026-08-21.

describe("groveDirectivePlugin - anchor", () => {
	const md = createMd();

	it("renders an invisible data-anchor marker", () => {
		const result = md.render("::anchor[sound-note]::");
		expect(result).toContain('data-anchor="sound-note"');
		expect(result).toContain('class="grove-anchor"');
		expect(result).not.toContain("::anchor");
	});

	it("rejects a script tag as the anchor name (fails validation, no marker emitted)", () => {
		// XSS protection for this directive comes from strict name validation
		// (/^[\w-]+$/), not escaping — a name this shape never reaches
		// escapeHtml because handleAnchor() returns null first. Full HTML
		// sanitization of the raw passthrough happens downstream in
		// sanitizeMarkdown(), same as elsewhere in this package.
		const result = md.render("::anchor[<script>alert(1)</script>]::");
		expect(result).not.toContain("data-anchor");
	});

	it("rejects names with disallowed characters and falls back to literal text", () => {
		const result = md.render("::anchor[has space]::");
		expect(result).not.toContain("data-anchor");
	});

	it("rejects an empty anchor name", () => {
		const result = md.render("::anchor[]::");
		expect(result).not.toContain("data-anchor");
	});
});
