---
title: Exporting Your Content
description: How to export your blog content from Grove
category: help
section: writing-publishing
lastUpdated: "2026-02-10"
keywords:
  - export
  - download
  - backup
  - data
  - portability
  - markdown
  - json
  - leaving
  - migrate
order: 1
---

# Exporting Your Content

Everything you write on Grove belongs to you. Here's how to get a complete copy of your data.

## How to export

Grove offers two ways to get your content, depending on what you need.

### Quick Export (JSON)

For a quick backup or if you're comfortable with JSON:

1. Go to **Account & Subscription** in your admin panel
2. Scroll to the **Your Data** section
3. Choose what to export:
   - **Full Export**: All posts, pages, and media metadata
   - **Posts Only**: Just your blog posts
   - **Media Only**: Just your uploaded file information
4. Click **Export Data**
5. Your browser downloads a JSON file

The page shows an estimate before you export: how many posts, pages, and media files will be included.

### Full Export (ZIP)

For everything organized and ready to use:

1. Go to **Settings → Export** in your admin panel
2. Choose your options:
   - **Include images**: Toggle to download actual image files from your blog
   - **Delivery method**: Get the ZIP as an in-browser download or sent to your email
3. Click **Start Export**
4. We process your content in the background and notify you when it's ready

That's it. Your words, your images, organized exactly how you'd want them.

## What's in a ZIP export

Your ZIP file contains everything organized into folders:

```
grove-export-yourusername-2026-02-10/
├── blooms/
│   ├── my-first-post.md
│   ├── reflections-on-spring.md
│   └── ...
├── pages/
│   ├── about.md
│   ├── contact.md
│   └── ...
├── images/
│   ├── sunset.jpg
│   ├── header.png
│   └── ...
└── README.md
```

**Blooms** are your posts, each as a Markdown file with YAML frontmatter (title, date, tags, etc. at the top). The content is ready to paste into any other platform.

**Pages** are your custom pages, also as Markdown.

**Images** are the actual files from your blog—not URLs, but real image files you can use immediately.

**README** explains everything inside so you're never confused about what you're looking at.

## What's in the JSON export

If you use the Quick Export, you get a JSON file with all the same data. Here's what you get:

**Posts** include the title, content (in Markdown), tags, status, and publication date.

**Pages** include any custom pages you've created.

**Media** is a list of your uploaded files with filenames, URLs, and sizes. You can visit each URL to download the actual file.

Example structure:

```json
{
  "exportedAt": "2026-01-15T12:00:00.000Z",
  "type": "full",
  "posts": [
    {
      "slug": "my-first-post",
      "title": "My First Post",
      "content": "# Hello world\n\nThis is my post content in Markdown...",
      "tags": ["intro", "personal"],
      "status": "published",
      "publishedAt": "2026-01-10T10:00:00.000Z"
    }
  ],
  "pages": [...],
  "media": [
    {
      "filename": "sunset.jpg",
      "url": "https://cdn.grove.place/...",
      "size": 245000,
      "mimeType": "image/jpeg"
    }
  ]
}
```

## Working with your exports

**For ZIP exports:** Download, unzip, and you're ready to go. Paste the Markdown files anywhere. Upload images where you need them. No conversion needed.

**For JSON exports:** If you're comfortable with code, the structure is straightforward—parse it with any programming language, extract the `content` field from each post, and you have portable Markdown. If you're not a developer, open the JSON file in any text editor, search for `"content":` to jump between posts, and copy-paste into any other platform.

## Limits

**Rate limit**: 10 exports per hour. This prevents abuse while giving you plenty of room for regular use.

**Size limit**: 5,000 items per category (posts, pages, or media). If you have more than that, contact support for a bulk export.

## Full ZIP Export (Now Available)

The ZIP export is live and ready to use. Here's what happens when you create one:

**Background processing:** We handle everything for you. Just start the export and go—we'll process your content in the background, even if you close the window.

**Progress tracking:** Watch real-time progress in the admin panel. See exactly what's being packaged.

**Email delivery:** Choose to have the download link sent to your email. Perfect for large exports.

**In-browser download:** Or grab it immediately as soon as it's ready.

**Automatic cleanup:** Exports expire after 7 days and are automatically removed from our servers. You don't have to worry about us keeping copies of your content around.

**Rate limits:** You can create 3 exports per day and run 1 at a time. This prevents abuse and keeps our infrastructure happy.

The ZIP is the easiest way to take your content anywhere. Everything is organized, ready to use, and you don't need to understand any technical formats to use it.

## When you might want to export

**Regular backups.** Even though we back up your data, having your own copy is smart. Export every few months if it gives you peace of mind.

**Moving to another platform.** If Grove stops being the right fit, your export has everything you need. The content is Markdown, which works almost everywhere.

**Archiving.** If you're winding down a blog but want to keep the content, export gives you a permanent local copy.

## If you're leaving Grove

We believe your data should never be held hostage. When you cancel:

- Export remains available through your admin panel
- Your data stays available for 90 days after cancellation
- After 90 days, it's permanently deleted from our servers

No transfer fees. No artificial delays. No "pay to keep your data" schemes.

## What about my domain?

If you're on Evergreen with a domain included:

- The domain is registered in your name. You own it
- Request a transfer authorization code anytime
- We provide it within 48 hours
- No transfer fees from our side

Your domain goes where you go.

---

_Your content is yours. We mean that literally. Take it whenever you want._
