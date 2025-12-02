/**
 * Stripe API Client for Cloudflare Workers
 *
 * A lightweight, fetch-based Stripe client that works in edge environments.
 * Does not depend on the Node.js Stripe SDK.
 */
export interface StripeClientConfig {
    secretKey: string;
    apiVersion?: string;
}
export interface StripeRequestOptions {
    method?: 'GET' | 'POST' | 'DELETE';
    params?: Record<string, unknown>;
    idempotencyKey?: string;
    stripeAccount?: string;
}
export interface StripeError {
    type: string;
    code?: string;
    message: string;
    param?: string;
    decline_code?: string;
}
export declare class StripeAPIError extends Error {
    readonly type: string;
    readonly code?: string;
    readonly param?: string;
    readonly statusCode: number;
    constructor(error: StripeError, statusCode: number);
}
/**
 * Stripe API Client
 *
 * Usage:
 * ```ts
 * const stripe = new StripeClient({ secretKey: 'sk_test_...' });
 * const session = await stripe.request('checkout/sessions', {
 *   method: 'POST',
 *   params: { mode: 'payment', ... }
 * });
 * ```
 */
export declare class StripeClient {
    private readonly secretKey;
    private readonly apiVersion;
    constructor(config: StripeClientConfig);
    /**
     * Make a request to the Stripe API
     */
    request<T>(endpoint: string, options?: StripeRequestOptions): Promise<T>;
    /**
     * Encode parameters for application/x-www-form-urlencoded
     * Handles nested objects and arrays
     */
    private encodeParams;
    /**
     * Append params to URLSearchParams for GET requests
     */
    private appendSearchParams;
    /**
     * Verify a webhook signature
     *
     * @param payload - Raw request body as string
     * @param signature - Stripe-Signature header value
     * @param secret - Webhook signing secret
     * @param tolerance - Max age of event in seconds (default 300)
     */
    verifyWebhookSignature(payload: string, signature: string, secret: string, tolerance?: number): Promise<{
        valid: boolean;
        event?: unknown;
        error?: string;
    }>;
    /**
     * Constant-time string comparison to prevent timing attacks
     */
    private secureCompare;
}
export interface StripeProduct {
    id: string;
    object: 'product';
    active: boolean;
    name: string;
    description?: string;
    images: string[];
    metadata: Record<string, string>;
    default_price?: string;
    created: number;
    updated: number;
}
export interface StripePrice {
    id: string;
    object: 'price';
    active: boolean;
    product: string;
    currency: string;
    unit_amount: number;
    type: 'one_time' | 'recurring';
    recurring?: {
        interval: 'day' | 'week' | 'month' | 'year';
        interval_count: number;
    };
    metadata: Record<string, string>;
    created: number;
}
export interface StripeCheckoutSession {
    id: string;
    object: 'checkout.session';
    url: string;
    status: 'open' | 'complete' | 'expired';
    mode: 'payment' | 'subscription' | 'setup';
    customer?: string;
    customer_email?: string;
    amount_total: number;
    currency: string;
    payment_status: 'unpaid' | 'paid' | 'no_payment_required';
    payment_intent?: string;
    subscription?: string;
    metadata: Record<string, string>;
    expires_at: number;
    client_reference_id?: string;
}
export interface StripeCustomer {
    id: string;
    object: 'customer';
    email?: string;
    name?: string;
    phone?: string;
    address?: StripeAddress;
    metadata: Record<string, string>;
    created: number;
}
export interface StripeAddress {
    line1?: string;
    line2?: string;
    city?: string;
    state?: string;
    postal_code?: string;
    country?: string;
}
export interface StripePaymentIntent {
    id: string;
    object: 'payment_intent';
    amount: number;
    currency: string;
    status: 'requires_payment_method' | 'requires_confirmation' | 'requires_action' | 'processing' | 'requires_capture' | 'canceled' | 'succeeded';
    customer?: string;
    metadata: Record<string, string>;
    latest_charge?: string;
    created: number;
}
export interface StripeSubscription {
    id: string;
    object: 'subscription';
    status: 'incomplete' | 'incomplete_expired' | 'trialing' | 'active' | 'past_due' | 'canceled' | 'unpaid' | 'paused';
    customer: string;
    items: {
        data: Array<{
            id: string;
            price: StripePrice;
            quantity: number;
        }>;
    };
    current_period_start: number;
    current_period_end: number;
    cancel_at_period_end: boolean;
    canceled_at?: number;
    trial_start?: number;
    trial_end?: number;
    metadata: Record<string, string>;
    created: number;
}
export interface StripeRefund {
    id: string;
    object: 'refund';
    amount: number;
    currency: string;
    status: 'pending' | 'succeeded' | 'failed' | 'canceled';
    payment_intent?: string;
    reason?: 'duplicate' | 'fraudulent' | 'requested_by_customer';
    metadata: Record<string, string>;
    created: number;
}
export interface StripeAccount {
    id: string;
    object: 'account';
    type: 'standard' | 'express' | 'custom';
    email?: string;
    country?: string;
    default_currency?: string;
    charges_enabled: boolean;
    payouts_enabled: boolean;
    details_submitted: boolean;
    capabilities?: Record<string, 'active' | 'inactive' | 'pending'>;
    requirements?: {
        currently_due: string[];
        eventually_due: string[];
        past_due: string[];
    };
    created: number;
}
export interface StripeAccountLink {
    object: 'account_link';
    url: string;
    expires_at: number;
    created: number;
}
export interface StripeLoginLink {
    object: 'login_link';
    url: string;
    created: number;
}
export interface StripeBillingPortalSession {
    id: string;
    object: 'billing_portal.session';
    url: string;
    customer: string;
    return_url: string;
    created: number;
}
export interface StripeEvent {
    id: string;
    object: 'event';
    type: string;
    data: {
        object: unknown;
        previous_attributes?: Record<string, unknown>;
    };
    account?: string;
    created: number;
    livemode: boolean;
}
