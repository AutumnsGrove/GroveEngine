/**
 * Timeline Curio Secrets Helper
 *
 * Provides token retrieval with graceful migration from legacy encryption
 * (TOKEN_ENCRYPTION_KEY) to envelope encryption (SecretsManager).
 *
 * Migration strategy:
 * 1. Try SecretsManager first (new system, per-tenant isolation)
 * 2. Fall back to legacy column + TOKEN_ENCRYPTION_KEY
 * 3. Auto-migrate legacy tokens to SecretsManager on successful read
 */

import { createSecretsManager, type SecretsManager } from "$lib/server/secrets";
import { safeDecryptToken } from "$lib/server/encryption";

/** Secret key names for Timeline tokens in SecretsManager */
export const TIMELINE_SECRET_KEYS = {
  GITHUB_TOKEN: "timeline_github_token",
  OPENROUTER_KEY: "timeline_openrouter_key",
} as const;

export type TimelineSecretKey =
  (typeof TIMELINE_SECRET_KEYS)[keyof typeof TIMELINE_SECRET_KEYS];

/**
 * Environment bindings needed for token operations
 */
interface TokenEnv {
  DB: D1Database;
  GROVE_KEK?: string;
  TOKEN_ENCRYPTION_KEY?: string;
}

/**
 * Result of a token retrieval operation
 */
export interface TokenResult {
  token: string | null;
  source: "secrets_manager" | "legacy" | "none";
  migrated: boolean;
}

/**
 * Get a Timeline token with graceful migration from legacy encryption.
 *
 * Priority:
 * 1. SecretsManager (envelope encryption) - preferred, per-tenant isolation
 * 2. Legacy column + TOKEN_ENCRYPTION_KEY - fallback with auto-migrate
 *
 * @param env - Platform environment with DB and encryption bindings
 * @param tenantId - The tenant ID
 * @param keyName - Which secret to retrieve
 * @param legacyColumnValue - Value from the legacy encrypted column (may be null)
 * @returns TokenResult with the decrypted token and metadata
 */
export async function getTimelineToken(
  env: TokenEnv,
  tenantId: string,
  keyName: TimelineSecretKey,
  legacyColumnValue: string | null,
): Promise<TokenResult> {
  // Try new SecretsManager system first
  if (env.GROVE_KEK) {
    try {
      const secrets = await createSecretsManager({
        DB: env.DB,
        GROVE_KEK: env.GROVE_KEK,
      });
      const token = await secrets.safeGetSecret(tenantId, keyName);

      if (token) {
        return { token, source: "secrets_manager", migrated: false };
      }
    } catch (error) {
      console.warn(
        `[Timeline Secrets] SecretsManager failed for ${keyName}:`,
        error,
      );
      // Continue to legacy fallback
    }
  }

  // Fall back to legacy column + TOKEN_ENCRYPTION_KEY
  if (legacyColumnValue && env.TOKEN_ENCRYPTION_KEY) {
    const token = await safeDecryptToken(
      legacyColumnValue,
      env.TOKEN_ENCRYPTION_KEY,
    );

    if (token) {
      // Auto-migrate to SecretsManager if available
      let migrated = false;
      if (env.GROVE_KEK) {
        try {
          const secrets = await createSecretsManager({
            DB: env.DB,
            GROVE_KEK: env.GROVE_KEK,
          });
          await secrets.setSecret(tenantId, keyName, token);
          migrated = true;
          console.log(
            `[Timeline Secrets] Auto-migrated ${keyName} for tenant ${tenantId}`,
          );
        } catch (error) {
          console.warn(
            `[Timeline Secrets] Failed to auto-migrate ${keyName}:`,
            error,
          );
          // Non-fatal: token still works from legacy
        }
      }

      return { token, source: "legacy", migrated };
    }
  }

  // Also try legacy column without encryption (plaintext fallback for dev)
  if (legacyColumnValue && !env.TOKEN_ENCRYPTION_KEY) {
    // Check if it looks like an unencrypted token (no v1: prefix)
    if (!legacyColumnValue.startsWith("v1:")) {
      console.warn(
        `[Timeline Secrets] Using unencrypted legacy token for ${keyName} (TOKEN_ENCRYPTION_KEY not set)`,
      );
      return { token: legacyColumnValue, source: "legacy", migrated: false };
    }
  }

  return { token: null, source: "none", migrated: false };
}

/**
 * Save a Timeline token using SecretsManager (preferred) or legacy encryption.
 *
 * @param env - Platform environment with DB and encryption bindings
 * @param tenantId - The tenant ID
 * @param keyName - Which secret to store
 * @param plainToken - The plaintext token value
 * @returns Object indicating which system was used
 */
export async function setTimelineToken(
  env: TokenEnv,
  tenantId: string,
  keyName: TimelineSecretKey,
  plainToken: string,
): Promise<{
  system: "secrets_manager" | "legacy";
  legacyValue: string | null;
}> {
  // Prefer SecretsManager if available
  if (env.GROVE_KEK) {
    try {
      const secrets = await createSecretsManager({
        DB: env.DB,
        GROVE_KEK: env.GROVE_KEK,
      });
      await secrets.setSecret(tenantId, keyName, plainToken);

      // Return null for legacy column to clear it
      return { system: "secrets_manager", legacyValue: null };
    } catch (error) {
      console.error(
        `[Timeline Secrets] SecretsManager.setSecret failed for ${keyName}:`,
        error,
      );
      // Fall through to legacy
    }
  }

  // Fall back to legacy encryption
  if (env.TOKEN_ENCRYPTION_KEY) {
    const { encryptToken } = await import("$lib/server/encryption");
    const encrypted = await encryptToken(plainToken, env.TOKEN_ENCRYPTION_KEY);
    return { system: "legacy", legacyValue: encrypted };
  }

  // No encryption available - store plaintext (dev only, with warning)
  console.warn(
    `[Timeline Secrets] No encryption available for ${keyName} - storing plaintext (development only!)`,
  );
  return { system: "legacy", legacyValue: plainToken };
}

/**
 * Delete a Timeline token from SecretsManager.
 * Legacy column should be cleared separately via SQL.
 */
export async function deleteTimelineToken(
  env: TokenEnv,
  tenantId: string,
  keyName: TimelineSecretKey,
): Promise<boolean> {
  if (!env.GROVE_KEK) {
    return false;
  }

  try {
    const secrets = await createSecretsManager({
      DB: env.DB,
      GROVE_KEK: env.GROVE_KEK,
    });
    return await secrets.deleteSecret(tenantId, keyName);
  } catch (error) {
    console.warn(`[Timeline Secrets] Failed to delete ${keyName}:`, error);
    return false;
  }
}

/**
 * Check if a Timeline token exists in either system.
 */
export async function hasTimelineToken(
  env: TokenEnv,
  tenantId: string,
  keyName: TimelineSecretKey,
  legacyColumnValue: string | null,
): Promise<boolean> {
  // Check SecretsManager first
  if (env.GROVE_KEK) {
    try {
      const secrets = await createSecretsManager({
        DB: env.DB,
        GROVE_KEK: env.GROVE_KEK,
      });
      if (await secrets.hasSecret(tenantId, keyName)) {
        return true;
      }
    } catch {
      // Continue to legacy check
    }
  }

  // Check legacy column
  return Boolean(legacyColumnValue);
}

/**
 * Create a SecretsManager instance, handling missing GROVE_KEK gracefully.
 * Returns null if GROVE_KEK is not configured.
 */
export async function maybeCreateSecretsManager(
  env: TokenEnv,
): Promise<SecretsManager | null> {
  if (!env.GROVE_KEK) {
    return null;
  }

  try {
    return await createSecretsManager({
      DB: env.DB,
      GROVE_KEK: env.GROVE_KEK,
    });
  } catch (error) {
    console.warn("[Timeline Secrets] Failed to create SecretsManager:", error);
    return null;
  }
}
