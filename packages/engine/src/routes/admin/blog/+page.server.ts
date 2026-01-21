import { getTenantDb } from "$lib/server/services/database";
import type { PageServerLoad } from "./$types";

interface PostRecord {
  slug: string;
  title: string;
  status?: string;
  /** JSON string of tags array */
  tags?: string;
  description?: string;
  /** Unix timestamp in seconds */
  published_at?: number;
  updated_at?: number;
  created_at?: number;
}

interface BlogPost {
  slug: string;
  title: string;
  status: string;
  date: string | null;
  tags: string[];
  description: string;
}

/**
 * Fetch posts from D1 database (multi-tenant)
 */
export const load: PageServerLoad = async ({ platform, locals }) => {
  const isExampleSite = locals.tenantId === "example-tenant-001";

  // Require tenant context
  if (!locals.tenantId) {
    console.error("[Admin Blog] No tenant ID found");
    return { posts: [] as BlogPost[], isExampleSite: false };
  }

  // Require database
  if (!platform?.env?.DB) {
    console.error("[Admin Blog] D1 database not available");
    return { posts: [] as BlogPost[], isExampleSite };
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
    const posts: BlogPost[] = postsArray.map((post) => {
      // Determine which timestamp to use based on post status
      // For published posts: use published_at
      // For drafts: use updated_at
      // Fallback to created_at if needed
      let timestamp: number | undefined;

      if (post.status === "published" && post.published_at) {
        timestamp = post.published_at;
      } else if (post.updated_at) {
        timestamp = post.updated_at;
      } else if (post.created_at) {
        timestamp = post.created_at;
      }

      // Convert Unix timestamp (seconds) to ISO date string (YYYY-MM-DD)
      const date = timestamp
        ? new Date(timestamp * 1000).toISOString().split("T")[0]
        : null;

      return {
        slug: post.slug,
        title: post.title,
        status: post.status || "draft",
        date,
        tags: post.tags ? JSON.parse(post.tags) : [],
        description: post.description || "",
      };
    });

    return { posts, isExampleSite };
  } catch (error) {
    console.error("[Admin Blog] Error fetching posts:", error);
    return { posts: [] as BlogPost[], isExampleSite };
  }
};
