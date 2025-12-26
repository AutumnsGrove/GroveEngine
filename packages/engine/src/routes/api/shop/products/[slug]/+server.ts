import { json, error } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { validateCSRF } from "$lib/utils/csrf.js";
import {
  getProductBySlug,
  updateProduct,
  deleteProduct,
  createVariant,
  updateVariant,
  deleteVariant,
} from "$lib/payments/shop";
import { getVerifiedTenantId } from "$lib/auth/session.js";

// Shop feature is temporarily disabled - deferred to Phase 5 (Grove Social and beyond)
const SHOP_DISABLED = true;
const SHOP_DISABLED_MESSAGE =
  "Shop feature is temporarily disabled. It will be available in a future release.";

/**
 * GET /api/shop/products/[slug] - Get a single product
 */
export const GET: RequestHandler = async ({ params, url, platform, locals }) => {
  if (SHOP_DISABLED) {
    throw error(503, SHOP_DISABLED_MESSAGE);
  }

  if (!platform?.env?.DB) {
    throw error(500, "Database not configured");
  }

  const tenantId = url.searchParams.get("tenant_id") || locals.tenantId;
  if (!tenantId) {
    throw error(400, "Tenant ID required");
  }

  try {
    const product = await getProductBySlug(
      platform.env.DB,
      tenantId,
      params.slug,
    );

    if (!product) {
      throw error(404, "Product not found");
    }

    return json({ product });
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) throw err;
    console.error("Error fetching product:", err);
    throw error(500, "Failed to fetch product");
  }
};

/**
 * PATCH /api/shop/products/[slug] - Update a product
 *
 * Body: Same as POST, all fields optional
 */
export const PATCH: RequestHandler = async ({ params, request, url, platform, locals }) => {
  if (SHOP_DISABLED) {
    throw error(503, SHOP_DISABLED_MESSAGE);
  }

  // Auth check
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  // CSRF check
  if (!validateCSRF(request)) {
    throw error(403, "Invalid origin");
  }

  if (!platform?.env?.DB) {
    throw error(500, "Database not configured");
  }

  const tenantId = url.searchParams.get("tenant_id") || locals.tenantId;
  if (!tenantId) {
    throw error(400, "Tenant ID required");
  }

  try {
    // Get existing product
    const product = await getProductBySlug(
      platform.env.DB,
      tenantId,
      params.slug,
    );

    if (!product) {
      throw error(404, "Product not found");
    }

    const data = await request.json();

    // Validate slug if changing
    if (data.slug && data.slug !== params.slug) {
      const slugRegex = /^[a-z0-9-]+$/;
      if (!slugRegex.test(data.slug)) {
        throw error(
          400,
          "Slug must contain only lowercase letters, numbers, and hyphens",
        );
      }
    }

    // Update product
    await updateProduct(platform.env.DB, product.id, {
      name: data.name,
      slug: data.slug,
      description: data.description,
      shortDescription: data.shortDescription,
      type: data.type,
      status: data.status,
      images: data.images,
      featuredImage: data.featuredImage,
      category: data.category,
      tags: data.tags,
      metadata: data.metadata,
    });

    // Handle variant updates if provided
    if (data.variants) {
      for (const variantData of (data.variants as any[])) {
        if (variantData.id) {
          // Update existing variant
          await updateVariant(platform.env.DB, variantData.id, {
            name: variantData.name,
            sku: variantData.sku,
            priceAmount: variantData.priceAmount,
            compareAtPrice: variantData.compareAtPrice,
            pricingType: variantData.pricingType,
            billingInterval: variantData.billingInterval,
            billingIntervalCount: variantData.billingIntervalCount,
            inventoryQuantity: variantData.inventoryQuantity,
            inventoryPolicy: variantData.inventoryPolicy,
            trackInventory: variantData.trackInventory,
            downloadUrl: variantData.downloadUrl,
            downloadLimit: variantData.downloadLimit,
            requiresShipping: variantData.requiresShipping,
            isDefault: variantData.isDefault,
            position: variantData.position,
            metadata: variantData.metadata,
          });
        } else if (variantData._action === "create") {
          // Create new variant
          await createVariant(platform.env.DB, product.id, tenantId, {
            name: variantData.name,
            sku: variantData.sku,
            priceAmount: variantData.priceAmount,
            priceCurrency: variantData.priceCurrency || "usd",
            compareAtPrice: variantData.compareAtPrice,
            pricingType: variantData.pricingType || "one_time",
            billingInterval: variantData.billingInterval,
            billingIntervalCount: variantData.billingIntervalCount,
            inventoryQuantity: variantData.inventoryQuantity,
            inventoryPolicy: variantData.inventoryPolicy,
            trackInventory: variantData.trackInventory,
            downloadUrl: variantData.downloadUrl,
            downloadLimit: variantData.downloadLimit,
            requiresShipping: variantData.requiresShipping,
            isDefault: variantData.isDefault,
            position: variantData.position,
            metadata: variantData.metadata,
          });
        }
      }
    }

    // Handle variant deletions
    if (data.deleteVariants) {
      for (const variantId of (data.deleteVariants as string[])) {
        await deleteVariant(platform.env.DB, variantId);
      }
    }

    // Fetch updated product
    const updatedProduct = await getProductBySlug(
      platform.env.DB,
      tenantId,
      data.slug || params.slug,
    );

    return json({
      success: true,
      product: updatedProduct,
    });
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) throw err;
    console.error("Error updating product:", err);
    throw error(500, "Failed to update product");
  }
};

/**
 * DELETE /api/shop/products/[slug] - Delete a product
 */
export const DELETE: RequestHandler = async ({ params, request, url, platform, locals }) => {
  if (SHOP_DISABLED) {
    throw error(503, SHOP_DISABLED_MESSAGE);
  }

  // Auth check
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  // CSRF check
  if (!validateCSRF(request)) {
    throw error(403, "Invalid origin");
  }

  if (!platform?.env?.DB) {
    throw error(500, "Database not configured");
  }

  const tenantId = url.searchParams.get("tenant_id") || locals.tenantId;
  if (!tenantId) {
    throw error(400, "Tenant ID required");
  }

  try {
    const product = await getProductBySlug(
      platform.env.DB,
      tenantId,
      params.slug,
    );

    if (!product) {
      throw error(404, "Product not found");
    }

    await deleteProduct(platform.env.DB, product.id);

    return json({
      success: true,
      message: "Product deleted",
    });
  } catch (err) {
    if (err && typeof err === 'object' && 'status' in err) throw err;
    console.error("Error deleting product:", err);
    throw error(500, "Failed to delete product");
  }
};
