/**
 * Stripe Payment Provider
 *
 * @example
 * ```ts
 * import { createStripeProvider } from './';
 *
 * const stripe = createStripeProvider({
 *   secretKey: platform.env.STRIPE_SECRET_KEY,
 *   webhookSecret: platform.env.STRIPE_WEBHOOK_SECRET,
 * });
 *
 * const session = await stripe.createCheckoutSession(items, options, resolveVariant);
 * ```
 */
export { StripeClient, StripeAPIError } from './client.js';
export { StripeProvider, createStripeProvider } from './provider.js';
