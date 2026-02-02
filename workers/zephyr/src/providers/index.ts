/**
 * Email Provider Factory
 *
 * Creates and manages email provider instances.
 */

import type { EmailProvider, Env } from "../types";
import { ResendProvider } from "./resend";

/**
 * Provider registry for fallback support.
 */
const providers: Map<string, EmailProvider> = new Map();

/**
 * Get the primary email provider.
 */
export function getPrimaryProvider(env: Env): EmailProvider {
  const cached = providers.get("resend");
  if (cached) {
    return cached;
  }

  const provider = new ResendProvider(env.RESEND_API_KEY);
  providers.set("resend", provider);
  return provider;
}

/**
 * Get a specific provider by name.
 */
export function getProvider(name: string, env: Env): EmailProvider | null {
  if (name === "resend") {
    return getPrimaryProvider(env);
  }

  // Future: Add SES, Postmark, etc.
  return null;
}

/**
 * Get available provider names.
 */
export function getAvailableProviders(): string[] {
  return ["resend"];
}

// Re-export provider classes
export { ResendProvider } from "./resend";
