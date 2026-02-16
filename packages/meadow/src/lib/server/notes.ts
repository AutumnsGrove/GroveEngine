/**
 * Notes Service — Create and delete native short-form posts.
 *
 * Notes are words left in the meadow for others to find.
 * Up to 500 characters, no title, no external link.
 */

import type { MeadowPost } from "$lib/types/post";
import type { PostRow } from "./types";
import { rowToPost } from "./types";

/**
 * Create a new Note in the meadow.
 */
export async function createNote(
  db: D1Database,
  userId: string,
  authorName: string | null,
  body: string,
  tags?: string[],
): Promise<MeadowPost> {
  const id = crypto.randomUUID();
  const guid = `note:${id}`;
  const now = Math.floor(Date.now() / 1000);
  const trimmedBody = body.trim();

  await db
    .prepare(
      `INSERT INTO meadow_posts
        (id, tenant_id, guid, title, description, content_html, link,
         author_name, author_subdomain, tags, featured_image,
         published_at, score, reaction_counts, visible,
         post_type, user_id, body)
      VALUES (?, NULL, ?, '', '', NULL, '',
              ?, '', ?, NULL,
              ?, 0, '{}', 1,
              'note', ?, ?)`,
    )
    .bind(
      id,
      guid,
      authorName,
      JSON.stringify(tags || []),
      now,
      userId,
      trimmedBody,
    )
    .run();

  // Return the created post in client shape
  return {
    id,
    postType: "note",
    title: "",
    description: "",
    link: "",
    authorName,
    authorSubdomain: "",
    tags: tags || [],
    featuredImage: null,
    publishedAt: now,
    contentHtml: null,
    body: trimmedBody,
    userId,
    userVoted: false,
    userBookmarked: false,
    userReactions: [],
    score: 0,
    reactionCounts: {},
  };
}

/**
 * Delete a Note — only the author can delete their own notes.
 * Returns true if a row was deleted.
 */
export async function deleteNote(
  db: D1Database,
  userId: string,
  noteId: string,
): Promise<boolean> {
  const result = await db
    .prepare(
      `DELETE FROM meadow_posts
       WHERE id = ? AND user_id = ? AND post_type = 'note'`,
    )
    .bind(noteId, userId)
    .run();

  return (result.meta?.changes ?? 0) > 0;
}
