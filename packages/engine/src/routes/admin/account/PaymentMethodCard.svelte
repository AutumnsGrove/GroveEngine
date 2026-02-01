<script lang="ts">
  import { GlassCard } from "$lib/ui";
  import { CreditCard, ExternalLink } from "lucide-svelte";
  import type { BillingData } from "./types";

  interface Props {
    billing: BillingData | null;
  }

  let { billing }: Props = $props();

  // LemonSqueezy customer portal URL
  const LEMON_SQUEEZY_PORTAL = "https://app.lemonsqueezy.com/my-orders";
</script>

<GlassCard variant="default" class="mb-6">
  <h2>Payment Method</h2>

  {#if billing?.paymentMethod}
    <div class="payment-info">
      <div class="card-display">
        <CreditCard class="card-icon" aria-hidden="true" />
        <div class="card-details">
          <span class="card-brand">{billing.paymentMethod.brand || "Card"}</span>
          <span class="card-number">•••• {billing.paymentMethod.last4}</span>
        </div>
      </div>
    </div>
  {:else}
    <div class="no-payment">
      <p class="muted">Payment method on file with our billing provider.</p>
    </div>
  {/if}

  <p class="payment-note">
    To update your payment method, visit your
    <a
      href={LEMON_SQUEEZY_PORTAL}
      target="_blank"
      rel="noopener noreferrer"
      class="portal-link"
    >
      billing portal
      <ExternalLink class="external-icon" aria-hidden="true" />
    </a>
    or check your email for a link from LemonSqueezy.
  </p>
</GlassCard>

<style>
  .payment-info {
    display: flex;
    justify-content: space-between;
    align-items: center;
    flex-wrap: wrap;
    gap: 1rem;
    margin-bottom: 1rem;
  }

  .card-display {
    display: flex;
    align-items: center;
    gap: 0.75rem;
  }

  :global(.card-icon) {
    width: 2rem;
    height: 2rem;
    color: var(--color-text-muted);
  }

  .card-details {
    display: flex;
    flex-direction: column;
  }

  .card-brand {
    font-weight: 500;
    text-transform: capitalize;
  }

  .card-number {
    font-size: 0.9rem;
    color: var(--color-text-muted);
    font-family: monospace;
  }

  .no-payment {
    margin-bottom: 1rem;
  }

  .no-payment p {
    margin: 0;
  }

  .payment-note {
    margin: 0;
    font-size: 0.875rem;
    color: var(--color-text-muted);
    line-height: 1.5;
  }

  .portal-link {
    color: var(--color-primary);
    text-decoration: none;
    display: inline-flex;
    align-items: center;
    gap: 0.25rem;
  }

  .portal-link:hover {
    text-decoration: underline;
  }

  :global(.external-icon) {
    width: 0.875rem;
    height: 0.875rem;
  }

  .muted {
    color: var(--color-text-muted);
  }

  @media (max-width: 640px) {
    .payment-info {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
