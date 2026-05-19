/**
 * Template Registry
 *
 * Maps template names to render functions.
 * Supports both named templates and "raw" for pre-rendered content.
 */

import { ZEPHYR_ERRORS, logZephyrError } from "../errors";
import type { TemplateRenderFn } from "../types";

/**
 * Template registry
 *
 * Templates are rendered by the email-render worker.
 * This registry maps template names to their rendering logic.
 */
export const TEMPLATES: Record<string, TemplateRenderFn> = {
	// Raw template - use pre-rendered HTML/text
	raw: async (data) => {
		const html = data.html as string;
		const text = data.text as string;
		const subject = data.subject as string;

		if (!html && !text) {
			logZephyrError(ZEPHYR_ERRORS.INVALID_TEMPLATE, { detail: "raw template missing html/text" });
			throw new Error(ZEPHYR_ERRORS.INVALID_TEMPLATE.userMessage);
		}
		if (!subject) {
			logZephyrError(ZEPHYR_ERRORS.INVALID_TEMPLATE, { detail: "raw template missing subject" });
			throw new Error(ZEPHYR_ERRORS.INVALID_TEMPLATE.userMessage);
		}

		return {
			html: html || text!,
			text: text || html!,
			subject,
		};
	},
};

/**
 * Render a template
 *
 * For named templates, calls the email-render worker via Service Binding
 * (preferred) or HTTP URL fallback (for local dev).
 * For "raw" template, returns pre-rendered content.
 */
export async function renderTemplate(
	templateName: string,
	data: Record<string, unknown>,
	renderUrl: string,
	rawHtml?: string,
	rawText?: string,
	rawSubject?: string,
	renderBinding?: Fetcher,
): Promise<{ html: string; text: string; subject: string }> {
	// Handle raw template
	if (templateName === "raw") {
		if (!rawHtml && !rawText) {
			logZephyrError(ZEPHYR_ERRORS.INVALID_TEMPLATE, {
				detail: "renderTemplate: missing html/text",
			});
			throw new Error(ZEPHYR_ERRORS.INVALID_TEMPLATE.userMessage);
		}
		if (!rawSubject) {
			logZephyrError(ZEPHYR_ERRORS.INVALID_TEMPLATE, { detail: "renderTemplate: missing subject" });
			throw new Error(ZEPHYR_ERRORS.INVALID_TEMPLATE.userMessage);
		}

		return {
			html: rawHtml || rawText!,
			text: rawText || rawHtml!,
			subject: rawSubject,
		};
	}

	// Call email-render worker for named templates
	try {
		const controller = new AbortController();
		const timeoutId = setTimeout(() => controller.abort(), 5000); // 5 second timeout

		const body = JSON.stringify({
			template: templateName,
			audienceType: data.audienceType || "wanderer",
			name: data.name || null,
			...data,
		});

		// Prefer Service Binding (direct Worker-to-Worker), fall back to HTTP URL
		const response = renderBinding
			? await renderBinding.fetch("https://email-render/render", {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body,
					signal: controller.signal,
				})
			: await fetch(`${renderUrl}/render`, {
					method: "POST",
					headers: { "Content-Type": "application/json" },
					body,
					signal: controller.signal,
				});

		clearTimeout(timeoutId);

		if (!response.ok) {
			const errorText = await response.text();
			logZephyrError(ZEPHYR_ERRORS.TEMPLATE_RENDER_FAILED, {
				detail: `HTTP ${response.status}: ${errorText}`,
			});
			throw new Error(ZEPHYR_ERRORS.TEMPLATE_RENDER_FAILED.userMessage);
		}

		const result = (await response.json()) as {
			html: string;
			text: string;
			subject?: string;
		};

		// If the render worker doesn't return a subject, use the one from data
		const subject = result.subject || (data.subject as string) || "Message from Grove";

		return {
			html: result.html,
			text: result.text,
			subject,
		};
	} catch (error) {
		// Re-throw if already a safe grove error (already logged above)
		if (
			error instanceof Error &&
			error.message === ZEPHYR_ERRORS.TEMPLATE_RENDER_FAILED.userMessage
		) {
			throw error;
		}
		const message = error instanceof Error ? error.message : String(error);
		logZephyrError(ZEPHYR_ERRORS.TEMPLATE_RENDER_FAILED, { cause: error, detail: message });
		throw new Error(ZEPHYR_ERRORS.TEMPLATE_RENDER_FAILED.userMessage);
	}
}

/**
 * Check if a template exists
 */
export function templateExists(name: string): boolean {
	return name === "raw" || true; // Named templates are validated by render worker
}

/**
 * Get list of available templates
 */
export function getTemplateNames(): string[] {
	return Object.keys(TEMPLATES);
}
