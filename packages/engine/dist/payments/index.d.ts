/**
 * Grove Payments Module
 *
 * Abstract payment provider system with pluggable implementations.
 * Currently supports Stripe, designed for easy addition of Paddle, LemonSqueezy, etc.
 *
 * @example
 * ```ts
 * import { createPaymentProvider, type PaymentProvider } from './';
 *
 * // Create a Stripe provider
 * const payments = createPaymentProvider('stripe', {
 *   secretKey: platform.env.STRIPE_SECRET_KEY,
 *   webhookSecret: platform.env.STRIPE_WEBHOOK_SECRET,
 * });
 *
 * // Use the provider
 * const session = await payments.createCheckoutSession(items, options, resolveVariant);
 * ```
 */
import type { PaymentProvider, PaymentProviderConfig } from './types.js';
export type ProviderType = 'stripe' | 'paddle' | 'lemonsqueezy';
/**
 * Create a payment provider instance
 *
 * @param type - The payment provider type ('stripe', 'paddle', etc.)
 * @param config - Provider-specific configuration
 * @returns A PaymentProvider implementation
 */
export declare function createPaymentProvider(type: ProviderType, config: PaymentProviderConfig): PaymentProvider;
export * from './types.js';
export { StripeClient, StripeAPIError, StripeProvider, createStripeProvider, } from './stripe/index.js';
export type { StripeClientConfig, StripeProduct, StripePrice, StripeCheckoutSession, StripeEvent, } from './stripe/index.js';
