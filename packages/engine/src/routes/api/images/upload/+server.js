import { json, error } from "@sveltejs/kit";
import { validateCSRF } from "$lib/utils/csrf.js";
import { validateFileSignature } from "$lib/utils/validation.js";

export async function POST({ request, platform, locals }) {
  // Authentication check
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  // CSRF check
  if (!validateCSRF(request)) {
    throw error(403, "Invalid origin");
  }

  // Check for R2 binding
  if (!platform?.env?.IMAGES) {
    throw error(500, "R2 bucket not configured");
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const folder = formData.get("folder") || "uploads";

    if (!file || !(file instanceof File)) {
      throw error(400, "No file provided");
    }

    // Validate file type (SVG removed for security - can contain embedded JavaScript)
    const allowedTypes = [
      "image/jpeg",
      "image/png",
      "image/gif",
      "image/webp",
    ];

    // 2. Check MIME type first
    if (!allowedTypes.includes(file.type)) {
      throw error(
        400,
        `Invalid file type: ${file.type}. Allowed: jpg, png, gif, webp`,
      );
    }

    // Validate file size (10MB max)
    const maxSize = 10 * 1024 * 1024;
    if (file.size > maxSize) {
      throw error(400, "File too large. Maximum size is 10MB");
    }

    // Read file once for both validation and upload
    const arrayBuffer = await file.arrayBuffer();

    // 1. Check magic bytes to prevent MIME type spoofing (use arrayBuffer we just read)
    const buffer = new Uint8Array(arrayBuffer);
    const isValidSignature = await (async () => {
      const FILE_SIGNATURES = {
        'image/jpeg': [
          [0xFF, 0xD8, 0xFF, 0xE0], // JPEG/JFIF
          [0xFF, 0xD8, 0xFF, 0xE1], // JPEG/Exif
          [0xFF, 0xD8, 0xFF, 0xE8]  // JPEG/SPIFF
        ],
        'image/png': [[0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A]],
        'image/gif': [
          [0x47, 0x49, 0x46, 0x38, 0x37, 0x61], // GIF87a
          [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]  // GIF89a
        ],
        'image/webp': [[0x52, 0x49, 0x46, 0x46]] // RIFF (WebP container)
      };
      const signatures = FILE_SIGNATURES[file.type];
      if (!signatures) return false;
      return signatures.some(sig => sig.every((byte, i) => buffer[i] === byte));
    })();

    if (!isValidSignature) {
      throw error(400, "Invalid file signature - file may be corrupted or spoofed");
    }

    // Sanitize filename
    const sanitizedName = file.name
      .toLowerCase()
      .replace(/[^a-z0-9.-]/g, "-")
      .replace(/-+/g, "-");

    // Sanitize folder path
    const sanitizedFolder = folder
      .toLowerCase()
      .replace(/[^a-z0-9/-]/g, "-")
      .replace(/-+/g, "-")
      .replace(/^\/+|\/+$/g, "");

    // Build the R2 key
    const key = `${sanitizedFolder}/${sanitizedName}`;

    // Upload to R2 with cache headers
    await platform.env.IMAGES.put(key, arrayBuffer, {
      httpMetadata: {
        contentType: file.type,
        cacheControl: 'public, max-age=31536000, immutable', // 1 year cache for immutable images
      },
    });

    // Build CDN URL
    const cdnUrl = `https://cdn.autumnsgrove.com/${key}`;

    return json({
      success: true,
      url: cdnUrl,
      key: key,
      filename: sanitizedName,
      size: file.size,
      type: file.type,
      markdown: `![Alt text](${cdnUrl})`,
      svelte: `<img src="${cdnUrl}" alt="Description" />`,
    }, {
      headers: {
        'Cache-Control': 'public, max-age=31536000',
      }
    });
  } catch (err) {
    if (err.status) throw err;
    console.error("Upload error:", err);
    throw error(500, "Failed to upload image");
  }
}
