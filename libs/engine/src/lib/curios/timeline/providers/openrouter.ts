/**
 * OpenRouter Provider
 *
 * Universal AI gateway supporting 100+ models through a single API.
 * Users bring their own API key and pick their preferred model.
 *
 * Model data sourced from centralized lumen-models.json.
 *
 * @see https://openrouter.ai/docs
 */

import modelData from "../../../data/lumen-models.json";

// =============================================================================
// Types
// =============================================================================

export interface OpenRouterModel {
	name: string;
	quality: "highest" | "high" | "good";
	speed: "fastest" | "fast" | "medium";
	inputCostPer1M: number;
	outputCostPer1M: number;
}

export interface OpenRouterResponse {
	content: string;
	inputTokens: number;
	outputTokens: number;
	model: string;
	provider: "openrouter";
}

export interface OpenRouterOptions {
	maxTokens?: number;
	temperature?: number;
	siteUrl?: string;
	siteName?: string;
}

export interface OpenRouterKeyValidation {
	valid: boolean;
	error?: string;
	credits?: number;
	usage?: number;
}

// API Response types
interface OpenRouterAPIResponse {
	choices?: Array<{
		message?: {
			content?: string;
		};
	}>;
	usage?: {
		prompt_tokens?: number;
		completion_tokens?: number;
	};
	model?: string;
}

interface OpenRouterKeyResponse {
	data?: {
		limit_remaining?: number;
		usage?: number;
	};
}

// =============================================================================
// Model Definitions — sourced from lumen-models.json
// =============================================================================

/** Keys from lumen-models.json to expose in the Timeline model picker */
const TIMELINE_MODEL_KEYS = [
	"DEEPSEEK_V3",
	"KIMI_K2_5",
	"TRINITY",
	"MINIMAX_M2_7",
	"CLAUDE_HAIKU",
	"GPT_OSS_120B",
	"QWEN3_235B",
	"LLAMA_70B",
	"GLM_5_1",
	"LLAMA_4_MAVERICK",
] as const;

type ModelEntry = (typeof modelData.models)[keyof typeof modelData.models];

/**
 * Popular models available through OpenRouter for Timeline generation.
 * Users can use ANY OpenRouter model, but these are recommended defaults.
 * All data sourced from lumen-models.json.
 */
export const OPENROUTER_MODELS: Record<string, OpenRouterModel> = Object.fromEntries(
	TIMELINE_MODEL_KEYS.map((key) => {
		const entry = modelData.models[key] as ModelEntry;
		return [
			entry.id,
			{
				name: entry.name,
				quality: entry.quality as OpenRouterModel["quality"],
				speed: entry.speed as OpenRouterModel["speed"],
				inputCostPer1M: entry.cost.input,
				outputCostPer1M: entry.cost.output,
			},
		];
	}),
);

export const DEFAULT_OPENROUTER_MODEL = modelData.models[modelData.defaults.timeline].id;

// =============================================================================
// UI Utilities (kept for model picker and key validation)
// =============================================================================

/**
 * Get list of recommended OpenRouter models for the UI
 */
export function getOpenRouterModels() {
	return Object.entries(OPENROUTER_MODELS).map(([id, config]) => ({
		id,
		name: config.name,
		quality: config.quality,
		speed: config.speed,
		inputCostPer1M: config.inputCostPer1M,
		outputCostPer1M: config.outputCostPer1M,
		isDefault: id === DEFAULT_OPENROUTER_MODEL,
	}));
}

/**
 * Validate an OpenRouter API key
 */
export async function validateOpenRouterKey(apiKey: string): Promise<OpenRouterKeyValidation> {
	try {
		const response = await fetch("https://openrouter.ai/api/v1/auth/key", {
			headers: {
				Authorization: `Bearer ${apiKey}`,
			},
		});

		if (!response.ok) {
			if (response.status === 401) {
				return { valid: false, error: "Invalid API key" };
			}
			return { valid: false, error: `API error: ${response.status}` };
		}

		const data = (await response.json()) as OpenRouterKeyResponse;

		return {
			valid: true,
			credits: data.data?.limit_remaining,
			usage: data.data?.usage,
		};
	} catch (error) {
		return { valid: false, error: (error as Error).message };
	}
}
