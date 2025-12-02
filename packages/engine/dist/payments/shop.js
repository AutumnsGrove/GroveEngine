/**
 * Shop Database Operations
 *
 * Utilities for managing products, orders, and customers in D1.
 */
// =============================================================================
// PRODUCT OPERATIONS
// =============================================================================
export async function getProducts(db, tenantId, options = {}) {
    let query = `
    SELECT * FROM products
    WHERE tenant_id = ?
  `;
    const params = [tenantId];
    if (options.status) {
        query += ' AND status = ?';
        params.push(options.status);
    }
    if (options.type) {
        query += ' AND type = ?';
        params.push(options.type);
    }
    if (options.category) {
        query += ' AND category = ?';
        params.push(options.category);
    }
    query += ' ORDER BY created_at DESC';
    if (options.limit) {
        query += ' LIMIT ?';
        params.push(options.limit);
    }
    if (options.offset) {
        query += ' OFFSET ?';
        params.push(options.offset);
    }
    const result = await db.prepare(query).bind(...params).all();
    const products = result.results.map(mapProductRow);
    // Fetch variants for each product
    for (const product of products) {
        const variants = await getProductVariants(db, product.id);
        product.variants = variants;
        product.defaultVariantId = variants.find(v => v.isDefault)?.id;
    }
    return products;
}
export async function getProductBySlug(db, tenantId, slug) {
    const row = await db
        .prepare('SELECT * FROM products WHERE tenant_id = ? AND slug = ?')
        .bind(tenantId, slug)
        .first();
    if (!row)
        return null;
    const product = mapProductRow(row);
    const variants = await getProductVariants(db, product.id);
    return {
        ...product,
        variants,
        defaultVariantId: variants.find(v => v.isDefault)?.id,
    };
}
export async function getProductById(db, productId) {
    const row = await db
        .prepare('SELECT * FROM products WHERE id = ?')
        .bind(productId)
        .first();
    if (!row)
        return null;
    const product = mapProductRow(row);
    const variants = await getProductVariants(db, product.id);
    return {
        ...product,
        variants,
        defaultVariantId: variants.find(v => v.isDefault)?.id,
    };
}
export async function createProduct(db, tenantId, data) {
    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    await db
        .prepare(`INSERT INTO products (
        id, tenant_id, name, slug, description, short_description,
        type, status, images, featured_image, category, tags, metadata,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(id, tenantId, data.name, data.slug, data.description || null, data.shortDescription || null, data.type || 'physical', data.status || 'draft', JSON.stringify(data.images || []), data.featuredImage || null, data.category || null, JSON.stringify(data.tags || []), JSON.stringify(data.metadata || {}), now, now)
        .run();
    return { id };
}
export async function updateProduct(db, productId, data) {
    const updates = [];
    const params = [];
    if (data.name !== undefined) {
        updates.push('name = ?');
        params.push(data.name);
    }
    if (data.slug !== undefined) {
        updates.push('slug = ?');
        params.push(data.slug);
    }
    if (data.description !== undefined) {
        updates.push('description = ?');
        params.push(data.description);
    }
    if (data.shortDescription !== undefined) {
        updates.push('short_description = ?');
        params.push(data.shortDescription);
    }
    if (data.type !== undefined) {
        updates.push('type = ?');
        params.push(data.type);
    }
    if (data.status !== undefined) {
        updates.push('status = ?');
        params.push(data.status);
    }
    if (data.images !== undefined) {
        updates.push('images = ?');
        params.push(JSON.stringify(data.images));
    }
    if (data.featuredImage !== undefined) {
        updates.push('featured_image = ?');
        params.push(data.featuredImage);
    }
    if (data.category !== undefined) {
        updates.push('category = ?');
        params.push(data.category);
    }
    if (data.tags !== undefined) {
        updates.push('tags = ?');
        params.push(JSON.stringify(data.tags));
    }
    if (data.providerProductId !== undefined) {
        updates.push('provider_product_id = ?');
        params.push(data.providerProductId);
    }
    if (data.metadata !== undefined) {
        updates.push('metadata = ?');
        params.push(JSON.stringify(data.metadata));
    }
    if (updates.length === 0)
        return;
    updates.push('updated_at = ?');
    params.push(Math.floor(Date.now() / 1000));
    params.push(productId);
    await db
        .prepare(`UPDATE products SET ${updates.join(', ')} WHERE id = ?`)
        .bind(...params)
        .run();
}
export async function deleteProduct(db, productId) {
    await db.prepare('DELETE FROM products WHERE id = ?').bind(productId).run();
}
// =============================================================================
// VARIANT OPERATIONS
// =============================================================================
export async function getProductVariants(db, productId) {
    const result = await db
        .prepare('SELECT * FROM product_variants WHERE product_id = ? ORDER BY position')
        .bind(productId)
        .all();
    return result.results.map(mapVariantRow);
}
export async function getVariantById(db, variantId) {
    const row = await db
        .prepare('SELECT * FROM product_variants WHERE id = ?')
        .bind(variantId)
        .first();
    return row ? mapVariantRow(row) : null;
}
export async function createVariant(db, productId, tenantId, data) {
    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    await db
        .prepare(`INSERT INTO product_variants (
        id, product_id, tenant_id, name, sku,
        price_amount, price_currency, compare_at_price,
        pricing_type, billing_interval, billing_interval_count,
        inventory_quantity, inventory_policy, track_inventory,
        download_url, download_limit, requires_shipping,
        is_default, position, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(id, productId, tenantId, data.name, data.sku || null, data.priceAmount, data.priceCurrency || 'usd', data.compareAtPrice || null, data.pricingType || 'one_time', data.billingInterval || null, data.billingIntervalCount || 1, data.inventoryQuantity ?? null, data.inventoryPolicy || 'deny', data.trackInventory ? 1 : 0, data.downloadUrl || null, data.downloadLimit || null, data.requiresShipping ? 1 : 0, data.isDefault ? 1 : 0, data.position ?? 0, JSON.stringify(data.metadata || {}), now, now)
        .run();
    return { id };
}
export async function updateVariant(db, variantId, data) {
    const updates = [];
    const params = [];
    if (data.name !== undefined) {
        updates.push('name = ?');
        params.push(data.name);
    }
    if (data.sku !== undefined) {
        updates.push('sku = ?');
        params.push(data.sku);
    }
    if (data.priceAmount !== undefined) {
        updates.push('price_amount = ?');
        params.push(data.priceAmount);
    }
    if (data.compareAtPrice !== undefined) {
        updates.push('compare_at_price = ?');
        params.push(data.compareAtPrice);
    }
    if (data.pricingType !== undefined) {
        updates.push('pricing_type = ?');
        params.push(data.pricingType);
    }
    if (data.billingInterval !== undefined) {
        updates.push('billing_interval = ?');
        params.push(data.billingInterval);
    }
    if (data.billingIntervalCount !== undefined) {
        updates.push('billing_interval_count = ?');
        params.push(data.billingIntervalCount);
    }
    if (data.inventoryQuantity !== undefined) {
        updates.push('inventory_quantity = ?');
        params.push(data.inventoryQuantity);
    }
    if (data.inventoryPolicy !== undefined) {
        updates.push('inventory_policy = ?');
        params.push(data.inventoryPolicy);
    }
    if (data.trackInventory !== undefined) {
        updates.push('track_inventory = ?');
        params.push(data.trackInventory ? 1 : 0);
    }
    if (data.downloadUrl !== undefined) {
        updates.push('download_url = ?');
        params.push(data.downloadUrl);
    }
    if (data.downloadLimit !== undefined) {
        updates.push('download_limit = ?');
        params.push(data.downloadLimit);
    }
    if (data.requiresShipping !== undefined) {
        updates.push('requires_shipping = ?');
        params.push(data.requiresShipping ? 1 : 0);
    }
    if (data.providerPriceId !== undefined) {
        updates.push('provider_price_id = ?');
        params.push(data.providerPriceId);
    }
    if (data.isDefault !== undefined) {
        updates.push('is_default = ?');
        params.push(data.isDefault ? 1 : 0);
    }
    if (data.position !== undefined) {
        updates.push('position = ?');
        params.push(data.position);
    }
    if (data.metadata !== undefined) {
        updates.push('metadata = ?');
        params.push(JSON.stringify(data.metadata));
    }
    if (updates.length === 0)
        return;
    updates.push('updated_at = ?');
    params.push(Math.floor(Date.now() / 1000));
    params.push(variantId);
    await db
        .prepare(`UPDATE product_variants SET ${updates.join(', ')} WHERE id = ?`)
        .bind(...params)
        .run();
}
export async function deleteVariant(db, variantId) {
    await db
        .prepare('DELETE FROM product_variants WHERE id = ?')
        .bind(variantId)
        .run();
}
// =============================================================================
// ORDER OPERATIONS
// =============================================================================
export async function generateOrderNumber(db, tenantId) {
    // Get the count of orders for this tenant
    const result = await db
        .prepare('SELECT COUNT(*) as count FROM orders WHERE tenant_id = ?')
        .bind(tenantId)
        .first();
    const count = (result?.count || 0) + 1;
    return `GRV-${count.toString().padStart(4, '0')}`;
}
export async function createOrder(db, tenantId, data) {
    const id = crypto.randomUUID();
    const orderNumber = await generateOrderNumber(db, tenantId);
    const now = Math.floor(Date.now() / 1000);
    const requiresShipping = data.lineItems.some(item => item.requiresShipping);
    // Insert order
    await db
        .prepare(`INSERT INTO orders (
        id, tenant_id, order_number, customer_id, customer_email, customer_name,
        subtotal, tax_total, shipping_total, discount_total, total, currency,
        status, payment_status, shipping_address, billing_address, requires_shipping,
        provider_session_id, customer_notes, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(id, tenantId, orderNumber, data.customerId || null, data.customerEmail, data.customerName || null, data.subtotal, data.taxTotal || 0, data.shippingTotal || 0, data.discountTotal || 0, data.total, data.currency || 'usd', 'pending', 'pending', data.shippingAddress ? JSON.stringify(data.shippingAddress) : null, data.billingAddress ? JSON.stringify(data.billingAddress) : null, requiresShipping ? 1 : 0, data.providerSessionId || null, data.customerNotes || null, JSON.stringify(data.metadata || {}), now, now)
        .run();
    // Insert line items
    for (const item of data.lineItems) {
        const lineItemId = crypto.randomUUID();
        await db
            .prepare(`INSERT INTO order_line_items (
          id, order_id, tenant_id, product_id, variant_id, product_name, variant_name,
          sku, quantity, unit_price, total_price, tax_amount, type, requires_shipping,
          metadata, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .bind(lineItemId, id, tenantId, item.productId || null, item.variantId || null, item.productName, item.variantName, item.sku || null, item.quantity, item.unitPrice, item.unitPrice * item.quantity, item.taxAmount || 0, 'product', item.requiresShipping ? 1 : 0, '{}', now)
            .run();
    }
    return { id, orderNumber };
}
export async function getOrderById(db, orderId) {
    const row = await db
        .prepare('SELECT * FROM orders WHERE id = ?')
        .bind(orderId)
        .first();
    if (!row)
        return null;
    const lineItemRows = await db
        .prepare('SELECT * FROM order_line_items WHERE order_id = ?')
        .bind(orderId)
        .all();
    return mapOrderRow(row, lineItemRows.results);
}
export async function getOrderBySessionId(db, sessionId) {
    const row = await db
        .prepare('SELECT * FROM orders WHERE provider_session_id = ?')
        .bind(sessionId)
        .first();
    if (!row)
        return null;
    const lineItemRows = await db
        .prepare('SELECT * FROM order_line_items WHERE order_id = ?')
        .bind(row.id)
        .all();
    return mapOrderRow(row, lineItemRows.results);
}
export async function updateOrderStatus(db, orderId, data) {
    const updates = [];
    const params = [];
    if (data.status !== undefined) {
        updates.push('status = ?');
        params.push(data.status);
    }
    if (data.paymentStatus !== undefined) {
        updates.push('payment_status = ?');
        params.push(data.paymentStatus);
    }
    if (data.providerPaymentId !== undefined) {
        updates.push('provider_payment_id = ?');
        params.push(data.providerPaymentId);
    }
    if (data.paidAt !== undefined) {
        updates.push('paid_at = ?');
        params.push(data.paidAt);
    }
    if (updates.length === 0)
        return;
    updates.push('updated_at = ?');
    params.push(Math.floor(Date.now() / 1000));
    params.push(orderId);
    await db
        .prepare(`UPDATE orders SET ${updates.join(', ')} WHERE id = ?`)
        .bind(...params)
        .run();
}
export async function getOrders(db, tenantId, options = {}) {
    let query = 'SELECT * FROM orders WHERE tenant_id = ?';
    const params = [tenantId];
    if (options.status) {
        query += ' AND status = ?';
        params.push(options.status);
    }
    if (options.paymentStatus) {
        query += ' AND payment_status = ?';
        params.push(options.paymentStatus);
    }
    query += ' ORDER BY created_at DESC';
    if (options.limit) {
        query += ' LIMIT ?';
        params.push(options.limit);
    }
    if (options.offset) {
        query += ' OFFSET ?';
        params.push(options.offset);
    }
    const result = await db.prepare(query).bind(...params).all();
    const orders = [];
    for (const row of result.results) {
        const lineItemRows = await db
            .prepare('SELECT * FROM order_line_items WHERE order_id = ?')
            .bind(row.id)
            .all();
        orders.push(mapOrderRow(row, lineItemRows.results));
    }
    return orders;
}
// =============================================================================
// CUSTOMER OPERATIONS
// =============================================================================
export async function getOrCreateCustomer(db, tenantId, email, data) {
    // Try to find existing customer
    const existing = await db
        .prepare('SELECT * FROM customers WHERE tenant_id = ? AND email = ?')
        .bind(tenantId, email)
        .first();
    if (existing) {
        return mapCustomerRow(existing);
    }
    // Create new customer
    const id = crypto.randomUUID();
    const now = Math.floor(Date.now() / 1000);
    await db
        .prepare(`INSERT INTO customers (
        id, tenant_id, email, name, phone, metadata, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)`)
        .bind(id, tenantId, email, data?.name || null, data?.phone || null, '{}', now, now)
        .run();
    return {
        id,
        tenantId,
        email,
        name: data?.name,
        phone: data?.phone,
        metadata: {},
        createdAt: new Date(now * 1000),
        updatedAt: new Date(now * 1000),
    };
}
export async function updateCustomer(db, customerId, data) {
    const updates = [];
    const params = [];
    if (data.name !== undefined) {
        updates.push('name = ?');
        params.push(data.name);
    }
    if (data.phone !== undefined) {
        updates.push('phone = ?');
        params.push(data.phone);
    }
    if (data.providerCustomerId !== undefined) {
        updates.push('provider_customer_id = ?');
        params.push(data.providerCustomerId);
    }
    if (data.defaultShippingAddress !== undefined) {
        updates.push('default_shipping_address = ?');
        params.push(JSON.stringify(data.defaultShippingAddress));
    }
    if (data.defaultBillingAddress !== undefined) {
        updates.push('default_billing_address = ?');
        params.push(JSON.stringify(data.defaultBillingAddress));
    }
    if (data.totalOrders !== undefined) {
        updates.push('total_orders = ?');
        params.push(data.totalOrders);
    }
    if (data.totalSpent !== undefined) {
        updates.push('total_spent = ?');
        params.push(data.totalSpent);
    }
    if (updates.length === 0)
        return;
    updates.push('updated_at = ?');
    params.push(Math.floor(Date.now() / 1000));
    params.push(customerId);
    await db
        .prepare(`UPDATE customers SET ${updates.join(', ')} WHERE id = ?`)
        .bind(...params)
        .run();
}
// =============================================================================
// ROW MAPPERS
// =============================================================================
function mapProductRow(row) {
    return {
        id: row.id,
        tenantId: row.tenant_id,
        name: row.name,
        description: row.description || undefined,
        type: row.type,
        status: row.status,
        images: JSON.parse(row.images || '[]'),
        metadata: JSON.parse(row.metadata || '{}'),
        createdAt: new Date(row.created_at * 1000),
        updatedAt: new Date(row.updated_at * 1000),
    };
}
function mapVariantRow(row) {
    return {
        id: row.id,
        productId: row.product_id,
        name: row.name,
        sku: row.sku || undefined,
        price: {
            amount: row.price_amount,
            currency: row.price_currency,
        },
        compareAtPrice: row.compare_at_price
            ? { amount: row.compare_at_price, currency: row.price_currency }
            : undefined,
        pricingType: row.pricing_type,
        recurring: row.billing_interval && row.pricing_type === 'recurring'
            ? {
                interval: row.billing_interval,
                intervalCount: row.billing_interval_count || 1,
            }
            : undefined,
        inventoryQuantity: row.inventory_quantity ?? undefined,
        inventoryPolicy: row.inventory_policy,
        downloadUrl: row.download_url || undefined,
        downloadLimit: row.download_limit ?? undefined,
        providerPriceId: row.provider_price_id || undefined,
        isDefault: row.is_default === 1,
        position: row.position,
        createdAt: new Date(row.created_at * 1000),
        updatedAt: new Date(row.updated_at * 1000),
    };
}
function mapOrderRow(row, lineItemRows) {
    return {
        id: row.id,
        tenantId: row.tenant_id,
        customerId: row.customer_id || undefined,
        customerEmail: row.customer_email,
        lineItems: lineItemRows.map(mapLineItemRow),
        subtotal: { amount: row.subtotal, currency: row.currency },
        taxTotal: { amount: row.tax_total, currency: row.currency },
        shippingTotal: { amount: row.shipping_total, currency: row.currency },
        discountTotal: { amount: row.discount_total, currency: row.currency },
        total: { amount: row.total, currency: row.currency },
        status: row.status,
        paymentStatus: row.payment_status,
        providerOrderId: row.provider_payment_id || undefined,
        providerSessionId: row.provider_session_id || undefined,
        shippingAddress: row.shipping_address
            ? JSON.parse(row.shipping_address)
            : undefined,
        billingAddress: row.billing_address
            ? JSON.parse(row.billing_address)
            : undefined,
        fulfilledAt: row.fulfilled_at
            ? new Date(row.fulfilled_at * 1000)
            : undefined,
        shippedAt: row.shipped_at ? new Date(row.shipped_at * 1000) : undefined,
        trackingNumber: row.tracking_number || undefined,
        trackingUrl: row.tracking_url || undefined,
        notes: row.internal_notes || undefined,
        createdAt: new Date(row.created_at * 1000),
        updatedAt: new Date(row.updated_at * 1000),
    };
}
function mapLineItemRow(row) {
    return {
        id: row.id,
        variantId: row.variant_id || '',
        productId: row.product_id || '',
        productName: row.product_name,
        variantName: row.variant_name,
        quantity: row.quantity,
        unitPrice: { amount: row.unit_price, currency: 'usd' },
        totalPrice: { amount: row.total_price, currency: 'usd' },
        taxAmount: row.tax_amount
            ? { amount: row.tax_amount, currency: 'usd' }
            : undefined,
        metadata: JSON.parse(row.metadata || '{}'),
    };
}
function mapCustomerRow(row) {
    return {
        id: row.id,
        tenantId: row.tenant_id,
        email: row.email,
        name: row.name || undefined,
        phone: row.phone || undefined,
        defaultShippingAddress: row.default_shipping_address
            ? JSON.parse(row.default_shipping_address)
            : undefined,
        defaultBillingAddress: row.default_billing_address
            ? JSON.parse(row.default_billing_address)
            : undefined,
        providerCustomerId: row.provider_customer_id || undefined,
        metadata: JSON.parse(row.metadata || '{}'),
        createdAt: new Date(row.created_at * 1000),
        updatedAt: new Date(row.updated_at * 1000),
    };
}
