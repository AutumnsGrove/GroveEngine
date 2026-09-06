---
title: Adding Images and Media
description: How to upload and use images in your posts
category: help
section: customization
lastUpdated: '2026-09-06'
keywords:
  - images
  - photos
  - upload
  - media
  - pictures
  - gif
  - png
  - jpeg
  - webp
  - cover image
order: 3
---

# Adding Images and Media

Images make posts more engaging. Here's how to add them to your Grove blog.

## Uploading an image

While editing a post:

1. Click the **Image** button in the toolbar (or drag an image directly into the editor)
2. Select a file from your device
3. Wait for the upload to complete
4. The image appears in your post

Grove handles the technical details—your image is stored securely and served from a fast CDN.

## What you can upload

**Supported formats:**
- JPEG: Best for photos
- PNG: Good for screenshots or images with text
- GIF: Animated images work
- WebP: Modern format, smaller file sizes

**Size limit:** 10MB per image. That's plenty for most photos. If your image is larger, you'll need to resize it before uploading.

## Cover images

Every post has a **Cover Image** field in the editor sidebar, right below the description. It appears at the top of your published post, above the title.

To set one:

1. Upload your image first (drag it into the editor, or use the [image uploader](/arbor/images))
2. Copy the image URL
3. Paste it into the **Cover Image** field

There's no built-in cropper, so pick an image that reads well wide—it displays full-width and gets cropped to fit, so a landscape-oriented photo works better than a tall one.

## Adding alt text

Alt text describes your image for people who can't see it: screen reader users, people with slow connections, or anyone who has images turned off. It also helps search engines understand your content.

When you upload an image, you can add alt text in the dialog that appears. Keep it brief but descriptive:

- Good: "A orange cat sleeping on a stack of books"
- Less helpful: "Image" or "cat.jpg"

If the image is purely decorative, you can leave alt text empty.

## Images in your content

Once uploaded, images appear inline with your text. You can add multiple images to a single post—there's no limit on how many.

Images are inserted as Markdown:

```markdown
![Alt text description](https://cdn.grove.place/your-image.jpg)
```

You don't need to write this yourself—the editor handles it when you upload.

## A few things to know

**Images are permanent.** Once uploaded, they stay on Grove's servers even if you remove them from a post. This keeps old links working.

**Duplicates are detected.** Upload the same image twice and Grove recognizes it, saving storage space.

**No video yet.** Grove doesn't host video files. You can embed videos from YouTube or Vimeo by pasting their URLs, but video uploads aren't supported.

---

*Photos, screenshots, art—whatever you're sharing, Grove makes it easy to include.*
