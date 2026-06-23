import type { GetFileResult, FileMetadata } from "./types.js";

export function shouldReturn304(request: Request, etag: string): boolean {
	const ifNoneMatch = request.headers.get("If-None-Match");
	return ifNoneMatch === etag;
}

export function buildFileHeaders(
	file: GetFileResult | FileMetadata,
	options?: { enableCors?: boolean },
): Headers {
	const headers = new Headers();
	headers.set("Content-Type", file.contentType);
	headers.set("Cache-Control", file.cacheControl);
	headers.set("ETag", file.etag);

	const dangerousTypes = [
		"application/javascript",
		"text/html",
		"application/xhtml+xml",
		"text/xml",
		"application/xml",
	];
	const shouldForceDownload = dangerousTypes.some((type) => file.contentType.includes(type));

	if (shouldForceDownload) {
		headers.set("Content-Disposition", "attachment");
	} else {
		headers.set("Content-Disposition", "inline");
	}

	if (options?.enableCors || file.contentType.startsWith("font/")) {
		headers.set("Access-Control-Allow-Origin", "*");
	}

	return headers;
}
