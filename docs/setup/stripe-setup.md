---
title: "Stripe Setup Guide"
description: "Configure Stripe payments and webhooks for Grove's BillingHub centralized billing system."
category: "setup"
lastUpdated: "2026-04-02"
---

# Stripe Setup Guide

Complete guide for configuring Stripe payments through Grove's BillingHub — the centralized billing system at `billing.grove.place`.

---

## Overview

Grove uses Stripe for subscription billing with 4 paid plans:

| Plan      | Monthly | Yearly (15% off) |
| --------- | ------- | ---------------- |
| Seedling  | $8      | $81.60           |
| Sapling   | $12     | $122.40          |
| Oak       | $25     | $255             |
| Evergreen | $35     | $357             |

**Architecture:** Two workers in a hub pattern (same as the login hub):

- **`grove-billing`** — Public SvelteKit UI at `billing.grove.place`. Proxies requests to the API via service binding.
- **`grove-billing-api`** — Private Hono backend. Handles all Stripe API calls, webhook processing, and tenant provisioning. Never exposed to the public internet.

**Secrets Required: Only 2!**

- `STRIPE_SECRET_KEY`
- `STRIPE_WEBHOOK_SECRET`

Price IDs are hardcoded in code (they're not secrets).

---

## Step 1: Get Your Price IDs

Products should already exist in your Stripe Dashboard.

1. Go to [Stripe Dashboard → Products](https://dashboard.stripe.com/products)
2. Click on each product (Seedling, Sapling, Oak, Evergreen)
3. In the **Pricing** section, click on each price
4. Copy the **Price ID** (starts with `price_`)

You need 8 price IDs total:

- Seedling Monthly + Yearly
- Sapling Monthly + Yearly
- Oak Monthly + Yearly
- Evergreen Monthly + Yearly

---

## Step 2: Update Price IDs in Code

Edit `services/billing-api/src/types.ts`:

```typescript
export const STRIPE_PRICES: Record<string, Record<BillingCycle, string>> = {
  seedling: {
    monthly: "price_YOUR_SEEDLING_MONTHLY_ID",
    yearly: "price_YOUR_SEEDLING_YEARLY_ID",
  },
  sapling: {
    monthly: "price_YOUR_SAPLING_MONTHLY_ID",
    yearly: "price_YOUR_SAPLING_YEARLY_ID",
  },
  oak: {
    monthly: "price_YOUR_OAK_MONTHLY_ID",
    yearly: "price_YOUR_OAK_YEARLY_ID",
  },
  evergreen: {
    monthly: "price_YOUR_EVERGREEN_MONTHLY_ID",
    yearly: "price_YOUR_EVERGREEN_YEARLY_ID",
  },
} as const;
```

**Note:** Price IDs are NOT secrets. They're visible in checkout URLs and safe to commit.

---

## Step 3: Get API Keys

1. Go to [Stripe Dashboard → Developers → API Keys](https://dashboard.stripe.com/apikeys)
2. Copy your **Secret key** (`sk_live_...` for production, `sk_test_...` for testing)

> **Important:** Use test keys for development, live keys for production.

---

## Step 4: Create Webhook Endpoint

1. Go to [Stripe Dashboard → Developers → Webhooks](https://dashboard.stripe.com/webhooks)
2. Click **"+ Add endpoint"**
3. Configure:
   - **Endpoint URL:** `https://billing.grove.place/api/webhooks/stripe`
   - **Events to send:** Select these events:
     - `checkout.session.completed`
     - `customer.subscription.updated`
     - `customer.subscription.deleted`
     - `invoice.paid`
     - `invoice.payment_failed`
4. Click **"Add endpoint"**
5. Click **"Reveal"** next to **Signing secret**
6. Copy the signing secret (`whsec_...`)

> **Note:** Webhooks hit `billing.grove.place` (the UI worker), which verifies the signature at the edge, then proxies the raw body to `grove-billing-api` for re-verification and processing. Belt-and-suspenders security.

---

## Step 5: Set Secrets via Grove Vault

Secrets are applied to Cloudflare Workers using `gw secret`:

```bash
# API worker (handles all Stripe API calls)
gw secret apply STRIPE_SECRET_KEY --worker grove-billing-api
gw secret apply STRIPE_WEBHOOK_SECRET --worker grove-billing-api

# UI worker (edge webhook signature verification only)
gw secret apply STRIPE_WEBHOOK_SECRET --worker grove-billing
```

Verify secrets are set:

```bash
wrangler secret list --name grove-billing-api
# Expected: STRIPE_SECRET_KEY, STRIPE_WEBHOOK_SECRET

wrangler secret list --name grove-billing
# Expected: STRIPE_WEBHOOK_SECRET
```

**That's it! Only 2 secrets, applied to 2 workers.**

---

## Step 6: Enable Stripe Tax (Recommended)

1. Go to [Stripe Dashboard → Settings → Tax](https://dashboard.stripe.com/settings/tax)
2. Enable **Stripe Tax**
3. Set your business address (Georgia, USA)
4. Tax is automatically calculated at checkout

**Georgia Note:** Georgia does not tax SaaS products. Stripe Tax will only collect tax for customers in states that do tax SaaS.

---

## Step 7: Test the Integration

### Health Check

```bash
curl -s https://billing.grove.place/api/health | jq .
# Expected: {"status":"healthy","checks":{"d1":{"ok":true},"stripe":{"ok":true}}}
```

### Test Checkout Flow

1. Make sure you're using Stripe test mode keys
2. Go through the signup flow on Plant or use an upgrade button in Aspen
3. Use test card: `4242 4242 4242 4242` (any future date, any CVC)
4. Verify redirect back to the callback URL
5. Check webhook delivery in Stripe Dashboard → Webhooks → your endpoint

### Test Cards

| Card Number           | Scenario                      |
| --------------------- | ----------------------------- |
| `4242 4242 4242 4242` | Successful payment            |
| `4000 0025 0000 3155` | 3D Secure authentication      |
| `4000 0000 0000 9995` | Declined (insufficient funds) |
| `4000 0000 0000 0341` | Declined (card declined)      |

Use any future expiration date and any 3-digit CVC.

### Verify Webhook Delivery

Check Stripe Dashboard → Developers → Webhooks → your endpoint → Attempts tab. Successful deliveries show 200 status.

---

## Deploying

Both workers deploy automatically via GitHub Actions on push to main:

- **Billing API:** Triggers on `services/billing-api/**` changes
- **Billing UI:** Triggers on `apps/billing/**` changes

Manual deploy:

```bash
gh workflow run "Deploy Billing API" --ref main
gh workflow run "Deploy Billing" --ref main
```

> **Deploy order matters:** Always deploy `grove-billing-api` before `grove-billing`. The UI worker has a service binding to the API worker — if the API doesn't exist, the UI deploy will fail.

---

## Comping Friends

To comp a friend (100% free subscription):

1. Go to Stripe Dashboard → Products → Coupons
2. Create a coupon:
   - **Percent off:** 100%
   - **Duration:** Forever
   - **Max redemptions:** 1
3. Share the coupon code with your friend
4. They apply it at checkout

---

## Troubleshooting

### Health Check Fails

```bash
curl -s https://billing.grove.place/api/health | jq .
```

- `d1.ok: false` → D1 binding misconfigured or migration 101 not applied
- `stripe.ok: false` → `STRIPE_SECRET_KEY` missing or invalid on `grove-billing-api`
- 503 with `"Billing service is temporarily unavailable"` → Service binding broken. Is `grove-billing-api` deployed?

### "No such price" Error

- Verify price IDs in `services/billing-api/src/types.ts` match your Stripe Dashboard
- Make sure you're using the correct mode (test vs live)

### Webhook Signature Invalid

- Verify `STRIPE_WEBHOOK_SECRET` matches the signing secret in Stripe Dashboard
- Make sure you copied the secret from the correct webhook endpoint
- Ensure test/live mode is consistent across API key and webhook endpoint

### Checkout Returns 500

- Check Cloudflare logs for both `grove-billing` and `grove-billing-api`
- Verify `STRIPE_SECRET_KEY` is set: `wrangler secret list --name grove-billing-api`

### Test Locally with Stripe CLI

```bash
# Install Stripe CLI
brew install stripe/stripe-cli/stripe

# Login
stripe login

# Forward webhooks to local billing app dev server
stripe listen --forward-to localhost:5173/api/webhooks/stripe

# Use the webhook signing secret it provides for local testing
```

---

## File Reference

| File                                                        | Purpose                                  |
| ----------------------------------------------------------- | ---------------------------------------- |
| `services/billing-api/src/types.ts`                         | Price IDs and type definitions           |
| `services/billing-api/src/routes/checkout.ts`               | Creates Stripe checkout sessions         |
| `services/billing-api/src/routes/webhook.ts`                | Processes Stripe webhook events          |
| `services/billing-api/src/routes/portal.ts`                 | Creates Stripe Billing Portal sessions   |
| `services/billing-api/src/routes/cancel.ts`                 | Cancels subscriptions (at period end)    |
| `services/billing-api/src/routes/resume.ts`                 | Resumes cancelled subscriptions          |
| `services/billing-api/src/routes/status.ts`                 | Returns billing status for a tenant      |
| `services/billing-api/src/stripe/client.ts`                 | Stripe API client (fetch-based, no SDK)  |
| `services/billing-api/src/services/tenant.ts`               | Tenant provisioning after checkout       |
| `apps/billing/src/lib/billing-proxy.ts`                     | Service binding proxy to billing-api     |
| `apps/billing/src/routes/api/webhooks/stripe/+server.ts`    | Edge webhook verification + proxy        |
| `libs/engine/src/lib/platform/config/billing.ts`            | URL builders (SSOT for all apps)         |
| `docs/specs/billing-hub-spec.md`                            | Full architecture spec                   |

---

_Last updated: April 2026_
