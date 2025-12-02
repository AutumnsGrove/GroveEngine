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
import { createStripeProvider } from './stripe/index.js';
/**
 * Create a payment provider instance
 *
 * @param type - The payment provider type ('stripe', 'paddle', etc.)
 * @param config - Provider-specific configuration
 * @returns A PaymentProvider implementation
 */
export function createPaymentProvider(type, config) {
    switch (type) {
        case 'stripe':
            return createStripeProvider(config);
        case 'paddle':
            throw new Error('Paddle provider not yet implemented');
        case 'lemonsqueezy':
            throw new Error('LemonSqueezy provider not yet implemented');
        default:
            throw new Error(`Unknown payment provider: ${type}`);
    }
}
// =============================================================================
// RE-EXPORTS
// =============================================================================
// All types from the types module
export * from './types.js';
// Stripe-specific exports (for advanced usage)
export { StripeClient, StripeAPIError, StripeProvider, createStripeProvider, } from './stripe/index.js';
