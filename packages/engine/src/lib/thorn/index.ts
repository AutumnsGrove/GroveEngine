/**
 * Thorn - Grove's Text Content Moderation System
 *
 * Config-driven content moderation that wraps Lumen's moderation task
 * with graduated enforcement and content-type-specific thresholds.
 *
 * ## Implementation Status
 *
 * **Phase: Foundation (scaffolding only)**
 *
 * Thorn is NOT yet called in production endpoints. The current PR establishes
 * the moderation logic and thresholds, which will be integrated in a follow-up:
 *
 * - [ ] Hook into post publish flow (on_publish)
 * - [ ] Hook into comment submission (on_comment)
 * - [ ] Hook into profile bio updates (on_profile_update)
 * - [ ] D1 table for moderation events (audit trail)
 * - [ ] Admin review UI for flagged content
 *
 * Currently provides:
 * - moderateContent() function wrapping Lumen's .moderate()
 * - Config-driven category/threshold/action mappings
 * - Type definitions for the Thorn domain
 *
 * @see docs/specs/thorn-spec.md
 *
 * @example
 * ```typescript
 * import { moderateContent } from '@autumnsgrove/groveengine/thorn';
 *
 * const result = await moderateContent(userContent, {
 *   lumen,
 *   tenant: tenantId,
 *   contentType: 'comment',
 * });
 *
 * if (!result.allowed) {
 *   console.log(`Content ${result.action}: ${result.categories.join(', ')}`);
 * }
 * ```
 */

// Core moderation function
export { moderateContent } from "./moderate.js";

// Configuration
export { THORN_CONFIG, determineAction } from "./config.js";

// Types
export type {
  ThornResult,
  ThornOptions,
  ThornAction,
  ThornContentType,
  ThornHookPoint,
  ThornConfig,
  ThornCategoryThreshold,
  ThornContentTypeConfig,
  ThornEvent,
} from "./types.js";
