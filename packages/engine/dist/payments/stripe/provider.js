/**
 * Stripe Payment Provider Implementation
 *
 * Implements the PaymentProvider interface using Stripe's API.
 * Supports Stripe Connect for marketplace functionality.
 */
import { StripeClient, StripeAPIError, } from './client.js';
// =============================================================================
// STRIPE PROVIDER
// =============================================================================
export class StripeProvider {
    name = 'stripe';
    client;
    webhookSecret;
    connectWebhookSecret;
    constructor(config) {
        this.client = new StripeClient({ secretKey: config.secretKey });
        this.webhookSecret = config.webhookSecret;
        this.connectWebhookSecret = config.webhookSecret; // Can be separate if needed
    }
    // ==========================================================================
    // PRODUCTS & PRICES
    // ==========================================================================
    async syncProduct(product) {
        // Check if product already exists in Stripe
        // For now, always create new. In production, you'd want to update existing.
        const stripeProduct = await this.client.request('products', {
            method: 'POST',
            params: {
                name: product.name,
                description: product.description,
                images: product.images.slice(0, 8), // Stripe allows max 8 images
                active: product.status === 'active',
                metadata: {
                    grove_product_id: product.id,
                    grove_tenant_id: product.tenantId,
                    product_type: product.type,
                    ...product.metadata,
                },
            },
        });
        return { providerProductId: stripeProduct.id };
    }
    async syncPrice(variant, providerProductId) {
        const params = {
            product: providerProductId,
            currency: variant.price.currency,
            unit_amount: variant.price.amount,
            metadata: {
                grove_variant_id: variant.id,
                grove_product_id: variant.productId,
                variant_name: variant.name,
            },
        };
        // Add recurring config for subscriptions
        if (variant.pricingType === 'recurring' && variant.recurring) {
            params.recurring = {
                interval: variant.recurring.interval,
                interval_count: variant.recurring.intervalCount,
            };
        }
        const stripePrice = await this.client.request('prices', {
            method: 'POST',
            params,
        });
        return { providerPriceId: stripePrice.id };
    }
    async archiveProduct(providerProductId) {
        await this.client.request(`products/${providerProductId}`, {
            method: 'POST',
            params: { active: false },
        });
    }
    // ==========================================================================
    // CHECKOUT
    // ==========================================================================
    async createCheckoutSession(items, options, resolveVariant) {
        // Build line items from cart
        const lineItems = [];
        for (const item of items) {
            const variant = await resolveVariant(item.variantId);
            if (!variant) {
                throw new Error(`Variant not found: ${item.variantId}`);
            }
            if (variant.providerPriceId) {
                // Use existing Stripe price
                lineItems.push({
                    price: variant.providerPriceId,
                    quantity: item.quantity,
                });
            }
            else {
                // Create inline price data
                lineItems.push({
                    price_data: {
                        currency: variant.price.currency,
                        unit_amount: variant.price.amount,
                        product_data: {
                            name: variant.name,
                            metadata: {
                                grove_variant_id: variant.id,
                            },
                        },
                        ...(variant.pricingType === 'recurring' && variant.recurring
                            ? {
                                recurring: {
                                    interval: variant.recurring.interval,
                                    interval_count: variant.recurring.intervalCount,
                                },
                            }
                            : {}),
                    },
                    quantity: item.quantity,
                });
            }
        }
        // Build checkout session params
        const params = {
            mode: options.mode,
            success_url: options.successUrl,
            cancel_url: options.cancelUrl,
            line_items: lineItems,
            metadata: options.metadata || {},
        };
        // Customer
        if (options.customerId) {
            params.customer = options.customerId;
        }
        else if (options.customerEmail) {
            params.customer_email = options.customerEmail;
        }
        // Stripe Tax
        if (options.automaticTax) {
            params.automatic_tax = { enabled: true };
        }
        // Tax ID collection
        if (options.taxIdCollection) {
            params.tax_id_collection = { enabled: true };
        }
        // Billing address
        if (options.billingAddressCollection) {
            params.billing_address_collection = options.billingAddressCollection;
        }
        // Shipping address (physical products)
        if (options.shippingAddressCollection) {
            params.shipping_address_collection = {
                allowed_countries: options.shippingAddressCollection.allowedCountries,
            };
        }
        // Subscription trial
        if (options.mode === 'subscription' && options.trialPeriodDays) {
            params.subscription_data = {
                trial_period_days: options.trialPeriodDays,
            };
        }
        // Promo codes
        if (options.allowPromotionCodes) {
            params.allow_promotion_codes = true;
        }
        // Stripe Connect: application fee and connected account
        const requestOptions = {
            method: 'POST',
            params,
        };
        if (options.connectedAccountId) {
            requestOptions.stripeAccount = options.connectedAccountId;
            // Application fee (platform commission)
            if (options.applicationFeeAmount) {
                if (options.mode === 'subscription') {
                    params.subscription_data = {
                        ...params.subscription_data,
                        application_fee_percent: undefined, // Use fixed amount instead
                    };
                    // For subscriptions, we need to use transfer_data instead
                    params.payment_intent_data = {
                        application_fee_amount: options.applicationFeeAmount,
                    };
                }
                else {
                    params.payment_intent_data = {
                        application_fee_amount: options.applicationFeeAmount,
                    };
                }
            }
        }
        const session = await this.client.request('checkout/sessions', requestOptions);
        return this.mapCheckoutSession(session);
    }
    async getCheckoutSession(sessionId) {
        try {
            const session = await this.client.request(`checkout/sessions/${sessionId}`);
            return this.mapCheckoutSession(session);
        }
        catch (err) {
            if (err instanceof StripeAPIError && err.statusCode === 404) {
                return null;
            }
            throw err;
        }
    }
    mapCheckoutSession(session) {
        return {
            id: session.id,
            url: session.url,
            status: session.status,
            mode: session.mode,
            customerId: session.customer,
            customerEmail: session.customer_email,
            amountTotal: session.amount_total
                ? { amount: session.amount_total, currency: session.currency }
                : undefined,
            paymentStatus: session.payment_status,
            metadata: session.metadata,
            expiresAt: new Date(session.expires_at * 1000),
        };
    }
    // ==========================================================================
    // PAYMENTS
    // ==========================================================================
    async getPaymentStatus(providerPaymentId) {
        const intent = await this.client.request(`payment_intents/${providerPaymentId}`);
        const statusMap = {
            requires_payment_method: 'pending',
            requires_confirmation: 'pending',
            requires_action: 'pending',
            processing: 'processing',
            requires_capture: 'processing',
            canceled: 'canceled',
            succeeded: 'succeeded',
        };
        return statusMap[intent.status] || 'pending';
    }
    async refund(request, providerPaymentId) {
        const params = {
            payment_intent: providerPaymentId,
        };
        if (request.amount) {
            params.amount = request.amount;
        }
        if (request.reason) {
            params.reason = request.reason;
        }
        const refund = await this.client.request('refunds', {
            method: 'POST',
            params,
        });
        return {
            id: refund.id,
            orderId: request.orderId,
            amount: { amount: refund.amount, currency: refund.currency },
            status: refund.status,
            reason: refund.reason,
            providerRefundId: refund.id,
            createdAt: new Date(refund.created * 1000),
        };
    }
    // ==========================================================================
    // SUBSCRIPTIONS
    // ==========================================================================
    async getSubscription(providerSubscriptionId) {
        try {
            const sub = await this.client.request(`subscriptions/${providerSubscriptionId}`);
            return this.mapSubscription(sub);
        }
        catch (err) {
            if (err instanceof StripeAPIError && err.statusCode === 404) {
                return null;
            }
            throw err;
        }
    }
    async cancelSubscription(providerSubscriptionId, cancelImmediately = false) {
        if (cancelImmediately) {
            await this.client.request(`subscriptions/${providerSubscriptionId}`, {
                method: 'DELETE',
            });
        }
        else {
            await this.client.request(`subscriptions/${providerSubscriptionId}`, {
                method: 'POST',
                params: { cancel_at_period_end: true },
            });
        }
    }
    async resumeSubscription(providerSubscriptionId) {
        await this.client.request(`subscriptions/${providerSubscriptionId}`, {
            method: 'POST',
            params: { cancel_at_period_end: false },
        });
    }
    mapSubscription(sub) {
        const statusMap = {
            trialing: 'trialing',
            active: 'active',
            past_due: 'past_due',
            paused: 'paused',
            canceled: 'canceled',
            unpaid: 'unpaid',
            incomplete: 'unpaid',
            incomplete_expired: 'canceled',
        };
        const item = sub.items.data[0];
        return {
            id: sub.id,
            tenantId: sub.metadata.grove_tenant_id || '',
            customerId: sub.customer,
            customerEmail: '', // Would need to fetch customer to get email
            productId: sub.metadata.grove_product_id || '',
            variantId: sub.metadata.grove_variant_id || '',
            quantity: item?.quantity || 1,
            status: statusMap[sub.status] || 'active',
            currentPeriodStart: new Date(sub.current_period_start * 1000),
            currentPeriodEnd: new Date(sub.current_period_end * 1000),
            cancelAtPeriodEnd: sub.cancel_at_period_end,
            canceledAt: sub.canceled_at ? new Date(sub.canceled_at * 1000) : undefined,
            trialStart: sub.trial_start ? new Date(sub.trial_start * 1000) : undefined,
            trialEnd: sub.trial_end ? new Date(sub.trial_end * 1000) : undefined,
            providerSubscriptionId: sub.id,
            createdAt: new Date(sub.created * 1000),
            updatedAt: new Date(sub.created * 1000), // Stripe doesn't have updated_at
        };
    }
    // ==========================================================================
    // CUSTOMERS
    // ==========================================================================
    async syncCustomer(customer) {
        const params = {
            metadata: {
                grove_customer_id: customer.id,
                grove_tenant_id: customer.tenantId,
                ...customer.metadata,
            },
        };
        if (customer.email)
            params.email = customer.email;
        if (customer.name)
            params.name = customer.name;
        if (customer.phone)
            params.phone = customer.phone;
        // Create or update
        if (customer.providerCustomerId) {
            const updated = await this.client.request(`customers/${customer.providerCustomerId}`, { method: 'POST', params });
            return { providerCustomerId: updated.id };
        }
        else {
            const created = await this.client.request('customers', {
                method: 'POST',
                params,
            });
            return { providerCustomerId: created.id };
        }
    }
    async getCustomer(providerCustomerId) {
        try {
            const cust = await this.client.request(`customers/${providerCustomerId}`);
            return {
                id: cust.metadata.grove_customer_id || cust.id,
                tenantId: cust.metadata.grove_tenant_id || '',
                email: cust.email || '',
                name: cust.name,
                phone: cust.phone,
                providerCustomerId: cust.id,
                metadata: cust.metadata,
                createdAt: new Date(cust.created * 1000),
                updatedAt: new Date(cust.created * 1000),
            };
        }
        catch (err) {
            if (err instanceof StripeAPIError && err.statusCode === 404) {
                return null;
            }
            throw err;
        }
    }
    async createBillingPortalSession(providerCustomerId, returnUrl) {
        const session = await this.client.request('billing_portal/sessions', {
            method: 'POST',
            params: {
                customer: providerCustomerId,
                return_url: returnUrl,
            },
        });
        return { url: session.url };
    }
    // ==========================================================================
    // WEBHOOKS
    // ==========================================================================
    async handleWebhook(request) {
        const signature = request.headers.get('stripe-signature');
        if (!signature) {
            return { received: false, error: 'Missing Stripe-Signature header' };
        }
        if (!this.webhookSecret) {
            return { received: false, error: 'Webhook secret not configured' };
        }
        const payload = await request.text();
        const result = await this.client.verifyWebhookSignature(payload, signature, this.webhookSecret);
        if (!result.valid) {
            return { received: false, error: result.error };
        }
        const stripeEvent = result.event;
        const event = {
            id: crypto.randomUUID(),
            type: this.mapEventType(stripeEvent.type),
            data: stripeEvent.data.object,
            createdAt: new Date(stripeEvent.created * 1000),
            providerEventId: stripeEvent.id,
        };
        return { received: true, event };
    }
    mapEventType(stripeType) {
        const typeMap = {
            'checkout.session.completed': 'checkout.session.completed',
            'checkout.session.expired': 'checkout.session.expired',
            'payment_intent.succeeded': 'payment.succeeded',
            'payment_intent.payment_failed': 'payment.failed',
            'customer.subscription.created': 'subscription.created',
            'customer.subscription.updated': 'subscription.updated',
            'customer.subscription.deleted': 'subscription.canceled',
            'customer.subscription.trial_will_end': 'subscription.trial_will_end',
            'invoice.paid': 'invoice.paid',
            'invoice.payment_failed': 'invoice.payment_failed',
            'charge.refunded': 'refund.created',
            'refund.updated': 'refund.updated',
            'account.updated': 'account.updated',
            'payout.paid': 'payout.paid',
        };
        return typeMap[stripeType] || 'payment.succeeded';
    }
    // ==========================================================================
    // STRIPE CONNECT
    // ==========================================================================
    async createConnectAccount(options) {
        // Create the Connect account
        const account = await this.client.request('accounts', {
            method: 'POST',
            params: {
                type: options.type || 'express',
                country: options.country || 'US',
                email: options.email,
                business_type: options.businessType,
                capabilities: {
                    card_payments: { requested: true },
                    transfers: { requested: true },
                },
                metadata: {
                    grove_tenant_id: options.tenantId,
                },
            },
        });
        // Create account link for onboarding
        const accountLink = await this.client.request('account_links', {
            method: 'POST',
            params: {
                account: account.id,
                refresh_url: options.refreshUrl,
                return_url: options.returnUrl,
                type: 'account_onboarding',
            },
        });
        return {
            accountId: account.id,
            onboardingUrl: accountLink.url,
            expiresAt: new Date(accountLink.expires_at * 1000),
        };
    }
    async getConnectAccount(providerAccountId) {
        try {
            const account = await this.client.request(`accounts/${providerAccountId}`);
            return this.mapConnectAccount(account);
        }
        catch (err) {
            if (err instanceof StripeAPIError && err.statusCode === 404) {
                return null;
            }
            throw err;
        }
    }
    async createConnectAccountLink(providerAccountId, options) {
        const accountLink = await this.client.request('account_links', {
            method: 'POST',
            params: {
                account: providerAccountId,
                refresh_url: options.refreshUrl,
                return_url: options.returnUrl,
                type: 'account_onboarding',
            },
        });
        return {
            url: accountLink.url,
            expiresAt: new Date(accountLink.expires_at * 1000),
        };
    }
    async createConnectLoginLink(providerAccountId) {
        const loginLink = await this.client.request(`accounts/${providerAccountId}/login_links`, { method: 'POST' });
        return { url: loginLink.url };
    }
    mapConnectAccount(account) {
        let status = 'pending';
        if (account.charges_enabled && account.payouts_enabled) {
            status = 'enabled';
        }
        else if (account.details_submitted) {
            status = 'restricted';
        }
        else if (!account.charges_enabled && account.details_submitted) {
            status = 'disabled';
        }
        return {
            id: account.id,
            tenantId: '', // Would need to look up from metadata
            providerAccountId: account.id,
            status,
            chargesEnabled: account.charges_enabled,
            payoutsEnabled: account.payouts_enabled,
            detailsSubmitted: account.details_submitted,
            email: account.email,
            country: account.country,
            defaultCurrency: account.default_currency,
            createdAt: new Date(account.created * 1000),
            updatedAt: new Date(account.created * 1000),
        };
    }
}
// =============================================================================
// FACTORY FUNCTION
// =============================================================================
export function createStripeProvider(config) {
    return new StripeProvider(config);
}
