# UpgradesGraft Plan

> **Date:** February 9, 2026
> **Priority:** Medium — Future architecture improvement
> **Related:** LoginGraft pattern, `/api/billing` in engine, Plant checkout flow

## Overview

Create a centralized `UpgradesGraft` module for consistent upgrade/billing management across all Grove properties. Currently, billing logic is duplicated across:
- `packages/plant/src/routes/api/select-plan/+server.ts` (onboarding signup)
- `packages/plant/src/lib/server/stripe.ts` (Stripe integration)
- `packages/engine/src/routes/api/billing/+server.ts` (tenant billing management)

Following the successful `LoginGraft` pattern, UpgradesGraft will provide:
- Server-side API handlers for plan changes, billing portal, upgrades
- Client-side UI components for upgrade flows
- Unified configuration for checkout URLs and billing providers

## Why a Graft?

### Current State

```
plant/                    landing/arbor/
  ├─ checkout/              ├─ billing UI (missing)
  ├─ plans/                 └─ upgrade links → ???
  ├─ api/select-plan/
  └─ lib/server/stripe.ts
```

**Problems:**
- Plant package contains onboarding-specific upgrade logic
- No clear path for existing users (arbor) to upgrade
- Billing logic split between plant and engine
- Duplicated Stripe configuration

### After UpgradesGraft

```
engine/src/lib/grafts/upgrades/
  ├─ index.ts              # Main export
  ├─ server/
  │   ├─ api/
  │   │   ├─ upgrade.ts    # POST /api/grafts/upgrades/upgrade
  │   │   ├─ portal.ts     # POST /api/grafts/upgrades/portal
  │   │   └─ status.ts     # GET /api/grafts/upgrades/status
  │   └─ checkout.ts       # Checkout session creation
  ├─ config.ts             # Checkout URLs, tier mapping
  ├─ types.ts              # TypeScript interfaces
  └─ components/
      ├─ UpgradeCard.svelte
      ├─ UpgradeModal.svelte
      └─ CurrentPlanBadge.svelte

plant/                    landing/arbor/
  └─ uses UpgradesGraft    └─ uses UpgradesGraft
```

## Architecture

### Server-Side API

#### `POST /api/grafts/upgrades/upgrade`

Upgrade from current plan to a higher tier.

```typescript
// Request body
interface UpgradeRequest {
  targetTier: TierKey;        // 'seedling', 'sapling', 'oak', 'evergreen'
  billingPeriod: 'monthly' | 'yearly';
  returnTo?: string;          // URL to redirect after checkout
}

// Response
interface UpgradeResponse {
  checkoutUrl: string;        // Redirect user here
  sessionId?: string;         // Optional session tracking
}
```

**Flow:**
1. Verify authenticated tenant
2. Check current tier (cannot downgrade via this endpoint)
3. Create Stripe checkout session for proration
4. Return checkout URL

#### `POST /api/grafts/upgrades/portal`

Open Stripe Billing Portal for self-service management.

```typescript
// Request body
interface PortalRequest {
  returnTo: string;           // Where to return after portal
}

// Response
interface PortalResponse {
  portalUrl: string;          // Redirect user to Stripe portal
}
```

**Flow:**
1. Verify authenticated tenant
2. Get Stripe customer ID from platform_billing
3. Create billing portal session
4. Return portal URL

**Capabilities:**
- View invoices
- Update payment method
- Cancel subscription
- Resume canceled subscription

#### `GET /api/grafts/upgrades/status`

Get current billing status for UI.

```typescript
// Response
interface BillingStatus {
  currentTier: TierKey;
  status: 'active' | 'trialing' | 'past_due' | 'paused' | 'cancelled';
  currentPeriodEnd: string | null;
  cancelAtPeriodEnd: boolean;
  trialEnd: string | null;
  isComped: boolean;
  paymentMethod?: {
    brand: string;
    last4: string;
  };
}
```

### Client-Side Components

#### `UpgradeCard.svelte`

Display a tier for upgrade with action button.

```svelte
<script>
  import { PricingCTA } from '@autumnsgrove/groveengine/grafts/pricing';
</script>

<PricingCTA
  tier={tier}
  billingPeriod={billingPeriod}
  variant="primary"
  onCheckout={handleCheckout}
/>
```

**Props:**
```typescript
interface UpgradeCardProps {
  tier: PricingTier;
  currentTier?: TierKey;      // Show "Current Plan" if matches
  billingPeriod: BillingPeriod;
  onCheckout?: (tier: TierKey, period: BillingPeriod) => void;
}
```

#### `UpgradeModal.svelte`

Modal with tier comparison for upgrades.

```svelte
<script>
  import { UpgradeCard, PricingToggle } from '@autumnsgrove/groveengine/grafts/upgrades';
</script>

<PricingToggle
  billingPeriod={billingPeriod}
  onPeriodChange={setBillingPeriod}
/>

{#each availableTiers as tier}
  <UpgradeCard
    {tier}
    {billingPeriod}
    currentTier={userTier}
  />
{/each}
```

#### `CurrentPlanBadge.svelte`

Show user's current plan with upgrade CTAs.

```svelte
<script>
  import { UpgradeCTA } from '@autumnsgrove/groveengine/grafts/upgrades';
</script>

<div class="current-plan">
  <span class="tier-name">{TIERS[currentTier].display.name}</span>
  {#if canUpgrade}
    <UpgradeCTA tier={nextTier} />
  {/if}
</div>
```

### Configuration

Following the `LoginGraft` pattern, configuration is environment-driven:

```typescript
// packages/engine/src/lib/grafts/upgrades/config.ts

export interface UpgradesConfig {
  /** Checkout URLs by tier and billing period */
  checkoutUrls: Record<TierKey, { monthly?: string; annual?: string }>;
  /** Stripe secret key (from environment) */
  stripeSecretKey: string;
  /** Stripe billing portal URL */
  billingPortalUrl: string;
}

/**
 * Create upgrade config from environment variables
 */
export function createUpgradeConfig(env: Record<string, string | undefined>): UpgradesConfig {
  return {
    checkoutUrls: {
      seedling: {
        monthly: env.STRIPE_CHECKOUT_SEEDLING_MONTHLY,
        annual: env.STRIPE_CHECKOUT_SEEDLING_YEARLY,
      },
      sapling: { /* ... */ },
      oak: { /* ... */ },
      evergreen: { /* ... */ },
    },
    stripeSecretKey: env.STRIPE_SECRET_KEY ?? '',
    billingPortalUrl: `${env.APP_URL ?? 'https://grove.place'}/api/grafts/upgrades/portal`,
  };
}
```

## Migration Plan

### Phase 1: Extract Server-Side API

1. **Create graft skeleton** (`packages/engine/src/lib/grafts/upgrades/`)
2. **Migrate onboarding checkout logic** from `plant/src/routes/api/select-plan/+server.ts`
3. **Migrate billing operations** from `engine/src/routes/api/billing/+server.ts`
4. **Create unified checkout handler** supporting both new signups and upgrades

### Phase 2: Create Client Components

1. **UpgradeCard.svelte** — Reusable tier display with CTA
2. **UpgradeModal.svelte** — Modal with tier comparison
3. **CurrentPlanBadge.svelte** — User's current tier display
4. **Export from graft index** alongside pricing components

### Phase 3: Update Plant Package

1. **Replace `/api/select-plan/+server.ts`** with graft API call
2. **Update checkout flow** to use graft components
3. **Remove duplicated Stripe logic** from `plant/lib/server/stripe.ts`

### Phase 4: Integrate with Arbor (Future)

1. **Add upgrade section** to Arbor dashboard
2. **Link from settings** → billing management
3. **Show upgrade CTAs** when on free/wanderer tier

## API Compatibility

### Deprecation Path

| Endpoint | Status | Replacement |
|----------|--------|-------------|
| `POST /api/select-plan` | Deprecated | `POST /api/grafts/upgrades/upgrade` |
| `GET /api/billing` | Migrate | `GET /api/grafts/upgrades/status` |
| `POST /api/billing` (checkout) | Migrate | `POST /api/grafts/upgrades/upgrade` |
| `PUT /api/billing` (portal) | Migrate | `POST /api/grafts/upgrades/portal` |
| `PATCH /api/billing` (cancel) | Migrate | Portal self-service |

## Example Usage

### Onboarding (Plant)

```svelte
<script>
  import { UpgradeCard } from '@autumnsgrove/groveengine/grafts/upgrades';
</script>

{#each availableTiers as tier}
  <UpgradeCard
    {tier}
    billingPeriod={billingPeriod}
    currentTier={userTier}
    onCheckout={async (tier, period) => {
      const res = await fetch('/api/grafts/upgrades/upgrade', {
        method: 'POST',
        body: JSON.stringify({ targetTier: tier, billingPeriod: period }),
      });
      const { checkoutUrl } = await res.json();
      window.location.href = checkoutUrl;
    }}
  />
{/each}
```

### User Dashboard (Arbor)

```svelte
<script>
  import { CurrentPlanBadge, UpgradeModal } from '@autumnsgrove/groveengine/grafts/upgrades';
</script>

<CurrentPlanBadge currentTier={userTier} />

{#if showUpgradeModal}
  <UpgradeModal
    currentTier={userTier}
    onUpgrade={(tier) => { /* redirect to checkout */ }}
    onManageBilling={() => { /* open portal */ }}
  />
{/if}
```

## Environment Variables

```bash
# Stripe (existing, reuse)
STRIPE_SECRET_KEY=sk_test_...
STRIPE_WEBHOOK_SECRET=whsec_...

# Checkout URLs (per-tier, per-period)
# These replace the hardcoded URLs in plant/lib/server/stripe.ts
STRIPE_CHECKOUT_SEEDLING_MONTHLY=https://checkout.stripe.com/...
STRIPE_CHECKOUT_SEEDLING_YEARLY=https://checkout.stripe.com/...
STRIPE_CHECKOUT_SAPLING_MONTHLY=https://checkout.stripe.com/...
STRIPE_CHECKOUT_SAPLING_YEARLY=https://checkout.stripe.com/...
STRIPE_CHECKOUT_OAK_MONTHLY=https://checkout.stripe.com/...
STRIPE_CHECKOUT_OAK_YEARLY=https://checkout.stripe.com/...
STRIPE_CHECKOUT_EVERGREEN_MONTHLY=https://checkout.stripe.com/...
STRIPE_CHECKOUT_EVERGREEN_YEARLY=https://checkout.stripe.com/...
```

## Open Questions

1. **Proration handling:** Should upgrade immediately activate with prorated billing, or wait until next cycle?
2. **Downgrades:** Support via portal only, or also via API?
3. **Free tier upgrades:** Is the flow different for Wanderer → Seedling vs Seedling → Sapling?
4. **Comped accounts:** How do upgrades interact with comped tiers?

## Dependencies

- `@autumnsgrove/groveengine/config` — Tier definitions
- `@autumnsgrove/groveengine/grafts/pricing` — Tier display components
- `stripe` — Payment provider SDK

## Files to Create/Modify

### New Files

```
packages/engine/src/lib/grafts/upgrades/
├── index.ts                    # Main export
├── types.ts                    # TypeScript interfaces
├── config.ts                   # Configuration & environment handling
└── server/
    ├── api/
    │   ├── upgrade.ts          # POST /api/grafts/upgrades/upgrade
    │   ├── portal.ts           # POST /api/grafts/upgrades/portal
    │   └── status.ts           # GET /api/grafts/upgrades/status
    ├── checkout.ts             # Checkout session creation
    └── billing.ts              # Billing portal & helpers

packages/engine/src/lib/grafts/pricing/
└── components/
    ├── UpgradeCard.svelte
    ├── UpgradeModal.svelte
    └── CurrentPlanBadge.svelte
```

### Modified Files

```
packages/engine/src/routes/api/billing/+server.ts  # Migrate to graft
packages/engine/src/routes/api/grafts/
  └── upgrades/+server.ts                          # New combined endpoint
packages/plant/src/routes/api/select-plan/+server.ts  # Use graft
packages/plant/src/lib/server/stripe.ts           # Remove duplicated code
packages/plant/src/routes/checkout/+page.server.ts # Use graft
```

## Acceptance Criteria

- [ ] Server-side API handles plan upgrades and billing portal
- [ ] Client components work for both onboarding and existing users
- [ ] Plant package uses graft instead of duplicated Stripe logic
- [ ] All existing billing operations continue to work
- [ ] Environment-driven configuration (no hardcoded Stripe URLs)
- [ ] Audit logging for all billing operations
- [ ] Rate limiting on all upgrade endpoints
