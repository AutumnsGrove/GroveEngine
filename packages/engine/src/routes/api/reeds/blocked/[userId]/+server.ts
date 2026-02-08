/**
 * DELETE /api/reeds/blocked/[userId] — Unblock a commenter
 *
 * Blog author only. Removes a user from the block list.
 */

import { json } from "@sveltejs/kit";
import { validateCSRF } from "$lib/utils/csrf.js";
import { getVerifiedTenantId } from "$lib/auth/session.js";
import { API_ERRORS, throwGroveError } from "$lib/errors";
import { unblockCommenter } from "$lib/server/services/reeds.js";
import type { RequestHandler } from "./$types.js";

export const DELETE: RequestHandler = async ({
  params,
  request,
  platform,
  locals,
}) => {
  if (!locals.user) {
    throwGroveError(401, API_ERRORS.UNAUTHORIZED, "API");
  }

  if (!validateCSRF(request)) {
    throwGroveError(403, API_ERRORS.INVALID_ORIGIN, "API");
  }

  if (!platform?.env?.DB || !locals.tenantId) {
    throwGroveError(500, API_ERRORS.DB_NOT_CONFIGURED, "API");
  }

  const { userId } = params;

  try {
    const tenantId = await getVerifiedTenantId(
      platform.env.DB,
      locals.tenantId,
      locals.user,
    );

    await unblockCommenter(platform.env.DB, tenantId, userId);

    return json({
      success: true,
      message: "User unblocked.",
    });
  } catch (err) {
    if ((err as { status?: number }).status) throw err;
    throwGroveError(500, API_ERRORS.OPERATION_FAILED, "API", { cause: err });
  }
};
