import type { StorageFile, UploadOptions, GetFileResult, FileMetadata } from "./types.js";
import { StorageError } from "./types.js";
import type { D1DatabaseOrSession } from "../db/types.js";
import {
	validateFile,
	generateUniqueFilename,
	normalizeFolder,
	buildStorageKey,
	getCacheControl,
	generateId,
	now,
} from "./config.js";

export async function uploadFile(
	bucket: R2Bucket,
	db: D1DatabaseOrSession,
	options: UploadOptions,
): Promise<StorageFile> {
	const { data, filename, contentType, folder, altText, uploadedBy, maxFileSize } = options;

	validateFile(data, contentType, { maxFileSize });

	const uniqueFilename = generateUniqueFilename(filename);
	const normalizedFolder = normalizeFolder(folder);
	const key = buildStorageKey(normalizedFolder, uniqueFilename);

	try {
		await bucket.put(key, data, {
			httpMetadata: {
				contentType,
				cacheControl: getCacheControl(contentType),
			},
		});
	} catch (err) {
		throw new StorageError("Failed to upload file to storage", "UPLOAD_FAILED", err);
	}

	const id = generateId();
	const timestamp = now();

	try {
		await db
			.prepare(
				`INSERT INTO cdn_files (id, filename, original_filename, key, content_type, size_bytes, folder, alt_text, uploaded_by, created_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			)
			.bind(
				id,
				uniqueFilename,
				filename,
				key,
				contentType,
				data.byteLength,
				normalizedFolder,
				altText ?? null,
				uploadedBy,
				timestamp,
			)
			.run();
	} catch (err) {
		try {
			await bucket.delete(key);
		} catch (cleanupErr) {
			console.error("[Storage] Failed to cleanup R2 object after metadata failure:", cleanupErr);
		}
		throw new StorageError("Failed to store file metadata", "METADATA_FAILED", err);
	}

	return {
		id,
		filename: uniqueFilename,
		originalFilename: filename,
		key,
		contentType,
		sizeBytes: data.byteLength,
		folder: normalizedFolder,
		altText: altText ?? null,
		uploadedBy,
		createdAt: timestamp,
	};
}

export async function getFile(bucket: R2Bucket, key: string): Promise<GetFileResult | null> {
	const object = await bucket.get(key);

	if (!object) {
		return null;
	}

	const contentType = object.httpMetadata?.contentType || "application/octet-stream";

	return {
		body: object.body,
		contentType,
		cacheControl: getCacheControl(contentType),
		etag: object.httpEtag,
		size: object.size,
	};
}

export async function getFileMetadata(bucket: R2Bucket, key: string): Promise<FileMetadata | null> {
	const object = await bucket.head(key);

	if (!object) {
		return null;
	}

	const contentType = object.httpMetadata?.contentType || "application/octet-stream";

	return {
		contentType,
		cacheControl: getCacheControl(contentType),
		etag: object.httpEtag,
		size: object.size,
	};
}

export async function fileExists(bucket: R2Bucket, key: string): Promise<boolean> {
	const object = await bucket.head(key);
	return object !== null;
}

export async function deleteFile(
	bucket: R2Bucket,
	db: D1DatabaseOrSession,
	fileId: string,
): Promise<void> {
	const file = await db
		.prepare("SELECT key FROM cdn_files WHERE id = ?")
		.bind(fileId)
		.first<{ key: string }>();

	if (!file) {
		throw new StorageError("File not found", "FILE_NOT_FOUND");
	}

	try {
		await bucket.delete(file.key);
	} catch (err) {
		throw new StorageError("Failed to delete file from storage", "DELETE_FAILED", err);
	}

	try {
		await db.prepare("DELETE FROM cdn_files WHERE id = ?").bind(fileId).run();
	} catch (err) {
		throw new StorageError("Failed to delete file metadata", "METADATA_FAILED", err);
	}
}

export async function deleteFileByKey(
	bucket: R2Bucket,
	db: D1DatabaseOrSession,
	key: string,
): Promise<void> {
	try {
		await bucket.delete(key);
	} catch (err) {
		throw new StorageError("Failed to delete file from storage", "DELETE_FAILED", err);
	}

	try {
		await db.prepare("DELETE FROM cdn_files WHERE key = ?").bind(key).run();
	} catch (err) {
		throw new StorageError("Failed to delete file metadata", "METADATA_FAILED", err);
	}
}
