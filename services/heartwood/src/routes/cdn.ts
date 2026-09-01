/**
 * CDN Routes - File upload and management for cdn.grove.place
 * All routes require admin access
 */

import { Hono } from "hono";
import { z } from "zod";
import { logGroveError } from "@autumnsgrove/lattice/errors";
import type { Env, CdnFileRow } from "../types.js";
import { isUserAdmin, createAuditLog } from "../db/queries.js";
import { createDbSession } from "../db/session.js";
import { extractBearerToken } from "../middleware/bearerAuth.js";
import { verifyAccessToken } from "../services/jwt.js";
import { checkRouteRateLimit } from "../middleware/rateLimit.js";
import { getClientIP, getUserAgent } from "../middleware/security.js";
import { generateUUID } from "../utils/crypto.js";
import { HW_SVC_ERRORS } from "../errors.js";
import {
	CDN_MAX_FILE_SIZE,
	CDN_R2_LIST_MAX_PAGES,
	RATE_LIMIT_CDN_UPLOAD,
	RATE_LIMIT_CDN_MIGRATE,
	RATE_LIMIT_CDN_MIGRATE_WINDOW,
	RATE_LIMIT_WINDOW,
	ADMIN_PAGINATION_MAX_LIMIT,
	ADMIN_PAGINATION_DEFAULT_LIMIT,
} from "../utils/constants.js";

// Define context variables for type-safe c.set()/c.get()
type Variables = {
	userId: string;
};

const cdn = new Hono<{ Bindings: Env; Variables: Variables }>();

// Allowed MIME types (expanded from images-only to support all web assets),
// each mapped to the file extension(s) it's allowed to be uploaded with.
// The extension is validated against this map (not just sanitized) so a
// crafted filename can't inject path segments into the R2 key by hiding
// them in what's supposed to be a 2-4 character extension.
const MIME_EXTENSIONS: Record<string, string[]> = {
	// Images
	"image/jpeg": ["jpg", "jpeg"],
	"image/png": ["png"],
	"image/gif": ["gif"],
	"image/webp": ["webp"],
	"image/svg+xml": ["svg"],
	"image/avif": ["avif"],
	"image/bmp": ["bmp"],
	"image/x-icon": ["ico"],
	// Videos
	"video/mp4": ["mp4"],
	"video/webm": ["webm"],
	"video/ogg": ["ogv", "ogg"],
	"video/quicktime": ["mov"],
	// Audio
	"audio/mpeg": ["mp3"],
	"audio/ogg": ["ogg", "oga"],
	"audio/wav": ["wav"],
	"audio/webm": ["weba", "webm"],
	// Fonts
	"font/ttf": ["ttf"],
	"font/otf": ["otf"],
	"font/woff": ["woff"],
	"font/woff2": ["woff2"],
	"application/font-woff": ["woff"],
	"application/font-woff2": ["woff2"],
	// Documents
	"application/pdf": ["pdf"],
	// Web assets
	"text/css": ["css"],
	"text/javascript": ["js"],
	"application/javascript": ["js"],
	"application/json": ["json"],
	// Archives (for font packages, etc)
	"application/zip": ["zip"],
};

// SVGs can carry <script> and execute if served inline — same class of bug
// fixed in grove-router's read path. Forced to download here too, as
// defense-in-depth in case this bucket is ever served by something other
// than grove-router (which already forces the same thing on read).
const FORCE_DOWNLOAD_TYPES = new Set(["image/svg+xml"]);

const CdnUploadMetaSchema = z.object({
	folder: z.string().optional().default(""),
	alt_text: z.string().nullable().optional(),
});

/**
 * Middleware: Verify admin access
 */
cdn.use("/*", async (c, next) => {
	const token = extractBearerToken(c.req.header("Authorization"));

	if (!token) {
		return c.json({ error: "unauthorized", error_description: "Missing or invalid token" }, 401);
	}

	const payload = await verifyAccessToken(c.env, token);

	if (!payload) {
		return c.json(
			{
				error: "invalid_token",
				error_description: "Token is invalid or expired",
			},
			401,
		);
	}

	const db = createDbSession(c.env);
	const isAdmin = await isUserAdmin(db, payload.sub);
	if (!isAdmin) {
		return c.json({ error: "forbidden", error_description: "Admin access required" }, 403);
	}

	// Store user ID for later use
	c.set("userId", payload.sub);

	await next();
});

/**
 * Sanitize filename for safe storage. Returns null if no usable extension
 * can be recovered — callers should reject rather than coerce, since a
 * silently-mangled name (see the old behavior for "README" or ".htaccess")
 * is worse than an explicit 400.
 */
function sanitizeFilename(filename: string): { baseName: string; ext: string } {
	// lastDot > 0 (not 0) so a dotfile like ".htaccess" is treated as having
	// no extension rather than extracting "htaccess" as one.
	const lastDot = filename.lastIndexOf(".");
	const hasExt = lastDot > 0;
	const ext = hasExt ? filename.slice(lastDot + 1).toLowerCase() : "";
	const baseNameRaw = hasExt ? filename.slice(0, lastDot) : filename;

	const clean =
		baseNameRaw
			.toLowerCase()
			.replace(/[^a-z0-9-_]/g, "-")
			.replace(/-+/g, "-")
			.replace(/^-+|-+$/g, "")
			.substring(0, 100) || "file"; // non-ASCII-only basenames collapse to "" — fall back rather than produce a bare "-<timestamp>"

	return { baseName: clean, ext };
}

/**
 * Build the stored filename, validating that the declared extension is one
 * of the extensions allowed for the declared content type. Returns null if
 * the extension is missing, unrecognized, or doesn't match the MIME type —
 * closes the gap where an unvalidated extension could inject "/" or ".."
 * into what's supposed to be a short suffix on the R2 key.
 */
function buildSanitizedFilename(filename: string, contentType: string): string | null {
	const { baseName, ext } = sanitizeFilename(filename);
	const allowedExts = MIME_EXTENSIONS[contentType];
	if (!allowedExts || !ext || !allowedExts.includes(ext)) {
		return null;
	}
	const timestamp = Date.now().toString(36);
	return `${baseName}-${timestamp}.${ext}`;
}

/**
 * Validate folder path for safe storage (prevent path traversal)
 */
function validateFolder(folder: string): {
	valid: boolean;
	normalized: string;
} {
	// Reject dangerous patterns
	if (
		folder.includes("..") ||
		folder.includes("\\") ||
		folder.includes("\0") ||
		folder.includes("//")
	) {
		return { valid: false, normalized: "" };
	}

	// Only allow alphanumeric, dash, underscore, dot, and forward slash
	if (!/^[a-zA-Z0-9._/-]*$/.test(folder)) {
		return { valid: false, normalized: "" };
	}

	// Normalize: remove leading/trailing slashes
	const normalized = folder.replace(/^\/+|\/+$/g, "");

	return { valid: true, normalized };
}

/**
 * List every object in an R2 bucket, following pagination cursors.
 * R2.list() caps at 1000 objects per call — audit/migrate previously read
 * only the first page, which for audit meant every DB row past the first
 * 1000 objects was reported as a false "orphaned" positive (the input a
 * human uses to decide what to delete). Capped at CDN_R2_LIST_MAX_PAGES to
 * bound worst-case latency/cost rather than looping forever.
 */
async function listAllR2Objects(
	bucket: R2Bucket,
): Promise<{ objects: R2Object[]; truncated: boolean }> {
	const objects: R2Object[] = [];
	let cursor: string | undefined;
	let truncated = false;

	for (let page = 0; page < CDN_R2_LIST_MAX_PAGES; page++) {
		const result: R2Objects = await bucket.list(cursor ? { cursor } : {});
		objects.push(...result.objects);
		if (!result.truncated) {
			truncated = false;
			break;
		}
		cursor = result.cursor;
		truncated = true;
	}

	return { objects, truncated };
}

/**
 * Insert a cdn_files row. Shared by upload and migrate so the two INSERTs
 * can't drift from each other again the way they previously did on the
 * `folder` column's storage format.
 */
async function insertCdnFileRow(
	db: ReturnType<typeof createDbSession>,
	row: {
		id: string;
		filename: string;
		original_filename: string;
		key: string;
		content_type: string;
		size_bytes: number;
		folder: string;
		alt_text: string | null;
		uploaded_by: string;
		created_at: string;
		updated_at: string;
	},
): Promise<void> {
	await db
		.prepare(
			`INSERT INTO cdn_files (id, filename, original_filename, key, content_type, size_bytes, folder, alt_text, uploaded_by, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
		)
		.bind(
			row.id,
			row.filename,
			row.original_filename,
			row.key,
			row.content_type,
			row.size_bytes,
			row.folder,
			row.alt_text,
			row.uploaded_by,
			row.created_at,
			row.updated_at,
		)
		.run();
}

/**
 * POST /cdn/upload - Upload a file to the CDN
 */
cdn.post("/upload", async (c) => {
	const userId = c.get("userId");
	const db = createDbSession(c.env);

	const rateLimit = await checkRouteRateLimit(
		db,
		"cdn_upload",
		userId,
		RATE_LIMIT_CDN_UPLOAD,
		RATE_LIMIT_WINDOW,
	);
	if (!rateLimit.allowed) {
		return c.json(
			{
				error: "rate_limit",
				error_description: "Too many uploads. Please try again later.",
				retry_after: rateLimit.retryAfter,
			},
			429,
		);
	}

	try {
		const formData = await c.req.formData();
		const file = formData.get("file") as File | null;
		const metaRaw = Object.fromEntries(formData);
		const metaParsed = CdnUploadMetaSchema.safeParse(metaRaw);
		if (!metaParsed.success) {
			return c.json(
				{
					error: "invalid_request",
					error_description: metaParsed.error.issues[0].message,
				},
				400,
			);
		}
		const folder = metaParsed.data.folder || "";
		const altText = metaParsed.data.alt_text ?? null;

		// Validate folder for path traversal
		const validation = validateFolder(folder);
		if (!validation.valid) {
			return c.json(
				{
					error: "invalid_folder",
					error_description: "Folder contains invalid characters",
				},
				400,
			);
		}

		if (!file) {
			return c.json({ error: "no_file", error_description: "No file provided" }, 400);
		}

		// Validate file type
		if (!MIME_EXTENSIONS[file.type]) {
			return c.json(
				{
					error: "invalid_file_type",
					error_description: `Invalid file type: ${file.type}. Allowed types: images, videos, audio, fonts, PDFs, CSS, JS`,
				},
				400,
			);
		}

		// Validate file size
		if (file.size > CDN_MAX_FILE_SIZE) {
			return c.json(
				{
					error: "file_too_large",
					error_description: "File too large. Maximum size is 50MB",
				},
				400,
			);
		}

		const originalFilename = file.name;
		const sanitizedFilename = buildSanitizedFilename(originalFilename, file.type);
		if (!sanitizedFilename) {
			return c.json(
				{
					error: "invalid_filename",
					error_description:
						"Filename extension is missing or doesn't match the file's content type",
				},
				400,
			);
		}

		// Build R2 key: folder/filename (using validated and normalized folder)
		const key = validation.normalized
			? `${validation.normalized}/${sanitizedFilename}`
			: sanitizedFilename;

		const customMetadata: Record<string, string> = {
			originalFilename,
			uploadedBy: userId,
		};
		if (altText) {
			customMetadata.altText = altText;
		}

		const fileId = generateUUID();
		const now = new Date().toISOString();

		// DB row is written first: `key` is UNIQUE, so a collision is caught
		// here (extremely unlikely with a UUID id, but the ordering also
		// means a failure never leaves an orphaned R2 object behind). If the
		// R2 write below fails, the compensating delete in the catch block
		// removes this row rather than leaving a row that points at nothing.
		await insertCdnFileRow(db, {
			id: fileId,
			filename: sanitizedFilename,
			original_filename: originalFilename,
			key,
			content_type: file.type,
			size_bytes: file.size,
			folder: validation.normalized,
			alt_text: altText,
			uploaded_by: userId,
			created_at: now,
			updated_at: now,
		});

		try {
			// file.stream() avoids buffering the upload twice (formData()
			// already materializes it once; arrayBuffer() used to copy it
			// again) — R2Bucket.put accepts a ReadableStream directly.
			await c.env.CDN_BUCKET.put(key, file.stream(), {
				httpMetadata: {
					contentType: file.type,
					cacheControl: "public, max-age=31536000, immutable",
					...(FORCE_DOWNLOAD_TYPES.has(file.type) ? { contentDisposition: "attachment" } : {}),
				},
				customMetadata,
			});
		} catch (r2Error) {
			await db.prepare("DELETE FROM cdn_files WHERE id = ?").bind(fileId).run();
			throw r2Error;
		}

		await createAuditLog(db, {
			event_type: "cdn_file_uploaded",
			user_id: userId,
			ip_address: getClientIP(c.req.raw),
			user_agent: getUserAgent(c.req.raw),
			details: { key, content_type: file.type, size_bytes: file.size },
		});

		const cdnUrl = `${c.env.CDN_URL}/${key}`;

		return c.json({
			success: true,
			file: {
				id: fileId,
				filename: sanitizedFilename,
				original_filename: originalFilename,
				key,
				content_type: file.type,
				size_bytes: file.size,
				folder: validation.normalized,
				alt_text: altText,
				uploaded_by: userId,
				created_at: now,
				url: cdnUrl,
			},
		});
	} catch (error) {
		logGroveError("Heartwood", HW_SVC_ERRORS.INTERNAL_ERROR, {
			path: "/cdn/upload",
			userId,
			detail: "Failed to upload file",
			cause: error,
		});
		return c.json({ error: "upload_failed", error_description: "Failed to upload file" }, 500);
	}
});

/**
 * GET /cdn/files - List files with pagination and filtering
 */
cdn.get("/files", async (c) => {
	const db = createDbSession(c.env);

	try {
		const limitRaw = parseInt(c.req.query("limit") || "", 10);
		const limit =
			Number.isFinite(limitRaw) && limitRaw > 0
				? Math.min(limitRaw, ADMIN_PAGINATION_MAX_LIMIT)
				: ADMIN_PAGINATION_DEFAULT_LIMIT;
		const offsetRaw = parseInt(c.req.query("offset") || "", 10);
		const offset = Number.isFinite(offsetRaw) && offsetRaw >= 0 ? offsetRaw : 0;
		const folder = c.req.query("folder") || null;

		let query = "SELECT * FROM cdn_files";
		const params: (string | number)[] = [];

		if (folder) {
			query += " WHERE folder = ?";
			params.push(folder);
		}

		query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
		params.push(limit, offset);

		const result = await db
			.prepare(query)
			.bind(...params)
			.all<CdnFileRow>();

		// Get total count
		let countQuery = "SELECT COUNT(*) as total FROM cdn_files";
		const countParams: string[] = [];
		if (folder) {
			countQuery += " WHERE folder = ?";
			countParams.push(folder);
		}
		const countResult = await db
			.prepare(countQuery)
			.bind(...countParams)
			.first<{ total: number }>();
		const total = countResult?.total || 0;

		// Add URLs to files
		const files = (result.results || []).map((file) => ({
			...file,
			url: `${c.env.CDN_URL}/${file.key}`,
		}));

		return c.json({
			files,
			total,
			limit,
			offset,
		});
	} catch (error) {
		logGroveError("Heartwood", HW_SVC_ERRORS.INTERNAL_ERROR, {
			path: "/cdn/files",
			userId: c.get("userId"),
			detail: "Failed to list files",
			cause: error,
		});
		return c.json({ error: "list_failed", error_description: "Failed to list files" }, 500);
	}
});

/**
 * GET /cdn/folders - List all unique folders
 */
cdn.get("/folders", async (c) => {
	const db = createDbSession(c.env);

	try {
		const result = await db
			.prepare("SELECT DISTINCT folder FROM cdn_files ORDER BY folder")
			.all<Pick<CdnFileRow, "folder">>();

		const folders = (result.results || []).map((row) => row.folder);

		return c.json({ folders });
	} catch (error) {
		logGroveError("Heartwood", HW_SVC_ERRORS.INTERNAL_ERROR, {
			path: "/cdn/folders",
			userId: c.get("userId"),
			detail: "Failed to list folders",
			cause: error,
		});
		return c.json({ error: "list_failed", error_description: "Failed to list folders" }, 500);
	}
});

/**
 * DELETE /cdn/files/:id - Delete a file
 *
 * No per-object ownership check beyond the admin gate on all /cdn/* routes
 * — this is a shared platform CDN (marketing assets, fonts, etc.), not
 * tenant-scoped storage, so any admin may delete any file. That's a
 * deliberate choice, not an oversight; it's why the audit log below exists.
 */
cdn.delete("/files/:id", async (c) => {
	const userId = c.get("userId");
	const db = createDbSession(c.env);
	const fileId = c.req.param("id");

	try {
		// Get file metadata
		const file = await db.prepare("SELECT * FROM cdn_files WHERE id = ?").bind(fileId).first<{
			id: string;
			key: string;
		}>();

		if (!file) {
			return c.json({ error: "not_found", error_description: "File not found" }, 404);
		}

		// DB row is deleted first. If the R2 delete below then fails, the
		// leftover R2 object surfaces as "untracked" in /cdn/audit and can
		// be re-imported via /cdn/migrate — a safer failure mode than the
		// reverse order, where a DB-write failure after a successful R2
		// delete would leave a row pointing at nothing.
		await db.prepare("DELETE FROM cdn_files WHERE id = ?").bind(fileId).run();
		await c.env.CDN_BUCKET.delete(file.key);

		await createAuditLog(db, {
			event_type: "cdn_file_deleted",
			user_id: userId,
			ip_address: getClientIP(c.req.raw),
			user_agent: getUserAgent(c.req.raw),
			details: { key: file.key },
		});

		return c.json({ success: true, message: "File deleted" });
	} catch (error) {
		logGroveError("Heartwood", HW_SVC_ERRORS.INTERNAL_ERROR, {
			path: "/cdn/files/:id",
			userId,
			detail: "Failed to delete file",
			cause: error,
		});
		return c.json({ error: "delete_failed", error_description: "Failed to delete file" }, 500);
	}
});

/**
 * GET /cdn/audit - Check for discrepancies between R2 and database
 * Admin-only endpoint to identify files in R2 that aren't tracked in the database
 */
cdn.get("/audit", async (c) => {
	const db = createDbSession(c.env);

	try {
		// List all objects in R2 (paginated — see listAllR2Objects)
		const { objects: r2Objects, truncated } = await listAllR2Objects(c.env.CDN_BUCKET);

		// Get all keys from database
		const dbResult = await db.prepare("SELECT key FROM cdn_files").all<Pick<CdnFileRow, "key">>();
		const dbKeys = new Set((dbResult.results || []).map((row) => row.key));

		// Find objects in R2 but not in database
		const untracked = r2Objects
			.filter((obj) => !dbKeys.has(obj.key))
			.map((obj) => ({
				key: obj.key,
				size: obj.size,
				uploaded: obj.uploaded.toISOString(),
				url: `${c.env.CDN_URL}/${obj.key}`,
			}));

		// Find entries in database but not in R2
		const r2Keys = new Set(r2Objects.map((obj) => obj.key));
		const orphaned = (dbResult.results || [])
			.filter((row) => !r2Keys.has(row.key))
			.map((row) => row.key);

		return c.json({
			summary: {
				total_r2_objects: r2Objects.length,
				total_db_entries: dbResult.results?.length || 0,
				untracked_in_r2: untracked.length,
				orphaned_in_db: orphaned.length,
			},
			// If the R2 listing hit the page cap, orphaned_in_db in particular
			// may include false positives — callers should not treat this
			// report as authoritative for destructive cleanup when true.
			truncated,
			untracked_files: untracked,
			orphaned_db_entries: orphaned,
		});
	} catch (error) {
		logGroveError("Heartwood", HW_SVC_ERRORS.INTERNAL_ERROR, {
			path: "/cdn/audit",
			userId: c.get("userId"),
			detail: "Failed to audit CDN",
			cause: error,
		});
		return c.json({ error: "audit_failed", error_description: "Failed to audit CDN" }, 500);
	}
});

/**
 * POST /cdn/migrate - Migrate untracked R2 files into the database
 * Admin-only endpoint to import existing R2 files that were uploaded before the CDN manager
 */
cdn.post("/migrate", async (c) => {
	const userId = c.get("userId");
	const db = createDbSession(c.env);

	const rateLimit = await checkRouteRateLimit(
		db,
		"cdn_migrate",
		userId,
		RATE_LIMIT_CDN_MIGRATE,
		RATE_LIMIT_CDN_MIGRATE_WINDOW,
	);
	if (!rateLimit.allowed) {
		return c.json(
			{
				error: "rate_limit",
				error_description: "Too many migration runs. Please try again later.",
				retry_after: rateLimit.retryAfter,
			},
			429,
		);
	}

	try {
		// List all objects in R2 (paginated — see listAllR2Objects)
		const { objects: r2Objects, truncated } = await listAllR2Objects(c.env.CDN_BUCKET);

		// Get all keys from database
		const dbResult = await db.prepare("SELECT key FROM cdn_files").all<Pick<CdnFileRow, "key">>();
		const dbKeys = new Set((dbResult.results || []).map((row) => row.key));

		// Find untracked files
		const untracked = r2Objects.filter((obj) => !dbKeys.has(obj.key));

		if (untracked.length === 0) {
			return c.json({ message: "No untracked files to migrate", migrated: 0, truncated });
		}

		const now = new Date().toISOString();
		let migratedCount = 0;
		const errors: string[] = [];

		// Import each untracked file
		for (const obj of untracked) {
			try {
				// Get metadata from R2
				const r2Obj = await c.env.CDN_BUCKET.head(obj.key);
				const contentType = r2Obj?.httpMetadata?.contentType || "application/octet-stream";

				// Parse folder from key. lastSlash === 0 (a key starting with
				// "/") and lastSlash === -1 (no slash) both fall through to
				// folder "" — the same root-folder convention upload uses.
				const lastSlash = obj.key.lastIndexOf("/");
				const folder = lastSlash > 0 ? obj.key.substring(0, lastSlash) : "";
				const filename = lastSlash >= 0 ? obj.key.substring(lastSlash + 1) : obj.key;

				await insertCdnFileRow(db, {
					id: generateUUID(),
					filename,
					original_filename: filename, // original_filename same as filename for migrated files
					key: obj.key,
					content_type: contentType,
					size_bytes: obj.size,
					folder,
					alt_text: null, // No alt text for migrated files
					uploaded_by: userId,
					created_at: obj.uploaded.toISOString(),
					updated_at: now,
				});

				migratedCount++;
			} catch (err) {
				errors.push(`Failed to migrate ${obj.key}: ${err}`);
			}
		}

		await createAuditLog(db, {
			event_type: "cdn_files_migrated",
			user_id: userId,
			ip_address: getClientIP(c.req.raw),
			user_agent: getUserAgent(c.req.raw),
			details: { migrated: migratedCount, total_untracked: untracked.length },
		});

		return c.json({
			success: true,
			migrated: migratedCount,
			total_untracked: untracked.length,
			truncated,
			errors: errors.length > 0 ? errors : undefined,
		});
	} catch (error) {
		logGroveError("Heartwood", HW_SVC_ERRORS.INTERNAL_ERROR, {
			path: "/cdn/migrate",
			userId,
			detail: "Failed to migrate files",
			cause: error,
		});
		return c.json({ error: "migrate_failed", error_description: "Failed to migrate files" }, 500);
	}
});

export default cdn;
