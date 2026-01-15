# Subscription Management - Follow-up TODOs

Items identified during PR review that can be addressed in follow-up work.

---

## Completed

### Component Decomposition ✓
The account page (`+page.svelte`) was ~1200 lines, now ~315 lines. Extracted:
- ✓ `SubscriptionCard.svelte` - Plan overview, status badges, cancel/resume
- ✓ `UsageStatsCard.svelte` - Storage, posts, account age with progress bars
- ✓ `PaymentMethodCard.svelte` - Payment method display and update button
- ✓ `DataExportCard.svelte` - Export type selection and download
- ✓ `ChangePlanCard.svelte` - Plan selection grid

### TypeScript Migration ✓
All components now use `<script lang="ts">` with proper type definitions:
- ✓ `types.ts` - Shared TypeScript interfaces
- ✓ `utils.ts` - Typed helper functions

### Frontend Unit Tests ✓
Added Vitest tests in `utils.test.ts` (25 tests):
- ✓ `sanitizeErrorMessage()` helper function
- ✓ `formatDate()` utility with edge cases
- ✓ `daysRemaining()` with time mocking
- ✓ `USAGE_WARNING_THRESHOLD` constant

### Hardcoded Values (Partial) ✓
- ✓ Extracted 80% warning threshold to `USAGE_WARNING_THRESHOLD` constant
- ✓ Localization fixed: `toLocaleDateString(undefined, {...})` now uses browser locale

---

## High Priority

### Custom Confirmation Dialogs
Replace browser `confirm()` dialogs with custom modal components from the design system for consistent glassmorphic UI.

---

## Medium Priority

### Rate Limiting Improvements
- Move `RATE_LIMIT_MAX` and `RATE_LIMIT_WINDOW_SECONDS` to shared config or env vars
- Add rate limiting to billing operations (not just exports)
- Consider Durable Objects for atomic rate limit counters (prevents KV race conditions)

### Export Pagination
For tenants with 1000+ posts/media:
- Add `LIMIT`/`OFFSET` pagination to export queries
- Consider streaming responses for large datasets
- Add optional `since` parameter for incremental exports

### Hardcoded Values
- Move support email (`autumnbrown23@pm.me`) from component to config file

---

## Low Priority

### Accessibility Enhancements
- Add focus management after actions complete (return focus to button or status)
- Consider `aria-describedby` on progress bars for more context

### Structured Logging
Improve console.error calls for better observability:
```typescript
// Current
console.error("[Account] Failed to load billing:", e);

// Better
console.error("[Account] Failed to load billing:", { error: e, tenantId: locals.tenantId });
```

### API Documentation
- Add OpenAPI/Swagger spec for `/api/billing` and `/api/export` endpoints
- Document the 14-day refund policy enforcement in billing API code

---

## Testing Suggestions

### Integration Tests Needed
1. End-to-end subscription flow: Checkout → Webhook → DB update → UI refresh
2. Rate limit recovery: Verify exports work after 1-hour window expires
3. Tenant isolation: Ensure User A cannot export User B's data
4. Error recovery: Test behavior when Stripe API is down/slow
5. Concurrent plan changes: Rapid clicking behavior
6. Expired trial handling: Correct status display and actions

---

## Deployment Checklist

Before deploying to production, verify:
- [ ] `audit_log` table exists in production D1 (or migration is ready)
- [ ] `CACHE_KV` binding is configured in `wrangler.toml`
- [ ] Stripe price IDs are set for all tiers in production env vars
- [ ] Stripe webhook handles subscription updates to keep `platform_billing` in sync

---

*Generated from PR review feedback. Last updated: 2026-01-15*
