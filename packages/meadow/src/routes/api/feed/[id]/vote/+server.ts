/**
 * Vote API — Cast or remove an upvote
 *
 * POST   /api/feed/[id]/vote — Cast vote
 * DELETE /api/feed/[id]/vote — Remove vote
 */

import { json } from "@sveltejs/kit";
import type { RequestHandler } from "./$types";
import { castVote, removeVote } from "$lib/server/votes";

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

  const created = await castVote(db, locals.user.id, params.id);
  return json({ success: true, created });
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

  const removed = await removeVote(db, locals.user.id, params.id);
  return json({ success: true, removed });
};
