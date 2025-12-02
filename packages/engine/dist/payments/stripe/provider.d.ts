/**
 * Stripe Payment Provider Implementation
 *
 * Implements the PaymentProvider interface using Stripe's API.
 * Supports Stripe Connect for marketplace functionality.
 */
import type { PaymentProvider, PaymentProviderConfig, ProductBase, ProductVariant, CartItem, CheckoutOptions, CheckoutSession, PaymentStatus, RefundRequest, RefundResult, Subscription, Customer, WebhookResult, ConnectAccount, ConnectOnboardingOptions, ConnectOnboardingResult } from '../types.js';
export declare class StripeProvider implements PaymentProvider {
    readonly name = "stripe";
    private readonly client;
    private readonly webhookSecret?;
    private readonly connectWebhookSecret?;
    constructor(config: PaymentProviderConfig);
    syncProduct(product: ProductBase): Promise<{
        providerProductId: string;
    }>;
    syncPrice(variant: ProductVariant, providerProductId: string): Promise<{
        providerPriceId: string;
    }>;
    archiveProduct(providerProductId: string): Promise<void>;
    createCheckoutSession(items: CartItem[], options: CheckoutOptions, resolveVariant: (variantId: string) => Promise<ProductVariant | null>): Promise<CheckoutSession>;
    getCheckoutSession(sessionId: string): Promise<CheckoutSession | null>;
    private mapCheckoutSession;
    getPaymentStatus(providerPaymentId: string): Promise<PaymentStatus>;
    refund(request: RefundRequest, providerPaymentId: string): Promise<RefundResult>;
    getSubscription(providerSubscriptionId: string): Promise<Subscription | null>;
    cancelSubscription(providerSubscriptionId: string, cancelImmediately?: boolean): Promise<void>;
    resumeSubscription(providerSubscriptionId: string): Promise<void>;
    private mapSubscription;
    syncCustomer(customer: Partial<Customer>): Promise<{
        providerCustomerId: string;
    }>;
    getCustomer(providerCustomerId: string): Promise<Customer | null>;
    createBillingPortalSession(providerCustomerId: string, returnUrl: string): Promise<{
        url: string;
    }>;
    handleWebhook(request: Request): Promise<WebhookResult>;
    private mapEventType;
    createConnectAccount(options: ConnectOnboardingOptions): Promise<ConnectOnboardingResult>;
    getConnectAccount(providerAccountId: string): Promise<ConnectAccount | null>;
    createConnectAccountLink(providerAccountId: string, options: Pick<ConnectOnboardingOptions, 'returnUrl' | 'refreshUrl'>): Promise<{
        url: string;
        expiresAt?: Date;
    }>;
    createConnectLoginLink(providerAccountId: string): Promise<{
        url: string;
    }>;
    private mapConnectAccount;
}
export declare function createStripeProvider(config: PaymentProviderConfig): StripeProvider;
