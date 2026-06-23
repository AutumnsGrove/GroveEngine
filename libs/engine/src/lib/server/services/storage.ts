/**
 * Storage Service — Re-export Barrel
 *
 * This file re-exports from the storage/ module for backward compatibility.
 * Prefer importing directly from the focused modules:
 *   - storage/types.ts      — StorageFile, UploadOptions, StorageError, etc.
 *   - storage/config.ts     — allowed types, cache control, validation
 *   - storage/operations.ts — uploadFile, getFile, deleteFile, etc.
 *   - storage/metadata.ts   — getFileRecord, listFiles, updateAltText, etc.
 *   - storage/sync.ts       — syncFromBucket (R2 → D1)
 *   - storage/response.ts   — shouldReturn304, buildFileHeaders
 */

export {
	// Types
	type StorageFile,
	type UploadOptions,
	type GetFileResult,
	type FileMetadata,
	type StorageErrorCode,
	type StorageConfig,
	type SyncResult,
	type SyncOptions,
	StorageError,
	STORAGE_DEFAULTS,
	// Validation
	validateFile,
	isAllowedContentType,
	// Operations
	uploadFile,
	getFile,
	getFileMetadata,
	fileExists,
	deleteFile,
	deleteFileByKey,
	// Metadata
	getFileRecord,
	getFileRecordByKey,
	listFiles,
	listAllFiles,
	listFolders,
	updateAltText,
	// Sync
	syncFromBucket,
	// Response Helpers
	shouldReturn304,
	buildFileHeaders,
} from "./storage/index.js";
