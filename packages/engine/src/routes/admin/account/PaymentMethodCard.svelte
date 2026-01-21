<script lang="ts">
  import { GlassCard, Button, Spinner } from "$lib/ui";
  import { CreditCard, ExternalLink } from "lucide-svelte";
  import type { BillingData } from "./types";

  interface Props {
    billing: BillingData | null;
    openingPortal: boolean;
    onOpenPortal: () => void;
  }

  let { billing, openingPortal, onOpenPortal }: Props = $props();
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

      <Button
        variant="secondary"
        onclick={onOpenPortal}
        disabled={openingPortal}
        aria-busy={openingPortal}
        aria-label={openingPortal ? "Opening billing portal..." : "Update payment method"}
      >
        {#if openingPortal}
          <span aria-hidden="true"><Spinner size="sm" /></span>
        {:else}
          <ExternalLink class="btn-icon" aria-hidden="true" />
        {/if}
        Update Payment Method
      </Button>
    </div>
  {:else}
    <div class="no-payment">
      <p class="muted">No payment method on file.</p>
      <Button
        variant="secondary"
        onclick={onOpenPortal}
        disabled={openingPortal}
        aria-busy={openingPortal}
        aria-label={openingPortal ? "Opening billing portal..." : "Add payment method"}
      >
        {#if openingPortal}
          <span aria-hidden="true"><Spinner size="sm" /></span>
        {:else}
          <CreditCard class="btn-icon" aria-hidden="true" />
        {/if}
        Add Payment Method
      </Button>
    </div>
  {/if}

  <p class="payment-note">
    Payment processing is handled securely by our payment provider.
    We never store your full card details.
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
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    margin-bottom: 1rem;
  }

  .no-payment p {
    margin: 0;
  }

  .payment-note {
    margin: 0;
    font-size: 0.8rem;
    color: var(--color-text-subtle);
  }

  .muted {
    color: var(--color-text-muted);
  }

  :global(.btn-icon) {
    width: 1rem;
    height: 1rem;
    margin-right: 0.375rem;
  }

  @media (max-width: 640px) {
    .payment-info {
      flex-direction: column;
      align-items: flex-start;
    }
  }
</style>
