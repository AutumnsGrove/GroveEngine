/**
 * Feature Flag Evaluation Engine
 *
 * Core evaluation logic that combines D1 queries, rule evaluation, and KV caching.
 *
 * @see docs/plans/feature-flags-spec.md
 */

import {
  buildCacheKey,
  cacheResult,
  cachedToResult,
  getCachedValue,
  shouldBypassCache,
} from "./cache.js";
import { evaluateRule } from "./rules.js";
import type {
  EvaluationContext,
  EvaluationResult,
  FeatureFlag,
  FeatureFlagRow,
  FeatureFlagsEnv,
  FlagRule,
  FlagRuleRow,
  RuleCondition,
} from "./types.js";

// =============================================================================
// DATABASE QUERIES
// =============================================================================

/**
 * Load a flag with its rules from D1.
 */
async function loadFlagWithRules(
  flagId: string,
  db: D1Database,
): Promise<FeatureFlag | null> {
  try {
    // Load flag
    const flagRow = await db
      .prepare("SELECT * FROM feature_flags WHERE id = ?")
      .bind(flagId)
      .first<FeatureFlagRow>();

    if (!flagRow) return null;

    // Load rules
    const rulesResult = await db
      .prepare(
        "SELECT * FROM flag_rules WHERE flag_id = ? AND enabled = 1 ORDER BY priority DESC",
      )
      .bind(flagId)
      .all<FlagRuleRow>();

    const rules: FlagRule[] = (rulesResult.results ?? []).map((row) =>
      rowToRule(row),
    );

    return rowToFlag(flagRow, rules);
  } catch (error) {
    console.error(`Failed to load flag ${flagId}:`, error);
    return null;
  }
}

/**
 * Convert a database row to a FlagRule.
 */
function rowToRule(row: FlagRuleRow): FlagRule {
  return {
    id: row.id,
    flagId: row.flag_id,
    priority: row.priority,
    ruleType: row.rule_type as FlagRule["ruleType"],
    ruleValue: JSON.parse(row.rule_value) as RuleCondition,
    resultValue: JSON.parse(row.result_value),
    enabled: row.enabled === 1,
    createdAt: new Date(row.created_at),
  };
}

/**
 * Convert a database row to a FeatureFlag.
 */
function rowToFlag(row: FeatureFlagRow, rules: FlagRule[]): FeatureFlag {
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? undefined,
    flagType: row.flag_type as FeatureFlag["flagType"],
    defaultValue: JSON.parse(row.default_value),
    enabled: row.enabled === 1,
    cacheTtl: row.cache_ttl ?? undefined,
    rules,
    createdAt: new Date(row.created_at),
    updatedAt: new Date(row.updated_at),
    createdBy: row.created_by ?? undefined,
    updatedBy: row.updated_by ?? undefined,
  };
}

// =============================================================================
// CORE EVALUATION
// =============================================================================

/**
 * Evaluate a feature flag and return the result.
 *
 * This is the core evaluation function that:
 * 1. Checks KV cache first
 * 2. Loads flag from D1 if not cached
 * 3. Evaluates rules in priority order
 * 4. Caches the result
 *
 * @param flagId - The flag identifier
 * @param context - The evaluation context
 * @param env - Cloudflare environment bindings
 * @returns The evaluation result
 */
export async function evaluateFlag<T = unknown>(
  flagId: string,
  context: EvaluationContext,
  env: FeatureFlagsEnv,
): Promise<EvaluationResult<T>> {
  // 1. Check KV cache first (unless instant flag)
  if (!shouldBypassCache(flagId)) {
    const cacheKey = buildCacheKey(flagId, context);
    const cached = await getCachedValue<T>(cacheKey, env);

    if (cached) {
      return cachedToResult(cached);
    }
  }

  // 2. Load flag from D1
  const flag = await loadFlagWithRules(flagId, env.DB);

  if (!flag) {
    // Unknown flag - return safe default (false for boolean, null otherwise)
    return {
      value: false as T,
      flagId,
      matched: false,
      evaluatedAt: new Date(),
      cached: false,
    };
  }

  // 3. Check master kill switch
  if (!flag.enabled) {
    const result: EvaluationResult<T> = {
      value: flag.defaultValue as T,
      flagId,
      matched: false,
      evaluatedAt: new Date(),
      cached: false,
    };

    // Cache even disabled flags (reduces D1 load)
    const cacheKey = buildCacheKey(flagId, context);
    await cacheResult(cacheKey, result, env, flag.cacheTtl);

    return result;
  }

  // 4. Evaluate rules in priority order (already sorted by D1 query)
  for (const rule of flag.rules) {
    const matches = await evaluateRule(rule, context, flagId);

    if (matches) {
      const result: EvaluationResult<T> = {
        value: rule.resultValue as T,
        flagId,
        matched: true,
        matchedRuleId: rule.id,
        evaluatedAt: new Date(),
        cached: false,
      };

      const cacheKey = buildCacheKey(flagId, context);
      await cacheResult(cacheKey, result, env, flag.cacheTtl);

      return result;
    }
  }

  // 5. No rules matched - use default
  const result: EvaluationResult<T> = {
    value: flag.defaultValue as T,
    flagId,
    matched: false,
    evaluatedAt: new Date(),
    cached: false,
  };

  const cacheKey = buildCacheKey(flagId, context);
  await cacheResult(cacheKey, result, env, flag.cacheTtl);

  return result;
}

// =============================================================================
// BATCH EVALUATION
// =============================================================================

/**
 * Evaluate multiple flags at once.
 * More efficient than evaluating flags one at a time.
 *
 * @param flagIds - Array of flag identifiers
 * @param context - The evaluation context
 * @param env - Cloudflare environment bindings
 * @returns Map of flag ID to evaluation result
 */
export async function evaluateFlags(
  flagIds: string[],
  context: EvaluationContext,
  env: FeatureFlagsEnv,
): Promise<Map<string, EvaluationResult>> {
  const results = await Promise.all(
    flagIds.map((id) => evaluateFlag(id, context, env)),
  );

  return new Map(flagIds.map((id, i) => [id, results[i]]));
}
