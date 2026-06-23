export interface StorageFile {
	id: string;
	filename: string;
	originalFilename: string;
	key: string;
	contentType: string;
	sizeBytes: number;
	folder: string;
	altText: string | null;
	uploadedBy: string;
	createdAt: string;
}

export interface UploadOptions {
	data: ArrayBuffer;
	filename: string;
	contentType: string;
	folder?: string;
	altText?: string;
	uploadedBy: string;
	maxFileSize?: number;
}

export interface GetFileResult {
	body: ReadableStream<Uint8Array>;
	contentType: string;
	cacheControl: string;
	etag: string;
	size: number;
}

export interface FileMetadata {
	contentType: string;
	cacheControl: string;
	etag: string;
	size: number;
}

export class StorageError extends Error {
	constructor(
		message: string,
		public readonly code: StorageErrorCode,
		public readonly cause?: unknown,
	) {
		super(message);
		this.name = "StorageError";
	}
}

export type StorageErrorCode =
	| "FILE_NOT_FOUND"
	| "FILE_TOO_LARGE"
	| "INVALID_TYPE"
	| "UPLOAD_FAILED"
	| "DELETE_FAILED"
	| "METADATA_FAILED"
	| "BUCKET_UNAVAILABLE";

export interface StorageConfig {
	maxFileSize?: number;
	additionalContentTypes?: string[];
}

export const STORAGE_DEFAULTS = {
	MAX_FILE_SIZE: 10 * 1024 * 1024,
} as const;

export interface SyncResult {
	synced: number;
	skipped: number;
	errors: string[];
	total: number;
}

export interface SyncOptions {
	uploadedBy: string;
	folder?: string;
}
