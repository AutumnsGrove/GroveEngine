import { getTenantDb } from "$lib/server/services/database";
import type { PageServerLoad } from "./$types";

interface PostRecord {
  slug: string;
  title: string;
  date?: string;
  /** JSON string of tags array */
  tags?: string;
  description?: string;
  created_at?: string;
}

interface BlogPost {
  slug: string;
  title: string;
  date: string;
  tags: string[];
  description: string;
}

/**
 * Fetch posts from D1 database (multi-tenant)
 */
export const load: PageServerLoad = async ({ platform, locals }) => {
  // Debug: Log what we're receiving
  console.log("[Admin Blog] tenantId:", locals.tenantId);
  console.log("[Admin Blog] user:", locals.user?.email ?? "null");

  // Require tenant context
  if (!locals.tenantId) {
    console.error("[Admin Blog] No tenant ID found");
    return {
      posts: [] as BlogPost[],
      debug: { tenantId: null, reason: "no_tenant_id" },
    };
  }

  // Require database
  if (!platform?.env?.DB) {
    console.error("[Admin Blog] D1 database not available");
    return {
      posts: [] as BlogPost[],
      debug: { tenantId: locals.tenantId, reason: "no_database" },
    };
  }

  try {
    // Use TenantDb for automatic tenant scoping
    const tenantDb = getTenantDb(platform.env.DB, {
      tenantId: locals.tenantId,
    });

    // Fetch all posts for this tenant, ordered by publish date descending
    const postsArray = await tenantDb.queryMany<PostRecord>(
      "posts",
      undefined, // No additional WHERE clause (tenant_id is automatic)
      [],
      { orderBy: "published_at DESC, created_at DESC" },
    );

    // Transform posts - parse tags from JSON string
    const posts: BlogPost[] = postsArray.map((post) => ({
      slug: post.slug,
      title: post.title,
      date: post.date || post.created_at?.split("T")[0] || "",
      tags: post.tags ? JSON.parse(post.tags) : [],
      description: post.description || "",
    }));

    console.log("[Admin Blog] Found", posts.length, "posts");
    return {
      posts,
      debug: {
        tenantId: locals.tenantId,
        reason: "success",
        count: posts.length,
      },
    };
  } catch (error) {
    console.error("[Admin Blog] Error fetching posts:", error);
    return {
      posts: [] as BlogPost[],
      debug: {
        tenantId: locals.tenantId,
        reason: "error",
        error: String(error),
      },
    };
  }
};
