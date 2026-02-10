---
title: Data Portability
description: "Taking your Grove content to WordPress, Ghost, Hugo, or anywhere else"
category: help
section: privacy-security
lastUpdated: "2026-02-10"
keywords:
  - export
  - migrate
  - move
  - transfer
  - wordpress
  - ghost
  - hugo
  - markdown
  - portable
  - leaving
  - import
order: 2
---

# Data Portability

Your content belongs to you. Not just philosophically—practically. Here's what you can do with your exported Grove data.

## Export formats available

Grove offers two export options:

**ZIP Export** (recommended for migration) — Organized folders with Markdown files, actual images, and a README. Everything ready to use, no conversion needed.

**JSON Export** — All your data in one file. Good for backups or if you need to parse and transform the data programmatically.

Both formats include your posts, pages, and media. The content is always in Markdown, which works everywhere.

## Moving to another platform

### WordPress

**With ZIP export:** Download your ZIP export. Each post is a Markdown file—copy-paste them into WordPress. If you have images, upload them to WordPress media and update the image references in your posts.

**With JSON export:** Open the file in a text editor, find each post's `"content"` field (that's your Markdown), and copy-paste into WordPress. Or use a simple script to parse the JSON and create individual files.

### Ghost

Ghost uses Markdown natively:

**With ZIP export:** Download your ZIP, unzip it, and you have all the Markdown files. Ghost can import them directly, or you can copy-paste the content into Ghost's editor.

**With JSON export:** Parse your Grove export JSON, transform it to Ghost's import format (similar structure, different field names), and import via **Settings → Import/Export** in Ghost admin. A few lines of code handles the conversion.

### Hugo, Jekyll, and other static site generators

Static generators expect Markdown files with frontmatter. Here's the easiest path:

**With ZIP export:** Download your ZIP export. Each post is already a Markdown file with YAML frontmatter—exactly what static generators expect. Copy the files into your site's content directory, copy images into your assets folder, and build.

**With JSON export:** Parse your Grove JSON export, write each post as a separate `.md` file with YAML frontmatter, download your images from their URLs, and build and deploy.

### Self-hosted solutions

The Markdown content in your export works anywhere. Parse the JSON, grab the `content` field from each post, and you have plain text that opens in any editor.

## ZIP Export (Available Now)

The ZIP export is live and makes migration simple:

- **ZIP file** with organized folders (posts, pages, images)
- **Markdown files** for each post and page with YAML frontmatter
- **Actual media files** included (not just URLs to download)
- **README** explaining everything

No parsing required. Download, unzip, and your content is ready to use anywhere. Static site generators get Markdown files with proper frontmatter. WordPress gets files you can paste directly. Every platform gets what it needs.

## Your domain comes with you

If you registered a domain through Grove (Evergreen tier), you own it. Not Grove.

When you leave:

- Request a transfer authorization code
- We provide it within 48 hours
- Transfer to any registrar you choose
- No fees from our side

Your domain was always yours. We just helped you find and register it.

## The 90-day window

After you cancel:

- Your content stays accessible for 90 days
- You can export anytime during this period
- After 90 days, content is permanently deleted

This isn't a threat, it's a promise. We don't keep data we don't need. But you have three months to make sure you have everything.

## No lock-in, period

Some platforms make leaving hard. Export fees. Proprietary formats. "Contact sales to discuss migration."

Grove's approach:

- Export is free, always
- Formats are standard, always
- No artificial delays
- No "pay to keep your data" schemes

If you want to leave, take your words and go. We'd rather you left happy than stayed trapped.

---

_For step-by-step export instructions, see [[exporting-your-content|Exporting Your Content]]._
