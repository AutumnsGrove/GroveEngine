import { ImageResponse } from "workers-og";

// Import pure functions from separate module (enables testing without workers-og WASM)
import {
	escapeHtml,
	decodeHtmlEntities,
	splitPreviewIntoLines,
	isAllowedUrl,
	isBlockedExternalUrl,
	extractDomain,
	resolveExternalUrl,
	getColors,
	extractExternalMetaContent,
	extractExternalTitle,
	extractExternalFavicon,
	parseExternalOGMetadata,
} from "./pure-functions";
import { OG_ERRORS } from "./errors";

import type { LineSplit, ColorScheme, Variant, OGMetadata } from "./pure-functions";

// Re-export for consumers who import from index
export {
	escapeHtml,
	decodeHtmlEntities,
	splitPreviewIntoLines,
	isAllowedUrl,
	isBlockedExternalUrl,
	extractDomain,
	resolveExternalUrl,
	getColors,
	extractExternalMetaContent,
	extractExternalTitle,
	extractExternalFavicon,
	parseExternalOGMetadata,
};

export type { LineSplit, ColorScheme, Variant, OGMetadata };

export interface Env {
	ENVIRONMENT: string;
	OG_CACHE?: KVNamespace;
}

// =============================================================================
// UTILITIES
// =============================================================================

/** Simple sleep helper for retry backoff */
const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Structured logging for production debugging */
function log(level: "info" | "warn" | "error", cat: string, msg: string, meta?: object): void {
	const entry = { ts: new Date().toISOString(), level, cat, msg, ...meta };
	if (level === "error") {
		console.error(JSON.stringify(entry));
	} else if (level === "warn") {
		console.warn(JSON.stringify(entry));
	} else {
		console.log(JSON.stringify(entry));
	}
}

// =============================================================================
// FONT LOADING
// =============================================================================

/** Primary CDN and Google Fonts fallback */
const FONT_URLS = [
	"https://cdn.grove.place/fonts/Lexend-Regular.ttf",
	"https://fonts.gstatic.com/s/lexend/v19/wlptgwvFAVdoq2_F94zlCfv0bz1WCwkWtLBfog.ttf",
];

/** Bold variant CDN and Google Fonts fallback */
const BOLD_FONT_URLS = [
	"https://cdn.grove.place/fonts/Lexend-Bold.ttf",
	"https://fonts.gstatic.com/s/lexend/v19/wlptgwvFAVdoq2_F94zlCfv0bz1WC2sStbBfog.ttf",
];

/** Retry delays in milliseconds */
const RETRY_DELAYS = [100, 500, 2000];

let fontCache: ArrayBuffer | null = null;
let boldFontCache: ArrayBuffer | null = null;

/**
 * Get font with multi-layer caching and resilient fetching:
 * 1. Memory cache (fastest, per-isolate)
 * 2. KV cache (cross-worker persistence)
 * 3. Fetch from CDN with retry and backoff
 * 4. Fallback to Google Fonts if primary fails
 */
async function getFont(env: Env): Promise<ArrayBuffer> {
	// 1. Check memory cache (fastest)
	if (fontCache) {
		log("info", "font", "Loaded from memory cache");
		return fontCache;
	}

	// 2. Check KV cache (cross-worker persistence)
	if (env.OG_CACHE) {
		try {
			const kvFont = await env.OG_CACHE.get("font:lexend", "arrayBuffer");
			if (kvFont) {
				fontCache = kvFont;
				log("info", "font", "Loaded from KV cache");
				return fontCache;
			}
		} catch (err) {
			log("warn", "font", "KV cache read failed", {
				error: err instanceof Error ? err.message : "Unknown",
			});
			// KV miss or error, continue to fetch
		}
	}

	// 3. Fetch from CDN with retry and fallback
	for (const url of FONT_URLS) {
		const host = new URL(url).host;

		for (let attempt = 1; attempt <= 3; attempt++) {
			try {
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), 5000);

				const response = await fetch(url, { signal: controller.signal });
				clearTimeout(timeoutId);

				if (response.ok) {
					fontCache = await response.arrayBuffer();
					log("info", "font", `Loaded from ${host}`, { attempt });

					// Cache in KV for other workers (24h TTL)
					if (env.OG_CACHE) {
						// Use waitUntil to not block the response
						env.OG_CACHE.put("font:lexend", fontCache, {
							expirationTtl: 86400,
						}).catch((err) => {
							log("warn", "font", "KV cache write failed", {
								error: err instanceof Error ? err.message : "Unknown",
							});
						});
					}
					return fontCache;
				}

				log("warn", "font", `HTTP ${response.status} from ${host}`, {
					attempt,
				});
			} catch (err) {
				const isTimeout = err instanceof Error && err.name === "AbortError";
				log("warn", "font", isTimeout ? `Timeout from ${host}` : `Fetch error from ${host}`, {
					attempt,
					error: err instanceof Error ? err.message : "Unknown",
				});
			}

			// Backoff before next attempt (skip delay on last attempt)
			if (attempt < 3) {
				await sleep(RETRY_DELAYS[attempt - 1]);
			}
		}
		log("warn", "font", `All attempts failed for ${host}`);
	}

	log("error", "font", OG_ERRORS.FONT_LOAD_FAILED.adminMessage);
	throw new Error(OG_ERRORS.FONT_LOAD_FAILED.adminMessage);
}

/**
 * Get bold font with multi-layer caching and resilient fetching:
 * 1. Memory cache (fastest, per-isolate)
 * 2. KV cache (cross-worker persistence)
 * 3. Fetch from CDN with retry and backoff
 * 4. Fallback to Google Fonts if primary fails
 */
async function getBoldFont(env: Env): Promise<ArrayBuffer> {
	// 1. Check memory cache (fastest)
	if (boldFontCache) {
		log("info", "font", "Bold loaded from memory cache");
		return boldFontCache;
	}

	// 2. Check KV cache (cross-worker persistence)
	if (env.OG_CACHE) {
		try {
			const kvFont = await env.OG_CACHE.get("font:lexend-bold", "arrayBuffer");
			if (kvFont) {
				boldFontCache = kvFont;
				log("info", "font", "Bold loaded from KV cache");
				return boldFontCache;
			}
		} catch (err) {
			log("warn", "font", "Bold KV cache read failed", {
				error: err instanceof Error ? err.message : "Unknown",
			});
			// KV miss or error, continue to fetch
		}
	}

	// 3. Fetch from CDN with retry and fallback
	for (const url of BOLD_FONT_URLS) {
		const host = new URL(url).host;

		for (let attempt = 1; attempt <= 3; attempt++) {
			try {
				const controller = new AbortController();
				const timeoutId = setTimeout(() => controller.abort(), 5000);

				const response = await fetch(url, { signal: controller.signal });
				clearTimeout(timeoutId);

				if (response.ok) {
					boldFontCache = await response.arrayBuffer();
					log("info", "font", `Bold loaded from ${host}`, { attempt });

					// Cache in KV for other workers (24h TTL)
					if (env.OG_CACHE) {
						env.OG_CACHE.put("font:lexend-bold", boldFontCache, {
							expirationTtl: 86400,
						}).catch((err) => {
							log("warn", "font", "Bold KV cache write failed", {
								error: err instanceof Error ? err.message : "Unknown",
							});
						});
					}
					return boldFontCache;
				}

				log("warn", "font", `Bold HTTP ${response.status} from ${host}`, {
					attempt,
				});
			} catch (err) {
				const isTimeout = err instanceof Error && err.name === "AbortError";
				log(
					"warn",
					"font",
					isTimeout ? `Bold timeout from ${host}` : `Bold fetch error from ${host}`,
					{
						attempt,
						error: err instanceof Error ? err.message : "Unknown",
					},
				);
			}

			// Backoff before next attempt (skip delay on last attempt)
			if (attempt < 3) {
				await sleep(RETRY_DELAYS[attempt - 1]);
			}
		}
		log("warn", "font", `All bold attempts failed for ${host}`);
	}

	log("error", "font", OG_ERRORS.FONT_LOAD_FAILED.adminMessage);
	throw new Error(OG_ERRORS.FONT_LOAD_FAILED.adminMessage);
}

// =============================================================================
// HTML GENERATION - Simplified for Satori performance
// =============================================================================

function generateHtml(
	title: string,
	subtitle: string,
	preview: string | null,
	variant: Variant,
	brand?: string | null,
	accentHex?: string | null,
): string {
	const c = getColors(variant);

	// Override accent color for default variant if accentHex is provided
	if (accentHex && variant === "default") {
		c.accent = accentHex;
		// Convert hex to RGB for glassBorder at 25% opacity
		const r = parseInt(accentHex.slice(1, 3), 16);
		const g = parseInt(accentHex.slice(3, 5), 16);
		const b = parseInt(accentHex.slice(5, 7), 16);
		c.glassBorder = `rgba(${r}, ${g}, ${b}, 0.2)`;
	}

	const brandName = brand || "Grove";
	const domainFooter = brand ? `${brand.toLowerCase()}.grove.place` : "grove.place";

	// Glass panel on right side with fading text effect
	let rightPanel: string;
	if (preview) {
		const { line1, line2, line3, line4 } = splitPreviewIntoLines(preview);

		// Only render lines that have content, with decreasing opacity for fade effect
		const lineConfigs = [
			{ text: line1, opacity: 1.0 },
			{ text: line2, opacity: 0.75 },
			{ text: line3, opacity: 0.5 },
			{ text: line4, opacity: 0.25 },
		].filter((config) => config.text);

		const lineElements = lineConfigs
			.map(
				({ text, opacity }) =>
					`<div style="display: flex; font-size: 16px; color: ${c.muted}; line-height: 1.6; opacity: ${opacity};">${escapeHtml(text)}</div>`,
			)
			.join("");

		rightPanel = `<div style="display: flex; flex-direction: column; position: absolute; right: 60px; top: 120px; bottom: 100px; width: 380px; padding: 24px; background: ${c.glass}; border-radius: 16px; border: 1px solid ${c.glassBorder}; overflow: hidden;">
      ${lineElements}
    </div>`;
	} else {
		rightPanel = `<div style="display: flex; position: absolute; right: 60px; top: 120px; bottom: 100px; width: 380px; background: ${c.glass}; border-radius: 16px; border: 1px solid ${c.glassBorder}; opacity: 0.5;"></div>`;
	}

	// Ultra-simplified layout - minimal elements, no gradients, solid bg
	return `<div style="display: flex; flex-direction: column; width: 1200px; height: 630px; background: ${c.bgFrom}; padding: 60px; font-family: Lexend; position: relative;">
  <div style="display: flex; position: absolute; top: 0; left: 0; width: 1200px; height: 4px; background: ${c.accent};"></div>
  <div style="display: flex; align-items: center; margin-bottom: 32px;">
    <img src="https://grove.place/icon-192.png" width="48" height="48" style="border-radius: 8px;" />
    <div style="display: flex; font-size: 24px; font-weight: 700; color: ${c.accent}; margin-left: 14px;">${brandName}</div>
  </div>
  <div style="display: flex; font-size: 52px; font-weight: 700; letter-spacing: -0.02em; color: ${c.text}; line-height: 1.15; max-width: 660px;">${title}</div>
  <div style="display: flex; font-size: 22px; font-weight: 400; color: ${c.muted}; margin-top: 12px; line-height: 1.4; max-width: 620px;">${subtitle}</div>
  ${rightPanel}
  <div style="display: flex; position: absolute; bottom: 50px; left: 60px;">
    <div style="display: flex; font-size: 16px; letter-spacing: 0.02em; color: ${c.muted};">${domainFooter}</div>
  </div>
</div>`;
}

// =============================================================================
// DYNAMIC CONTENT FETCHING
// =============================================================================

interface PageMeta {
	title: string | null;
	description: string | null;
	preview: string | null;
}

async function fetchPageMeta(pageUrl: string): Promise<PageMeta> {
	try {
		const response = await fetch(pageUrl, {
			headers: { "User-Agent": "Grove-OG-Bot/1.0" },
		});
		if (!response.ok) return { title: null, description: null, preview: null };

		const html = await response.text();

		// Extract meta tags using regex (simple, no DOM parser needed)
		const getMetaContent = (name: string): string | null => {
			// Try property="og:X" first
			const ogMatch = html.match(
				new RegExp(`<meta[^>]+property=["']og:${name}["'][^>]+content=["']([^"']+)["']`, "i"),
			);
			if (ogMatch) return ogMatch[1];

			// Try name="X"
			const nameMatch = html.match(
				new RegExp(`<meta[^>]+name=["']${name}["'][^>]+content=["']([^"']+)["']`, "i"),
			);
			if (nameMatch) return nameMatch[1];

			// Try reversed attribute order
			const reversedMatch = html.match(
				new RegExp(
					`<meta[^>]+content=["']([^"']+)["'][^>]+(?:name|property)=["'](?:og:)?${name}["']`,
					"i",
				),
			);
			if (reversedMatch) return reversedMatch[1];

			return null;
		};

		// Get title from og:title or <title> tag
		const ogTitle = getMetaContent("title");
		const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
		const title = ogTitle || (titleMatch ? titleMatch[1].trim() : null);

		// Get description
		const description = getMetaContent("description");

		// Try to extract preview content from main text
		// Look for article, main content, or first paragraphs
		let preview = description;
		if (!preview) {
			// Strip scripts and styles, then get text from paragraphs
			const cleanHtml = html
				.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
				.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "");
			const paragraphs = cleanHtml.match(/<p[^>]*>([^<]+)<\/p>/gi);
			if (paragraphs && paragraphs.length > 0) {
				const firstParas = paragraphs
					.slice(0, 3)
					.map((p) => p.replace(/<[^>]+>/g, "").trim())
					.filter((p) => p.length > 20)
					.join(" ");
				preview = firstParas.slice(0, 300);
			}
		}

		return { title, description, preview };
	} catch (e) {
		console.error("Failed to fetch page meta:", e);
		return { title: null, description: null, preview: null };
	}
}

// =============================================================================
// EXTERNAL OG METADATA FETCHER (for LinkPreview component)
// =============================================================================

interface OGFetchResult {
	success: boolean;
	data?: OGMetadata;
	error?: string;
	errorCode?: string;
	cached?: boolean;
}

// =============================================================================
// RATE LIMITING
// =============================================================================

interface RateLimitResult {
	limited: boolean;
	remaining: number;
}

/**
 * IP-based rate limiting using KV storage.
 * Returns whether the request should be blocked and remaining quota.
 */
async function checkRateLimit(env: Env, ip: string): Promise<RateLimitResult> {
	// If no KV available, allow all requests (degraded mode)
	if (!env.OG_CACHE) {
		return { limited: false, remaining: 100 };
	}

	const key = `ratelimit:fetch:${ip}`;
	const limit = 100; // requests per hour
	const window = 3600; // 1 hour in seconds

	try {
		const current = await env.OG_CACHE.get(key);
		const count = current ? parseInt(current, 10) : 0;

		if (count >= limit) {
			log("warn", "ratelimit", "Rate limit exceeded", {
				ip: ip.slice(0, 8) + "...",
			});
			return { limited: true, remaining: 0 };
		}

		// Increment counter (fire-and-forget for performance)
		env.OG_CACHE.put(key, String(count + 1), { expirationTtl: window }).catch((err) => {
			console.warn("[OG] Rate limit update failed:", err?.message);
		});

		return { limited: false, remaining: limit - count - 1 };
	} catch {
		// On KV error, allow the request (fail open)
		log("warn", "ratelimit", "KV error, allowing request");
		return { limited: false, remaining: 100 };
	}
}

async function handleOGFetch(
	request: Request,
	env: Env,
	corsHeaders: Record<string, string>,
): Promise<Response> {
	const url = new URL(request.url);
	const targetUrl = url.searchParams.get("url");

	if (!targetUrl) {
		return new Response(
			JSON.stringify({
				success: false,
				error: "Missing url parameter",
				errorCode: "INVALID_URL",
			} satisfies OGFetchResult),
			{
				status: 400,
				headers: { "Content-Type": "application/json", ...corsHeaders },
			},
		);
	}

	// Validate URL
	let parsedUrl: URL;
	try {
		parsedUrl = new URL(targetUrl);
		if (!["http:", "https:"].includes(parsedUrl.protocol)) {
			throw new Error(OG_ERRORS.INVALID_URL.adminMessage);
		}
	} catch {
		return new Response(
			JSON.stringify({
				success: false,
				error: "Invalid URL format",
				errorCode: "INVALID_URL",
			} satisfies OGFetchResult),
			{
				status: 400,
				headers: { "Content-Type": "application/json", ...corsHeaders },
			},
		);
	}

	// Check for blocked URLs (security)
	if (isBlockedExternalUrl(targetUrl)) {
		return new Response(
			JSON.stringify({
				success: false,
				error: "URL is blocked for security reasons",
				errorCode: "BLOCKED",
			} satisfies OGFetchResult),
			{
				status: 403,
				headers: { "Content-Type": "application/json", ...corsHeaders },
			},
		);
	}

	// Check cache first
	const cacheKey = `og:${targetUrl}`;
	if (env.OG_CACHE) {
		try {
			const cached = await env.OG_CACHE.get(cacheKey, "json");
			if (cached) {
				return new Response(
					JSON.stringify({
						success: true,
						data: cached as OGMetadata,
						cached: true,
					} satisfies OGFetchResult),
					{
						headers: {
							"Content-Type": "application/json",
							"X-Cache": "HIT",
							...corsHeaders,
						},
					},
				);
			}
		} catch {
			// Cache miss or error, continue to fetch
		}
	}

	// Fetch the URL
	let response: Response;
	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 5000);

		response = await fetch(targetUrl, {
			method: "GET",
			headers: {
				"User-Agent": "GroveBot/1.0 (+https://grove.place; Open Graph Fetcher)",
				Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
				"Accept-Language": "en-US,en;q=0.5",
			},
			signal: controller.signal,
			redirect: "follow",
		});

		clearTimeout(timeoutId);
	} catch (err) {
		const isTimeout = err instanceof Error && err.name === "AbortError";
		return new Response(
			JSON.stringify({
				success: false,
				error: isTimeout ? "Request timed out" : "Failed to fetch URL",
				errorCode: isTimeout ? "TIMEOUT" : "FETCH_FAILED",
			} satisfies OGFetchResult),
			{
				status: isTimeout ? 504 : 502,
				headers: { "Content-Type": "application/json", ...corsHeaders },
			},
		);
	}

	if (!response.ok) {
		return new Response(
			JSON.stringify({
				success: false,
				error: `HTTP ${response.status}: ${response.statusText}`,
				errorCode: "FETCH_FAILED",
			} satisfies OGFetchResult),
			{
				status: 502,
				headers: { "Content-Type": "application/json", ...corsHeaders },
			},
		);
	}

	// Check content type
	const contentType = response.headers.get("content-type") || "";
	if (!contentType.includes("text/html") && !contentType.includes("application/xhtml+xml")) {
		return new Response(
			JSON.stringify({
				success: false,
				error: "Response is not HTML",
				errorCode: "NOT_HTML",
			} satisfies OGFetchResult),
			{
				status: 400,
				headers: { "Content-Type": "application/json", ...corsHeaders },
			},
		);
	}

	// Read HTML (just the head section for efficiency)
	let html: string;
	try {
		const reader = response.body?.getReader();
		if (!reader) {
			throw new Error(OG_ERRORS.READ_FAILED.adminMessage);
		}

		const chunks: Uint8Array[] = [];
		let totalSize = 0;
		const maxSize = 512 * 1024; // 512KB max

		while (totalSize < maxSize) {
			const { done, value } = await reader.read();
			if (done) break;
			chunks.push(value);
			totalSize += value.length;

			// Check if we've got the </head> tag
			const decoder = new TextDecoder();
			const partial = decoder.decode(value, { stream: true });
			if (partial.includes("</head>")) {
				reader.cancel();
				break;
			}
		}

		html = new TextDecoder().decode(
			new Uint8Array(
				chunks.reduce((acc, chunk) => {
					const newArr = new Uint8Array(acc.length + chunk.length);
					newArr.set(acc);
					newArr.set(chunk, acc.length);
					return newArr;
				}, new Uint8Array(0)),
			),
		);
	} catch {
		return new Response(
			JSON.stringify({
				success: false,
				error: "Failed to read response",
				errorCode: "PARSE_FAILED",
			} satisfies OGFetchResult),
			{
				status: 500,
				headers: { "Content-Type": "application/json", ...corsHeaders },
			},
		);
	}

	// Parse metadata
	const metadata: OGMetadata = {
		...parseExternalOGMetadata(html, parsedUrl),
		fetchedAt: new Date().toISOString(),
	};

	// Cache the result (1 hour TTL)
	if (env.OG_CACHE && metadata.title) {
		try {
			await env.OG_CACHE.put(cacheKey, JSON.stringify(metadata), {
				expirationTtl: 3600,
			});
		} catch {
			// Cache write failed, continue anyway
		}
	}

	return new Response(
		JSON.stringify({
			success: true,
			data: metadata,
			cached: false,
		} satisfies OGFetchResult),
		{
			headers: {
				"Content-Type": "application/json",
				"X-Cache": "MISS",
				"Cache-Control": "public, max-age=300", // Browser cache 5 min
				...corsHeaders,
			},
		},
	);
}

// =============================================================================
// WORKER HANDLER
// =============================================================================

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// Enhanced health check with dependency verification
		if (url.pathname === "/health") {
			const checks: Array<{
				name: string;
				status: "pass" | "cold" | "fail";
				cached?: boolean;
				latency_ms?: number;
			}> = [];

			// Check font cache status
			checks.push({
				name: "font_cache",
				status: fontCache ? "pass" : "cold",
				cached: fontCache !== null,
			});

			// Check KV availability if configured
			if (env.OG_CACHE) {
				const start = Date.now();
				try {
					await env.OG_CACHE.get("health-check-ping");
					checks.push({
						name: "kv_cache",
						status: "pass",
						latency_ms: Date.now() - start,
					});
				} catch {
					checks.push({ name: "kv_cache", status: "fail" });
				}
			}

			const hasFailed = checks.some((c) => c.status === "fail");
			const status = hasFailed ? "degraded" : "healthy";

			return new Response(
				JSON.stringify({
					status,
					checks,
					timestamp: new Date().toISOString(),
				}),
				{
					status: 200,
					headers: { "Content-Type": "application/json" },
				},
			);
		}

		const corsHeaders = {
			"Access-Control-Allow-Origin": "*",
			"Access-Control-Allow-Methods": "GET, OPTIONS",
			"Access-Control-Allow-Headers": "Content-Type",
		};

		if (request.method === "OPTIONS") {
			return new Response(null, { headers: corsHeaders });
		}

		// Route: /fetch - External OG metadata fetcher
		if (url.pathname === "/fetch") {
			if (request.method !== "GET") {
				return new Response("Method not allowed", { status: 405 });
			}

			// Rate limiting to prevent abuse
			const ip = request.headers.get("CF-Connecting-IP") || "unknown";
			const { limited, remaining } = await checkRateLimit(env, ip);

			if (limited) {
				return new Response(
					JSON.stringify({
						success: false,
						error: "Rate limit exceeded",
						errorCode: "RATE_LIMITED",
					} satisfies OGFetchResult),
					{
						status: 429,
						headers: {
							"Content-Type": "application/json",
							"Retry-After": "3600",
							"X-RateLimit-Remaining": "0",
							...corsHeaders,
						},
					},
				);
			}

			const response = await handleOGFetch(request, env, corsHeaders);
			// Add rate limit header to successful responses
			response.headers.set("X-RateLimit-Remaining", String(remaining));
			return response;
		}

		// Route: / or /og - OG image generation
		if (request.method !== "GET" || (url.pathname !== "/" && url.pathname !== "/og")) {
			return new Response("Not found", { status: 404 });
		}

		try {
			// Check for dynamic URL fetching
			const pageUrl = url.searchParams.get("url");
			let pageMeta: PageMeta | null = null;

			if (pageUrl) {
				// Validate URL against SSRF prevention rules
				if (isAllowedUrl(pageUrl)) {
					pageMeta = await fetchPageMeta(pageUrl);
				}
			}

			// Use fetched meta or fall back to explicit params
			const rawTitle = url.searchParams.get("title") || pageMeta?.title || "Grove";
			const rawSubtitle =
				url.searchParams.get("subtitle") || pageMeta?.description || "A place to Be.";
			const rawVariant = url.searchParams.get("variant") || "default";
			const rawPreview = url.searchParams.get("preview") || pageMeta?.preview;
			const rawBrand = url.searchParams.get("brand");
			const rawAccent = url.searchParams.get("accent");

			const title = escapeHtml(rawTitle.slice(0, 80));
			const subtitle = escapeHtml(rawSubtitle.slice(0, 150));
			const preview = rawPreview ? rawPreview.slice(0, 400) : null;
			const variant = ["default", "forest", "workshop", "midnight", "knowledge"].includes(
				rawVariant,
			)
				? (rawVariant as Variant)
				: "default";
			const brand = rawBrand ? escapeHtml(rawBrand.slice(0, 50)) : null;
			const accentHex = rawAccent && /^[0-9A-Fa-f]{6}$/.test(rawAccent) ? `#${rawAccent}` : null;

			const [fontData, boldFontData] = await Promise.all([getFont(env), getBoldFont(env)]);
			const html = generateHtml(title, subtitle, preview, variant, brand, accentHex);

			const response = new ImageResponse(html, {
				width: 1200,
				height: 630,
				fonts: [
					{ name: "Lexend", data: fontData, weight: 400, style: "normal" },
					{ name: "Lexend", data: boldFontData, weight: 700, style: "normal" },
				],
			});

			const headers = new Headers(response.headers);
			headers.set("Cache-Control", "public, max-age=86400, s-maxage=604800");
			headers.set("X-Generated-At", new Date().toISOString());
			headers.set("X-OG-Variant", variant);
			Object.entries(corsHeaders).forEach(([k, v]) => headers.set(k, v));

			return new Response(response.body, { status: 200, headers });
		} catch (error) {
			// Determine error type for appropriate response
			const isFontError = error instanceof Error && error.message.includes("font");
			const errorType = isFontError ? "FONT_UNAVAILABLE" : "GENERATION_FAILED";

			log("error", "og", errorType, {
				message: error instanceof Error ? error.message : "Unknown",
			});

			return new Response(
				JSON.stringify({
					error: errorType,
					message: isFontError ? "Font service temporarily unavailable" : "Image generation failed",
				}),
				{
					status: isFontError ? 503 : 500,
					headers: { "Content-Type": "application/json", ...corsHeaders },
				},
			);
		}
	},
};
