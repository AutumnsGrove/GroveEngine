/**
 * Shop Database Operations
 *
 * Utilities for managing products, orders, and customers in D1.
 */
import type { Product, ProductVariant, ProductType, ProductStatus, Order, OrderStatus, PaymentStatus, Customer, PricingType, BillingInterval } from './types.js';
interface D1Database {
    prepare(query: string): D1PreparedStatement;
    batch<T = unknown>(statements: D1PreparedStatement[]): Promise<D1Result<T>[]>;
}
interface D1PreparedStatement {
    bind(...values: unknown[]): D1PreparedStatement;
    first<T = unknown>(): Promise<T | null>;
    all<T = unknown>(): Promise<D1Result<T>>;
    run(): Promise<D1Result>;
}
interface D1Result<T = unknown> {
    results: T[];
    success: boolean;
    meta?: {
        changes?: number;
        last_row_id?: number;
    };
}
export declare function getProducts(db: D1Database, tenantId: string, options?: {
    status?: ProductStatus;
    type?: ProductType;
    category?: string;
    limit?: number;
    offset?: number;
}): Promise<Product[]>;
export declare function getProductBySlug(db: D1Database, tenantId: string, slug: string): Promise<Product | null>;
export declare function getProductById(db: D1Database, productId: string): Promise<Product | null>;
export declare function createProduct(db: D1Database, tenantId: string, data: {
    name: string;
    slug: string;
    description?: string;
    shortDescription?: string;
    type?: ProductType;
    status?: ProductStatus;
    images?: string[];
    featuredImage?: string;
    category?: string;
    tags?: string[];
    metadata?: Record<string, string>;
}): Promise<{
    id: string;
}>;
export declare function updateProduct(db: D1Database, productId: string, data: Partial<{
    name: string;
    slug: string;
    description: string;
    shortDescription: string;
    type: ProductType;
    status: ProductStatus;
    images: string[];
    featuredImage: string;
    category: string;
    tags: string[];
    providerProductId: string;
    metadata: Record<string, string>;
}>): Promise<void>;
export declare function deleteProduct(db: D1Database, productId: string): Promise<void>;
export declare function getProductVariants(db: D1Database, productId: string): Promise<ProductVariant[]>;
export declare function getVariantById(db: D1Database, variantId: string): Promise<ProductVariant | null>;
export declare function createVariant(db: D1Database, productId: string, tenantId: string, data: {
    name: string;
    sku?: string;
    priceAmount: number;
    priceCurrency?: string;
    compareAtPrice?: number;
    pricingType?: PricingType;
    billingInterval?: BillingInterval;
    billingIntervalCount?: number;
    inventoryQuantity?: number;
    inventoryPolicy?: 'deny' | 'continue';
    trackInventory?: boolean;
    downloadUrl?: string;
    downloadLimit?: number;
    requiresShipping?: boolean;
    isDefault?: boolean;
    position?: number;
    metadata?: Record<string, string>;
}): Promise<{
    id: string;
}>;
export declare function updateVariant(db: D1Database, variantId: string, data: Partial<{
    name: string;
    sku: string;
    priceAmount: number;
    compareAtPrice: number;
    pricingType: PricingType;
    billingInterval: BillingInterval;
    billingIntervalCount: number;
    inventoryQuantity: number;
    inventoryPolicy: 'deny' | 'continue';
    trackInventory: boolean;
    downloadUrl: string;
    downloadLimit: number;
    requiresShipping: boolean;
    providerPriceId: string;
    isDefault: boolean;
    position: number;
    metadata: Record<string, string>;
}>): Promise<void>;
export declare function deleteVariant(db: D1Database, variantId: string): Promise<void>;
export declare function generateOrderNumber(db: D1Database, tenantId: string): Promise<string>;
export declare function createOrder(db: D1Database, tenantId: string, data: {
    customerEmail: string;
    customerName?: string;
    customerId?: string;
    lineItems: Array<{
        productId?: string;
        variantId?: string;
        productName: string;
        variantName: string;
        sku?: string;
        quantity: number;
        unitPrice: number;
        taxAmount?: number;
        requiresShipping?: boolean;
    }>;
    subtotal: number;
    taxTotal?: number;
    shippingTotal?: number;
    discountTotal?: number;
    total: number;
    currency?: string;
    shippingAddress?: object;
    billingAddress?: object;
    providerSessionId?: string;
    customerNotes?: string;
    metadata?: Record<string, string>;
}): Promise<{
    id: string;
    orderNumber: string;
}>;
export declare function getOrderById(db: D1Database, orderId: string): Promise<Order | null>;
export declare function getOrderBySessionId(db: D1Database, sessionId: string): Promise<Order | null>;
export declare function updateOrderStatus(db: D1Database, orderId: string, data: {
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    providerPaymentId?: string;
    paidAt?: number;
}): Promise<void>;
export declare function getOrders(db: D1Database, tenantId: string, options?: {
    status?: OrderStatus;
    paymentStatus?: PaymentStatus;
    limit?: number;
    offset?: number;
}): Promise<Order[]>;
export declare function getOrCreateCustomer(db: D1Database, tenantId: string, email: string, data?: {
    name?: string;
    phone?: string;
}): Promise<Customer>;
export declare function updateCustomer(db: D1Database, customerId: string, data: Partial<{
    name: string;
    phone: string;
    providerCustomerId: string;
    defaultShippingAddress: object;
    defaultBillingAddress: object;
    totalOrders: number;
    totalSpent: number;
}>): Promise<void>;
export {};
