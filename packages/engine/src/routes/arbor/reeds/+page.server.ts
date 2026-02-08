/**
 * Arbor Reeds — Comment Moderation Queue
 *
 * Loads pending public comments and private replies for the blog author.
 */

import { getTenantDb } from "$lib/server/services/database.js";
import {
  getPendingComments,
  getAllPrivateReplies,
  getCommentSettings,
  type CommentRecord,
  type CommentSettingsRecord,
} from "$lib/server/services/reeds.js";
import type { PageServerLoad } from "./$types.js";

interface PostLookup {
  id: string;
  slug: string;
  title: string;
}

export const load: PageServerLoad = async ({ platform, locals }) => {
  if (!locals.tenantId || !platform?.env?.DB) {
    return {
      pending: [],
      replies: [],
      settings: null,
      postMap: {},
    };
  }

  const tenantDb = getTenantDb(platform.env.DB, {
    tenantId: locals.tenantId,
  });

  const [pending, replies, settings, posts] = await Promise.all([
    getPendingComments(tenantDb).catch((err) => {
      console.error("[Reeds] Failed to load pending comments:", err);
      return [] as CommentRecord[];
    }),
    getAllPrivateReplies(tenantDb).catch((err) => {
      console.error("[Reeds] Failed to load private replies:", err);
      return [] as CommentRecord[];
    }),
    getCommentSettings(tenantDb).catch((err) => {
      console.error("[Reeds] Failed to load settings:", err);
      return null;
    }),
    tenantDb
      .queryMany<PostLookup>("posts", undefined, [], {
        orderBy: "created_at DESC",
        limit: 500,
      })
      .catch((err) => {
        console.error("[Reeds] Failed to load posts:", err);
        return [] as PostLookup[];
      }),
  ]);

  // Build a post lookup map for display
  const postMap: Record<string, { slug: string; title: string }> = {};
  for (const post of posts) {
    postMap[post.id] = { slug: post.slug, title: post.title };
  }

  return {
    pending,
    replies,
    settings,
    postMap,
  };
};
