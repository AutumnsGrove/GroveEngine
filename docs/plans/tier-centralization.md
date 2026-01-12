# Tier Feature Centralization Plan

**Created**: 2026-01-12
**Status**: Proposed
**Priority**: Medium (improves maintainability)

## Goal

Create a single source of truth for all tier-related data across the Grove ecosystem.

## Current State (Scattered)

| Location | What It Defines |
|----------|-----------------|
| `packages/engine/src/lib/server/tier-features.ts` | Feature limits (posts, storage, navPages, etc.) |
| `packages/engine/src/lib/server/rate-limits/config.ts` | Request rate limits per tier |
| `plant/src/lib/data/plans.ts` | Display info (name, price, feature strings) |
| Various components | Hardcoded tier checks |

## Proposed Structure

### New file: `packages/engine/src/lib/config/tiers.ts`

```typescript
// Complete tier configuration - single source of truth
export const TIERS = {
  free: {
    // Display
    name: 'Free',
    tagline: 'Just visiting',
    monthlyPrice: 0,
    status: 'available',
    icon: 'user',

    // Feature Limits
    limits: {
      posts: 0,
      storage: 0,
      themes: 0,
      navPages: 0,
      commentsPerWeek: 20,
    },

    // Feature Flags
    features: {
      blog: false,
      meadow: true,
      emailForwarding: false,
      customDomain: false,
      themeCustomizer: false,
      centennial: false,
    },

    // Rate Limits
    rateLimits: {
      requests: { limit: 50, windowSeconds: 60 },
      writes: { limit: 20, windowSeconds: 3600 },
      uploads: { limit: 0, windowSeconds: 86400 },
      ai: { limit: 0, windowSeconds: 86400 },
    },
  },
  // ... seedling, sapling, oak, evergreen
} as const;
```

### Migration Steps

1. **Create unified config** (`packages/engine/src/lib/config/tiers.ts`)
   - Combine all tier data into one structure
   - Export typed constants and helper functions

2. **Update tier-features.ts**
   - Import from unified config
   - Keep backward-compatible exports for now

3. **Update rate-limits/config.ts**
   - Import rate limit values from unified config
   - Keep SubscriptionTier type export

4. **Update plant/plans.ts**
   - Import display data from unified config
   - Generate feature strings from limits programmatically

5. **Update pricing pages**
   - Use unified config for table data
   - Remove hardcoded values

6. **Deprecate old files**
   - Mark old locations as deprecated with re-exports
   - Add migration notes for future cleanup

## Benefits

- **Single source of truth**: Change price/limits in one place
- **Type safety**: TypeScript validates all tier references
- **Consistency**: No more drift between display values and actual limits
- **Testability**: One file to test for tier logic

## Migration Approach

**Phase 1**: Create unified config, keep old files as wrappers
**Phase 2**: Migrate consumers to import from unified config
**Phase 3**: Remove deprecated wrapper files

## Files to Create/Modify

### Create
- `packages/engine/src/lib/config/tiers.ts` - Unified tier config

### Modify
- `packages/engine/src/lib/server/tier-features.ts` → import from unified
- `packages/engine/src/lib/server/rate-limits/config.ts` → import from unified
- `plant/src/lib/data/plans.ts` → generate from unified
- `landing/src/routes/pricing/+page.svelte` → import tier data

### Eventually Remove
- Nothing removed immediately; deprecated gradually

## Estimated Effort

- Phase 1: 2-3 hours
- Phase 2: 1-2 hours
- Phase 3: 30 minutes

## Open Questions

1. Should Stripe price IDs live in the unified config?
2. How to handle "coming soon" vs "available" status?
3. Should the config be in engine (shared) or a separate package?
