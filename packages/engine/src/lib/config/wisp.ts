/**
 * Wisp - Grove Writing Assistant Configuration
 *
 * Model configuration, provider settings, and pricing for the Wisp writing assistant.
 * Uses privacy-first providers with Zero Data Retention (ZDR).
 *
 * @see docs/specs/writing-assistant-unified-spec.md
 */

// ============================================================================
// Provider Configuration
// ============================================================================

export interface ProviderConfig {
  name: string;
  baseUrl: string;
  role: 'primary' | 'backup' | 'tertiary';
  zdr: boolean;
  models: Record<string, string>;
}

/**
 * Approved inference providers with ZDR support
 * Order determines fallback priority
 */
export const PROVIDERS: Record<string, ProviderConfig> = {
  fireworks: {
    name: "Fireworks AI",
    baseUrl: "https://api.fireworks.ai/inference/v1",
    role: "primary",
    zdr: true, // Zero Data Retention default for open models
    models: {
      "deepseek-v3.2": "accounts/fireworks/models/deepseek-v3p2",
      "kimi-k2": "accounts/fireworks/models/kimi-k2-instruct-0905",
      "llama-3.1-70b": "accounts/fireworks/models/llama-v3p1-70b-instruct",
    },
  },
  cerebras: {
    name: "Cerebras",
    baseUrl: "https://api.cerebras.ai/v1",
    role: "backup",
    zdr: true, // US-based, zero retention
    models: {
      "llama-3.3-70b": "llama-3.3-70b",
      "gpt-oss-120b": "gpt-oss-120b",
    },
  },
  groq: {
    name: "Groq",
    baseUrl: "https://api.groq.com/openai/v1",
    role: "tertiary",
    zdr: true, // Explicit ZDR toggle
    models: {
      "llama-3.3-70b": "llama-3.3-70b-versatile",
    },
  },
};

export interface ModelFallback {
  provider: string;
  model: string;
}

/**
 * Model fallback cascade
 * Try in order until one succeeds
 */
export const MODEL_FALLBACK_CASCADE: ModelFallback[] = [
  { provider: "fireworks", model: "deepseek-v3.2" },
  { provider: "fireworks", model: "kimi-k2" },
  { provider: "fireworks", model: "llama-3.1-70b" },
  { provider: "cerebras", model: "llama-3.3-70b" },
  { provider: "groq", model: "llama-3.3-70b" },
];

// ============================================================================
// Pricing (per million tokens)
// ============================================================================

export interface ModelPricing {
  input: number;
  output: number;
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  "deepseek-v3.2": { input: 0.56, output: 1.68 },
  "kimi-k2": { input: 0.6, output: 2.5 },
  "llama-3.1-70b": { input: 0.9, output: 0.9 },
  "llama-3.3-70b": { input: 0.59, output: 0.79 },
  "gpt-oss-120b": { input: 0.25, output: 0.69 },
};

// ============================================================================
// Limits & Thresholds
// ============================================================================

/** Maximum content length for analysis (characters) */
export const MAX_CONTENT_LENGTH = 50000;

/** Max output tokens by analysis type and mode */
export const MAX_OUTPUT_TOKENS = {
  grammar: { quick: 1024, thorough: 2048 },
  tone: { quick: 512, thorough: 1024 },
  readability: 0, // No AI call needed
} as const;

/**
 * Rate limiting (burst protection)
 * Note: Cost cap is the true monthly limit (~1000 requests at current pricing).
 * Hourly limit prevents abuse bursts, not total monthly usage.
 */
export const RATE_LIMIT = {
  maxRequestsPerHour: 10,
  windowSeconds: 3600,
} as const;

/** Monthly cost cap per user (the true usage limit) */
export const COST_CAP = {
  enabled: true,
  maxCostUSD: 5.0,
  warningThreshold: 0.8, // Warn at 80%
} as const;

// ============================================================================
// Prompt Modes
// ============================================================================

export type AnalysisMode = 'quick' | 'thorough';
export type AnalysisAction = 'grammar' | 'tone' | 'readability';

/**
 * Prompt modes control analysis depth without changing models
 */
export const PROMPT_MODES = {
  quick: {
    name: "Quick",
    description: "Fast essential checks",
    temperature: 0.1,
    maxOutputMultiplier: 1,
  },
  thorough: {
    name: "Thorough",
    description: "Comprehensive analysis",
    temperature: 0.2,
    maxOutputMultiplier: 2,
  },
} as const;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Calculate cost for token usage
 */
export function calculateCost(model: string, inputTokens: number, outputTokens: number): number {
  const pricing = MODEL_PRICING[model] || MODEL_PRICING["deepseek-v3.2"];
  const cost =
    (inputTokens * pricing.input + outputTokens * pricing.output) / 1_000_000;
  // Round to 6 decimal places to avoid floating point precision issues
  return Math.round(cost * 1_000_000) / 1_000_000;
}

/**
 * Get the model ID for a provider
 */
export function getModelId(provider: string, model: string): string | null {
  return PROVIDERS[provider]?.models[model] || null;
}

/**
 * Get provider configuration
 */
export function getProvider(provider: string): ProviderConfig | null {
  return PROVIDERS[provider] || null;
}

/**
 * Get max tokens for an action and mode
 */
export function getMaxTokens(action: AnalysisAction, mode: AnalysisMode = "quick"): number {
  const tokens = MAX_OUTPUT_TOKENS[action];
  if (typeof tokens === "number") return tokens;
  return tokens?.[mode] || 1024;
}
