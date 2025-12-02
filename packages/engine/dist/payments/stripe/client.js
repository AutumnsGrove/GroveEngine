/**
 * Stripe API Client for Cloudflare Workers
 *
 * A lightweight, fetch-based Stripe client that works in edge environments.
 * Does not depend on the Node.js Stripe SDK.
 */
const STRIPE_API_VERSION = '2024-11-20.acacia';
const STRIPE_API_BASE = 'https://api.stripe.com/v1';
export class StripeAPIError extends Error {
    type;
    code;
    param;
    statusCode;
    constructor(error, statusCode) {
        super(error.message);
        this.name = 'StripeAPIError';
        this.type = error.type;
        this.code = error.code;
        this.param = error.param;
        this.statusCode = statusCode;
    }
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
export class StripeClient {
    secretKey;
    apiVersion;
    constructor(config) {
        this.secretKey = config.secretKey;
        this.apiVersion = config.apiVersion || STRIPE_API_VERSION;
    }
    /**
     * Make a request to the Stripe API
     */
    async request(endpoint, options = {}) {
        const { method = 'GET', params, idempotencyKey, stripeAccount } = options;
        const url = new URL(`${STRIPE_API_BASE}/${endpoint}`);
        // For GET requests, append params as query string
        if (method === 'GET' && params) {
            this.appendSearchParams(url.searchParams, params);
        }
        const headers = {
            'Authorization': `Bearer ${this.secretKey}`,
            'Stripe-Version': this.apiVersion,
        };
        // For POST requests, encode params as form data
        let body;
        if (method === 'POST' && params) {
            headers['Content-Type'] = 'application/x-www-form-urlencoded';
            body = this.encodeParams(params);
        }
        // Idempotency key for POST requests
        if (idempotencyKey) {
            headers['Idempotency-Key'] = idempotencyKey;
        }
        // Stripe Connect: make request on behalf of connected account
        if (stripeAccount) {
            headers['Stripe-Account'] = stripeAccount;
        }
        const response = await fetch(url.toString(), {
            method,
            headers,
            body,
        });
        const data = await response.json();
        if (!response.ok) {
            throw new StripeAPIError(data.error || { type: 'api_error', message: 'Unknown error' }, response.status);
        }
        return data;
    }
    /**
     * Encode parameters for application/x-www-form-urlencoded
     * Handles nested objects and arrays
     */
    encodeParams(params, prefix = '') {
        const parts = [];
        for (const [key, value] of Object.entries(params)) {
            if (value === undefined || value === null)
                continue;
            const fullKey = prefix ? `${prefix}[${key}]` : key;
            if (Array.isArray(value)) {
                value.forEach((item, index) => {
                    if (typeof item === 'object' && item !== null) {
                        parts.push(this.encodeParams(item, `${fullKey}[${index}]`));
                    }
                    else {
                        parts.push(`${encodeURIComponent(`${fullKey}[${index}]`)}=${encodeURIComponent(String(item))}`);
                    }
                });
            }
            else if (typeof value === 'object') {
                parts.push(this.encodeParams(value, fullKey));
            }
            else {
                parts.push(`${encodeURIComponent(fullKey)}=${encodeURIComponent(String(value))}`);
            }
        }
        return parts.filter(Boolean).join('&');
    }
    /**
     * Append params to URLSearchParams for GET requests
     */
    appendSearchParams(searchParams, params, prefix = '') {
        for (const [key, value] of Object.entries(params)) {
            if (value === undefined || value === null)
                continue;
            const fullKey = prefix ? `${prefix}[${key}]` : key;
            if (Array.isArray(value)) {
                value.forEach((item, index) => {
                    if (typeof item === 'object' && item !== null) {
                        this.appendSearchParams(searchParams, item, `${fullKey}[${index}]`);
                    }
                    else {
                        searchParams.append(`${fullKey}[${index}]`, String(item));
                    }
                });
            }
            else if (typeof value === 'object') {
                this.appendSearchParams(searchParams, value, fullKey);
            }
            else {
                searchParams.append(fullKey, String(value));
            }
        }
    }
    /**
     * Verify a webhook signature
     *
     * @param payload - Raw request body as string
     * @param signature - Stripe-Signature header value
     * @param secret - Webhook signing secret
     * @param tolerance - Max age of event in seconds (default 300)
     */
    async verifyWebhookSignature(payload, signature, secret, tolerance = 300) {
        try {
            // Parse the signature header
            const parts = signature.split(',').reduce((acc, part) => {
                const [key, value] = part.split('=');
                if (key && value) {
                    acc[key] = value;
                }
                return acc;
            }, {});
            const timestamp = parts['t'];
            const v1Signature = parts['v1'];
            if (!timestamp || !v1Signature) {
                return { valid: false, error: 'Invalid signature format' };
            }
            // Check timestamp tolerance
            const timestampSeconds = parseInt(timestamp, 10);
            const now = Math.floor(Date.now() / 1000);
            if (now - timestampSeconds > tolerance) {
                return { valid: false, error: 'Webhook timestamp too old' };
            }
            // Compute expected signature
            const signedPayload = `${timestamp}.${payload}`;
            const encoder = new TextEncoder();
            const key = await crypto.subtle.importKey('raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
            const signatureBytes = await crypto.subtle.sign('HMAC', key, encoder.encode(signedPayload));
            const expectedSignature = Array.from(new Uint8Array(signatureBytes))
                .map(b => b.toString(16).padStart(2, '0'))
                .join('');
            // Constant-time comparison
            if (!this.secureCompare(expectedSignature, v1Signature)) {
                return { valid: false, error: 'Signature mismatch' };
            }
            // Parse and return the event
            const event = JSON.parse(payload);
            return { valid: true, event };
        }
        catch (err) {
            return { valid: false, error: `Verification failed: ${err}` };
        }
    }
    /**
     * Constant-time string comparison to prevent timing attacks
     */
    secureCompare(a, b) {
        if (a.length !== b.length) {
            return false;
        }
        let result = 0;
        for (let i = 0; i < a.length; i++) {
            result |= a.charCodeAt(i) ^ b.charCodeAt(i);
        }
        return result === 0;
    }
}
