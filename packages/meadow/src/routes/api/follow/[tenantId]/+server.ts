/**
 * Follow API — Follow or unfollow a blog
 *
 * POST   /api/follow/[tenantId] — Follow
 * DELETE /api/follow/[tenantId] — Unfollow
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { followBlog, unfollowBlog } from "$lib/server/follows";

export const POST: RequestHandler = async ({ params, platform, locals }) => {
  if (!locals.user) {
    return json(
      {
        error: "GROVE-API-020",
        error_code: "UNAUTHORIZED",
        error_description: "Please sign in to continue.",
      },
      { status: 401 },
    );
  }

  const db = platform?.env?.DB;
  if (!db) {
    return json({ error: "Service unavailable" }, { status: 503 });
  }

  const created = await followBlog(db, locals.user.id, params.tenantId);
  return json({ success: true, following: true, created });
};

export const DELETE: RequestHandler = async ({ params, platform, locals }) => {
  if (!locals.user) {
    return json(
      {
        error: "GROVE-API-020",
        error_code: "UNAUTHORIZED",
        error_description: "Please sign in to continue.",
      },
      { status: 401 },
    );
  }

  const db = platform?.env?.DB;
  if (!db) {
    return json({ error: "Service unavailable" }, { status: 503 });
  }

  const removed = await unfollowBlog(db, locals.user.id, params.tenantId);
  return json({ success: true, following: false, removed });
};
