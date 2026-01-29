/**
 * Login Graft Server Utilities
 *
 * Server-side exports for the LoginGraft system.
 * Provides handler factories and utilities for OAuth authentication.
 *
 * @example
 * ```typescript
 * // In routes/auth/login/+server.ts
 * import { createLoginHandler } from '@autumnsgrove/groveengine/grafts/login/server';
 *
 * export const GET = createLoginHandler({
 *   clientId: 'my-app',
 *   authUrl: 'https://auth.grove.place',
 *   defaultReturnTo: '/dashboard'
 * });
 * ```
 *
 * @example
 * ```typescript
 * // In routes/auth/callback/+server.ts
 * import { createCallbackHandler } from '@autumnsgrove/groveengine/grafts/login/server';
 *
 * export const GET = createCallbackHandler({
 *   clientId: 'my-app',
 *   authApiUrl: 'https://auth-api.grove.place',
 *   defaultReturnTo: '/dashboard'
 * });
 * ```
 */

// Types
export type {
  LoginHandlerConfig,
  CallbackHandlerConfig,
  PKCEValues,
  AuthCookieState,
} from "../types.js";

// Handler factories
export { createLoginHandler } from "./login.js";
export { createCallbackHandler } from "./callback.js";

// PKCE utilities
export {
  generatePKCE,
  generateCodeChallenge,
  generateRandomString,
  generateState,
} from "./pkce.js";

// Origin utilities
export {
  getRealOrigin,
  isProduction,
  isGrovePlatform,
  getCookieDomain,
} from "./origin.js";
