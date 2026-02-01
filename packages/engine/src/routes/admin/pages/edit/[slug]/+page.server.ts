import { error } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";

interface PageRecord {
  slug: string;
  title: string;
  description: string | null;
  type: string;
  markdown_content: string | null;
  html_content: string | null;
  hero: string | null;
  gutter_content: string | null;
  font: string | null;
  updated_at: string | null;
  created_at: string | null;
}

interface HeroData {
  [key: string]: unknown;
}

export const load: PageServerLoad = async ({ params, platform, locals }) => {
  // Auth is handled by the parent /admin layout - no duplicate check needed here
  const { slug } = params;
  const tenantId = locals.tenantId;

  if (!slug) {
    throw error(400, "Slug is required");
  }

  // Try D1 first
  if (platform?.env?.DB) {
    try {
      const page = await platform.env.DB.prepare(
        `SELECT slug, title, description, type, markdown_content, html_content, hero, gutter_content, font, updated_at, created_at
         FROM pages
         WHERE slug = ? AND tenant_id = ?`,
      )
        .bind(slug, tenantId)
        .first<PageRecord>();

      if (page) {
        return {
          source: "d1" as const,
          page: {
            ...page,
            hero: page.hero ? (JSON.parse(page.hero) as HeroData) : null,
            gutter_content: page.gutter_content || "[]",
          },
        };
      }
    } catch (err) {
      console.error("D1 fetch error:", err);
      throw error(500, "Failed to fetch page");
    }
  }

  // If not found in D1, return error
  throw error(404, "Page not found");
};
