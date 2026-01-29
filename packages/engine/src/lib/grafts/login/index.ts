/**
 * Login Graft
 *
 * Unified login UI component for all Grove properties.
 * Provides consistent authentication experience with PKCE OAuth support.
 *
 * @example Client-side usage
 * ```svelte
 * <script>
 *   import { LoginGraft } from '@autumnsgrove/groveengine/grafts/login';
 * </script>
 *
 * <LoginGraft
 *   providers={['google']}
 *   returnTo="/dashboard"
 * >
 *   {#snippet header()}
 *     <h1>Welcome back, Wanderer</h1>
 *   {/snippet}
 * </LoginGraft>
 * ```
 *
 * @example Server-side usage
 * ```typescript
 * // In routes/auth/login/+server.ts
 * import { createLoginHandler } from '@autumnsgrove/groveengine/grafts/login/server';
 *
 * export const GET = createLoginHandler({
 *   clientId: 'my-app',
 *   authUrl: 'https://auth.grove.place',
 * });
 * ```
 *
 * @example Compact variant for embedding
 * ```svelte
 * <LoginGraft variant="compact" providers={['google']} />
 * ```
 */

// Types
export type {
  AuthProvider,
  LoginVariant,
  LoginGraftProps,
  LoginCardProps,
  ProviderButtonProps,
  ProviderIconProps,
  ProviderConfig,
} from "./types.js";

// Config & utilities
export {
  PROVIDERS,
  getProviderConfig,
  getProviderName,
  isProviderAvailable,
  getAvailableProviders,
  DEFAULT_PROVIDERS,
  DEFAULT_LOGIN_URL,
  DEFAULT_RETURN_TO,
  GROVEAUTH_URLS,
  AUTH_COOKIE_NAMES,
  AUTH_COOKIE_OPTIONS,
} from "./config.js";

// Components
export { default as LoginGraft } from "./LoginGraft.svelte";
export { default as LoginCard } from "./LoginCard.svelte";
export { default as ProviderButton } from "./ProviderButton.svelte";
export { default as ProviderIcon } from "./ProviderIcon.svelte";
