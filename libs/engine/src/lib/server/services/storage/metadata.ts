import type { StorageFile } from "./types.js";
import { StorageError } from "./types.js";
import type { D1DatabaseOrSession } from "../db/types.js";
import { normalizeFolder } from "./config.js";

interface CdnFileRow {
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
}

function mapRowToStorageFile(row: CdnFileRow): StorageFile {
	return {
		id: row.id,
		filename: row.filename,
		originalFilename: row.original_filename,
		key: row.key,
		contentType: row.content_type,
		sizeBytes: row.size_bytes,
		folder: row.folder,
		altText: row.alt_text,
		uploadedBy: row.uploaded_by,
		createdAt: row.created_at,
	};
}

export async function getFileRecord(
	db: D1DatabaseOrSession,
	fileId: string,
): Promise<StorageFile | null> {
	const row = await db
		.prepare("SELECT * FROM cdn_files WHERE id = ?")
		.bind(fileId)
		.first<CdnFileRow>();

	return row ? mapRowToStorageFile(row) : null;
}

export async function getFileRecordByKey(
	db: D1DatabaseOrSession,
	key: string,
): Promise<StorageFile | null> {
	const row = await db
		.prepare("SELECT * FROM cdn_files WHERE key = ?")
		.bind(key)
		.first<CdnFileRow>();

	return row ? mapRowToStorageFile(row) : null;
}

export async function listFiles(
	db: D1DatabaseOrSession,
	options?: {
		folder?: string;
		limit?: number;
		offset?: number;
	},
): Promise<{ files: StorageFile[]; total: number }> {
	const folder = normalizeFolder(options?.folder);
	const limit = options?.limit ?? 50;
	const offset = options?.offset ?? 0;

	const [filesResult, countResult] = await Promise.all([
		db
			.prepare(
				`SELECT * FROM cdn_files
				 WHERE folder = ?
				 ORDER BY created_at DESC
				 LIMIT ? OFFSET ?`,
			)
			.bind(folder, limit, offset)
			.all<CdnFileRow>(),
		db
			.prepare("SELECT COUNT(*) as count FROM cdn_files WHERE folder = ?")
			.bind(folder)
			.first<{ count: number }>(),
	]);

	return {
		files: (filesResult.results ?? []).map(mapRowToStorageFile),
		total: countResult?.count ?? 0,
	};
}

export async function listAllFiles(
	db: D1DatabaseOrSession,
	options?: {
		limit?: number;
		offset?: number;
	},
): Promise<{ files: StorageFile[]; total: number }> {
	const limit = options?.limit ?? 50;
	const offset = options?.offset ?? 0;

	const [filesResult, countResult] = await Promise.all([
		db
			.prepare(
				`SELECT * FROM cdn_files
				 ORDER BY created_at DESC
				 LIMIT ? OFFSET ?`,
			)
			.bind(limit, offset)
			.all<CdnFileRow>(),
		db.prepare("SELECT COUNT(*) as count FROM cdn_files").first<{ count: number }>(),
	]);

	return {
		files: (filesResult.results ?? []).map(mapRowToStorageFile),
		total: countResult?.count ?? 0,
	};
}

export async function listFolders(db: D1DatabaseOrSession): Promise<string[]> {
	const result = await db
		.prepare("SELECT DISTINCT folder FROM cdn_files ORDER BY folder")
		.all<{ folder: string }>();

	return (result.results ?? []).map((r) => r.folder);
}

export async function updateAltText(
	db: D1DatabaseOrSession,
	fileId: string,
	altText: string,
): Promise<void> {
	const result = await db
		.prepare("UPDATE cdn_files SET alt_text = ? WHERE id = ?")
		.bind(altText, fileId)
		.run();

	if ((result.meta as D1Meta).changes === 0) {
		throw new StorageError("File not found", "FILE_NOT_FOUND");
	}
}
