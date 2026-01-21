/**
 * Gallery Tags API
 *
 * Manage tags for the gallery curio.
 */

import { error, json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import {
  generateGalleryId,
  generateSlug,
  DEFAULT_TAG_COLOR,
} from "$lib/curios/gallery";

interface TagRow {
  id: string;
  name: string;
  slug: string;
  color: string;
  description: string | null;
  sort_order: number;
}

// GET - List all tags
export const GET: RequestHandler = async ({ platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  if (!db) {
    throw error(503, "Database not configured");
  }

  if (!tenantId) {
    throw error(400, "Tenant context required");
  }

  const result = await db
    .prepare(
      `SELECT id, name, slug, color, description, sort_order
       FROM gallery_tags
       WHERE tenant_id = ?
       ORDER BY sort_order, name`,
    )
    .bind(tenantId)
    .all<TagRow>();

  return json({
    success: true,
    tags: result.results,
  });
};

// POST - Create a new tag
export const POST: RequestHandler = async ({ request, platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  // Check authentication
  if (!locals.user) {
    throw error(401, "Authentication required");
  }

  if (!db) {
    throw error(503, "Database not configured");
  }

  if (!tenantId) {
    throw error(400, "Tenant context required");
  }

  const body = (await request.json()) as {
    name: string;
    color?: string;
    description?: string;
  };
  const { name, color, description } = body;

  if (!name || typeof name !== "string") {
    throw error(400, "Tag name is required");
  }

  const slug = generateSlug(name);
  const tagId = generateGalleryId();

  try {
    await db
      .prepare(
        `INSERT INTO gallery_tags (id, tenant_id, name, slug, color, description)
         VALUES (?, ?, ?, ?, ?, ?)`,
      )
      .bind(
        tagId,
        tenantId,
        name.trim(),
        slug,
        color || DEFAULT_TAG_COLOR,
        description?.trim() || null,
      )
      .run();

    return json({
      success: true,
      tag: {
        id: tagId,
        name: name.trim(),
        slug,
        color: color || DEFAULT_TAG_COLOR,
        description: description?.trim() || null,
      },
    });
  } catch (err: unknown) {
    if (err instanceof Error && err.message?.includes("UNIQUE constraint")) {
      throw error(409, "A tag with this name already exists");
    }
    throw error(500, "Failed to create tag");
  }
};

// DELETE - Delete a tag
export const DELETE: RequestHandler = async ({ url, platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  // Check authentication
  if (!locals.user) {
    throw error(401, "Authentication required");
  }

  if (!db) {
    throw error(503, "Database not configured");
  }

  if (!tenantId) {
    throw error(400, "Tenant context required");
  }

  const tagId = url.searchParams.get("id");

  if (!tagId) {
    throw error(400, "Tag ID is required");
  }

  try {
    // Verify tag belongs to this tenant
    const tag = await db
      .prepare(`SELECT id FROM gallery_tags WHERE id = ? AND tenant_id = ?`)
      .bind(tagId, tenantId)
      .first();

    if (!tag) {
      throw error(404, "Tag not found");
    }

    // Delete the tag (cascades to gallery_image_tags)
    await db.prepare(`DELETE FROM gallery_tags WHERE id = ?`).bind(tagId).run();

    return json({ success: true });
  } catch (err) {
    if (err instanceof Error && "status" in err) {
      throw err;
    }
    throw error(500, "Failed to delete tag");
  }
};

// PATCH - Update a tag
export const PATCH: RequestHandler = async ({ request, platform, locals }) => {
  const db = platform?.env?.DB;
  const tenantId = locals.tenantId;

  // Check authentication
  if (!locals.user) {
    throw error(401, "Authentication required");
  }

  if (!db) {
    throw error(503, "Database not configured");
  }

  if (!tenantId) {
    throw error(400, "Tenant context required");
  }

  const body = (await request.json()) as {
    id: string;
    name?: string;
    color?: string;
    description?: string;
    sortOrder?: number;
  };
  const { id, name, color, description, sortOrder } = body;

  if (!id) {
    throw error(400, "Tag ID is required");
  }

  // Verify tag belongs to this tenant
  const tag = await db
    .prepare(`SELECT id FROM gallery_tags WHERE id = ? AND tenant_id = ?`)
    .bind(id, tenantId)
    .first();

  if (!tag) {
    throw error(404, "Tag not found");
  }

  // Build update query dynamically
  const updates: string[] = [];
  const params: (string | number)[] = [];

  if (name !== undefined) {
    updates.push("name = ?", "slug = ?");
    params.push(name.trim(), generateSlug(name));
  }

  if (color !== undefined) {
    updates.push("color = ?");
    params.push(color);
  }

  if (description !== undefined) {
    updates.push("description = ?");
    params.push(description?.trim() || "");
  }

  if (sortOrder !== undefined) {
    updates.push("sort_order = ?");
    params.push(sortOrder);
  }

  if (updates.length === 0) {
    throw error(400, "No fields to update");
  }

  params.push(id);

  try {
    await db
      .prepare(`UPDATE gallery_tags SET ${updates.join(", ")} WHERE id = ?`)
      .bind(...params)
      .run();

    return json({ success: true });
  } catch (err: unknown) {
    if (err instanceof Error && err.message?.includes("UNIQUE constraint")) {
      throw error(409, "A tag with this name already exists");
    }
    throw error(500, "Failed to update tag");
  }
};
