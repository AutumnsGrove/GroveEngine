---
title: "Data Portability"
slug: data-portability
category: data
order: 2
keywords: [export, migrate, move, transfer, wordpress, ghost, hugo, markdown, portable, leaving, import]
related: [exporting-your-content, account-deletion, understanding-your-privacy]
---

# Data Portability

Your content belongs to you. Not just philosophically—practically. Here's what you can do with your exported Grove data.

## What you get when you export

Grove exports your data in standard formats:

- **Posts** — Markdown files with YAML frontmatter
- **Images** — Original files (JPEG, PNG, WebP, etc.)
- **Comments** — JSON with author, content, timestamps
- **Settings** — JSON with your site configuration

These aren't proprietary formats. They're the same formats used across the industry. Your writing doesn't need Grove to exist.

## Moving to another platform

### WordPress

WordPress can import Markdown files, though you'll need a plugin:

1. Install a Markdown import plugin (like "Jeykll Exporter" in reverse, or "WP All Import")
2. Upload your exported post files
3. Map the frontmatter fields to WordPress categories/tags

Alternatively, copy-paste from your Markdown files into the WordPress editor. It's tedious for large archives but works for smaller blogs.

### Ghost

Ghost uses Markdown natively:

1. In Ghost admin, go to **Settings → Import/Export**
2. Ghost expects a specific JSON format, so you may need to convert
3. Images can be uploaded to Ghost's media library

Ghost's import format is JSON-based. You can write a simple script to convert Grove's format, or import posts manually.

### Hugo, Jekyll, and other static site generators

These are the easiest targets. Static generators typically expect Markdown with frontmatter—exactly what Grove exports.

1. Copy your posts folder into the generator's content directory
2. Adjust frontmatter field names if needed (e.g., `tags` vs `categories`)
3. Copy images to your static/assets folder
4. Build and deploy

### Self-hosted solutions

Markdown works anywhere. Open your exported files in any text editor, and your words are right there. No database required, no special software needed.

## Your domain comes with you

If you registered a domain through Grove (Evergreen tier), you own it. Not Grove.

When you leave:
- Request a transfer authorization code
- We provide it within 48 hours
- Transfer to any registrar you choose
- No fees from our side

Your domain was always yours. We just helped you find and register it.

## What about comments?

Exported comments include:
- Author name and email
- Comment content
- Timestamp
- Which post they belong to

Most platforms don't have a standard comment import format, so you may need to handle these manually or through custom migration scripts. The data is there; how you use it depends on your destination.

## The 90-day window

After you cancel:
- Your content stays accessible for 90 days
- You can export anytime during this period
- We'll also email you a download link
- After 90 days, content is permanently deleted

This isn't a threat—it's a promise. We don't keep data we don't need. But you have three months to make sure you have everything.

## No lock-in, period

Some platforms make leaving hard. Export fees. Proprietary formats. "Contact sales to discuss migration."

Grove's approach:
- Export is free, always
- Formats are standard, always
- No artificial delays
- No "pay to keep your data" schemes

If you want to leave, take your words and go. We'd rather you left happy than stayed trapped.

---

*For the technical details of Grove's export format, see [Exporting Your Content](/knowledge/help/exporting-your-content).*
