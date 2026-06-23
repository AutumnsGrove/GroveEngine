export type {
	StorageFile,
	UploadOptions,
	GetFileResult,
	FileMetadata,
	StorageErrorCode,
	StorageConfig,
	SyncResult,
	SyncOptions,
} from "./types.js";
export { StorageError, STORAGE_DEFAULTS } from "./types.js";

export { validateFile, isAllowedContentType } from "./config.js";

export {
	uploadFile,
	getFile,
	getFileMetadata,
	fileExists,
	deleteFile,
	deleteFileByKey,
} from "./operations.js";

export {
	getFileRecord,
	getFileRecordByKey,
	listFiles,
	listAllFiles,
	listFolders,
	updateAltText,
} from "./metadata.js";

export { syncFromBucket } from "./sync.js";

export { shouldReturn304, buildFileHeaders } from "./response.js";
