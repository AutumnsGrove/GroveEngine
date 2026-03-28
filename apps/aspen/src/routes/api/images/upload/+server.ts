/**
 * Image Upload Endpoint
 *
 * Thin routing layer — delegates to upload-pipeline.ts.
 * POST /api/images/upload
 */

import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { getVerifiedTenantId } from "@autumnsgrove/lattice/auth/session";
import { createThreshold } from "@autumnsgrove/lattice/threshold/factory";
import { thresholdCheckWithResult } from "@autumnsgrove/lattice/threshold/adapters/sveltekit";
import { validateEnv } from "@autumnsgrove/lattice/server/env-validation";
import { canUploadImages } from "@autumnsgrove/lattice/server/upload-gate";
import {
	API_ERRORS,
	buildErrorJson,
	logGroveError,
	throwGroveError,
} from "@autumnsgrove/lattice/errors";
import { parseFormData } from "@autumnsgrove/lattice/server/utils/form-data";
import {
	ImageUploadMetadataSchema,
	validateFile,
	validateImageDimensions,
	runPetalScan,
	checkDuplicate,
	uploadAndStore,
} from "./upload-pipeline";

export const POST: RequestHandler = async ({ request, platform, locals }) => {
	if (!locals.user) {
		throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
	}

	if (!locals.tenantId) {
		throwGroveError(403, API_ERRORS.TENANT_CONTEXT_REQUIRED, "API");
	}

	// Upload Gate
	const flagsEnv = platform?.env?.CACHE_KV
		? { DB: platform.env.DB!, FLAGS_KV: platform.env.CACHE_KV }
		: null;

	if (!flagsEnv) {
		return json(buildErrorJson(API_ERRORS.FEATURE_DISABLED), { status: 403 });
	}

	const uploadGate = await canUploadImages(locals.tenantId, locals.user.id, flagsEnv);
	if (!uploadGate.allowed) {
		return json(buildErrorJson(API_ERRORS.FEATURE_DISABLED), { status: 403 });
	}

	// Validate environment
	const envValidation = validateEnv(platform?.env, ["DB", "IMAGES", "CACHE_KV"]);
	if (!envValidation.valid) {
		console.error(`[Image Upload] ${envValidation.message}`);
		throwGroveError(503, API_ERRORS.UPLOAD_SERVICE_UNAVAILABLE, "API");
	}

	const db = platform!.env!.DB;
	const images = platform!.env!.IMAGES;
	const kv = platform!.env!.CACHE_KV;
	const threshold = createThreshold(platform?.env, { identifier: locals.user?.id });

	// Rate limit uploads
	if (threshold) {
		const { response } = await thresholdCheckWithResult(threshold, {
			key: `upload/image:${locals.user.id}`,
			limit: 50,
			windowSeconds: 3600,
		});
		if (response) return response;
	}

	try {
		const tenantId = await getVerifiedTenantId(db, locals.tenantId, locals.user);
		const formData = await request.formData();
		const file = formData.get("file");
		const metaParsed = parseFormData(formData, ImageUploadMetadataSchema);
		const meta = metaParsed.success
			? metaParsed.data
			: {
					filename: null,
					altText: "",
					description: "",
					hash: null,
					imageFormat: null,
					originalSize: null,
					storedSize: null,
					dominantColor: null,
					imageWidth: null,
					imageHeight: null,
					context: "general",
				};

		if (!file || !(file instanceof File)) {
			throwGroveError(400, API_ERRORS.INVALID_REQUEST_BODY, "API", { detail: "file required" });
		}

		// Read file once for both validation and upload
		const arrayBuffer = await file.arrayBuffer();
		const buffer = new Uint8Array(arrayBuffer);

		// Validate file type, extension, size, signature
		validateFile(file, buffer);

		// Validate image dimensions
		await validateImageDimensions(file, buffer);

		// Pre-scan abuse detection
		const rejectedKey = `upload/rejected:${locals.user.id}`;
		if (threshold) {
			const rejectedCheck = await thresholdCheckWithResult(threshold, {
				key: rejectedKey,
				limit: 5,
				windowSeconds: 3600,
			});
			if (rejectedCheck.response) {
				return json(buildErrorJson(API_ERRORS.UPLOAD_RESTRICTED), { status: 429 });
			}
		}

		// Petal Content Moderation
		const hasPetalProvider = platform?.env?.AI || platform?.env?.TOGETHER_API_KEY;
		if (hasPetalProvider) {
			const petalResult = await runPetalScan(
				buffer,
				file,
				locals.user.id,
				tenantId,
				meta.hash ?? null,
				meta.context || "general",
				{
					AI: platform!.env!.AI,
					DB: db,
					CACHE_KV: kv,
					TOGETHER_API_KEY: platform!.env!.TOGETHER_API_KEY as string | undefined,
				},
			);

			if (!petalResult.allowed) {
				// Increment rejected counter
				if (threshold) {
					try {
						await threshold.check({ key: rejectedKey, limit: 5, windowSeconds: 3600 });
					} catch {
						// Non-critical
					}
				}

				return json(
					{
						...buildErrorJson(API_ERRORS.INVALID_FILE),
						error_description: petalResult.response?.message,
						processingTimeMs: petalResult.response?.processingTimeMs,
					},
					{ status: 400 },
				);
			}
		}

		// Check for duplicates
		const hash = meta.hash ?? null;
		if (hash) {
			const existing = await checkDuplicate(db, hash, tenantId);
			if (existing) {
				return json({
					success: true,
					duplicate: true,
					url: existing.url,
					key: existing.key,
					message: "Duplicate image detected - using existing upload",
				});
			}
		}

		// Upload and store
		const thumbnail = formData.get("thumbnail") as File | null;
		const cdnBaseUrl = (platform?.env?.CDN_BASE_URL as string) || "https://cdn.grove.place";

		const result = await uploadAndStore({
			file,
			arrayBuffer,
			tenantId,
			images,
			db,
			customFilename: meta.filename ?? null,
			altText: meta.altText || "",
			description: meta.description || "",
			hash,
			imageFormat: meta.imageFormat ?? null,
			originalSizeBytes: meta.originalSize ? parseInt(meta.originalSize, 10) : null,
			storedSizeBytes: meta.storedSize ? parseInt(meta.storedSize, 10) : null,
			thumbnail,
			dominantColor: meta.dominantColor ?? null,
			parsedWidth: meta.imageWidth ? parseInt(meta.imageWidth, 10) : null,
			parsedHeight: meta.imageHeight ? parseInt(meta.imageHeight, 10) : null,
			cdnBaseUrl,
		});

		return json({ success: true, ...result }, { headers: { "Cache-Control": "no-store" } });
	} catch (err) {
		if ((err as { status?: number }).status) throw err;
		logGroveError("API", API_ERRORS.OPERATION_FAILED, { cause: err });
		throw error(500, API_ERRORS.OPERATION_FAILED.userMessage);
	}
};
