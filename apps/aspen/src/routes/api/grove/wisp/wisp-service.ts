/**
 * Wisp - Analysis Functions (Lumen-powered)
 *
 * Grammar, tone, and readability analysis business logic.
 */

import { PROMPT_MODES, getMaxTokens } from "@autumnsgrove/lattice/config/wisp";
import { secureUserContent } from "@autumnsgrove/lattice/server/inference-client";
import type { LumenClient } from "@autumnsgrove/lattice/lumen";
import { execute, queryOne } from "@autumnsgrove/lattice/server/services/database";

// ============================================================================
// Grammar Analysis
// ============================================================================

export async function analyzeGrammar(
	content: string,
	mode: "quick" | "thorough",
	lumen: LumenClient,
) {
	const modeConfig = PROMPT_MODES[mode];
	const maxTokens = getMaxTokens("grammar", mode);

	const prompt = `You are a helpful proofreader. Analyze the text for grammar, spelling, punctuation, and style issues.

${secureUserContent(content, "grammar analysis")}

IMPORTANT RULES:
- ONLY identify actual errors and unclear writing
- Do NOT suggest rewording that changes meaning
- Do NOT suggest expanding or adding content
- Be helpful but not pedantic
- Focus on errors that would confuse readers
${mode === "thorough" ? "- Be comprehensive and check for subtle issues" : "- Focus on the most important issues only"}

Return a JSON object with:
{
  "suggestions": [
    {
      "original": "the exact text with the issue",
      "suggestion": "the corrected text",
      "reason": "brief explanation (1 sentence max)",
      "severity": "error" | "warning" | "style"
    }
  ],
  "overallScore": 0-100
}

Use these severity levels:
- "error": Grammar/spelling mistakes
- "warning": Unclear or potentially confusing phrasing
- "style": Minor style improvements (use sparingly)

Return ONLY valid JSON. No explanation or markdown.`;

	const response = await lumen.run({
		task: "generation",
		input: prompt,
		options: {
			maxTokens,
			temperature: modeConfig.temperature,
		},
	});

	try {
		const result = JSON.parse(response.content);
		return {
			result: {
				suggestions: result.suggestions || [],
				overallScore: typeof result.overallScore === "number" ? result.overallScore : null,
			},
			usage: response.usage,
			model: response.model,
			provider: response.provider,
		};
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		console.warn(
			"[Wisp] Failed to parse grammar result:",
			message,
			"| Response preview:",
			response.content?.substring(0, 100),
		);
		return {
			result: { suggestions: [], overallScore: null, parseError: true },
			usage: response.usage,
			model: response.model,
			provider: response.provider,
		};
	}
}

// ============================================================================
// Tone Analysis
// ============================================================================

export async function analyzeTone(
	content: string,
	mode: "quick" | "thorough",
	lumen: LumenClient,
	context?: { slug?: string; title?: string; audience?: string } | null,
) {
	const modeConfig = PROMPT_MODES[mode];
	const maxTokens = getMaxTokens("tone", mode);

	const audienceNote = context?.audience
		? `The intended audience is: ${context.audience}`
		: "No specific audience indicated.";

	const titleNote = context?.title ? `The piece is titled: "${context.title}"` : "";

	const prompt = `You are analyzing the tone of a piece of writing. ${titleNote} ${audienceNote}

${secureUserContent(content, "tone analysis")}

Analyze the overall tone and voice. Do NOT suggest rewrites or content changes.
${mode === "thorough" ? "Provide detailed analysis of voice consistency and emotional resonance." : "Keep analysis brief and focused."}

Return a JSON object with:
{
  "analysis": "2-3 sentence summary of the overall tone and voice",
  "traits": [
    { "trait": "trait name", "score": 0-100 }
  ],
  "suggestions": ["brief observation about tone consistency (max 3)"]
}

Common traits to evaluate (pick 4-6 most relevant):
- formal, casual, friendly, professional
- technical, accessible, poetic, direct
- warm, neutral, passionate, contemplative

Return ONLY valid JSON. No explanation or markdown.`;

	const response = await lumen.run({
		task: "generation",
		input: prompt,
		options: {
			maxTokens,
			temperature: modeConfig.temperature,
		},
	});

	try {
		const result = JSON.parse(response.content);
		return {
			result: {
				analysis: result.analysis || null,
				traits: result.traits || [],
				suggestions: result.suggestions || [],
			},
			usage: response.usage,
			model: response.model,
			provider: response.provider,
		};
	} catch (err: unknown) {
		const message = err instanceof Error ? err.message : String(err);
		console.warn(
			"[Wisp] Failed to parse tone result:",
			message,
			"| Response preview:",
			response.content?.substring(0, 100),
		);
		return {
			result: { analysis: null, traits: [], suggestions: [], parseError: true },
			usage: response.usage,
			model: response.model,
			provider: response.provider,
		};
	}
}

// ============================================================================
// Usage Logging
// ============================================================================

export async function logWispUsage(
	db: D1Database,
	userId: string,
	action: string,
	mode: string,
	modelUsed: string | null,
	providerUsed: string | null,
	totalTokens: { input: number; output: number },
	cost: number,
	postSlug: string | null,
): Promise<void> {
	try {
		await execute(
			db,
			`INSERT INTO wisp_requests (user_id, action, mode, model, provider, input_tokens, output_tokens, cost, post_slug)
				VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
			[
				userId,
				action,
				mode,
				modelUsed || "local",
				providerUsed || "local",
				totalTokens.input,
				totalTokens.output,
				cost,
				postSlug,
			],
		);
	} catch (err) {
		console.warn(
			"[Wisp] Could not log usage:",
			err instanceof Error ? err.message : "Unknown error",
		);
	}
}

// ============================================================================
// Usage Statistics
// ============================================================================

export async function getWispUsageStats(
	db: D1Database,
	userId: string,
): Promise<{ requests: number; tokens: number; cost: number; period: string }> {
	try {
		const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

		const stats = await queryOne<{ requests: number; tokens: number; cost: number }>(
			db,
			`SELECT
					COUNT(*) as requests,
					COALESCE(SUM(input_tokens + output_tokens), 0) as tokens,
					COALESCE(SUM(cost), 0) as cost
				FROM wisp_requests
				WHERE user_id = ? AND created_at > ?`,
			[userId, thirtyDaysAgo],
		);

		return {
			requests: stats?.requests || 0,
			tokens: stats?.tokens || 0,
			cost: stats?.cost || 0,
			period: "30 days",
		};
	} catch {
		return { requests: 0, tokens: 0, cost: 0, period: "30 days" };
	}
}
