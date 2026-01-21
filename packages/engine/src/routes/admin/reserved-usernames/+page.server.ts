/**
 * Reserved Usernames Admin Page Server
 *
 * Allows Grove administrators to view, add, and remove reserved usernames.
 * All changes are logged to the audit table for compliance.
 */

import { error, fail } from "@sveltejs/kit";
import type { PageServerLoad, Actions } from "./$types";

interface ReservedUsername {
  username: string;
  reason: string;
  created_at: number;
}

interface AuditLogEntry {
  id: string;
  action: string;
  username: string;
  reason: string | null;
  actor_email: string;
  notes: string | null;
  created_at: number;
}

// Valid reservation reasons
const VALID_REASONS = [
  "system",
  "trademark",
  "offensive",
  "taken_external",
  "custom",
] as const;
type ReservationReason = (typeof VALID_REASONS)[number];

// List of admin emails who can manage reserved usernames
// In production, this would come from a config or database
const ADMIN_EMAILS = ["autumn@grove.place", "admin@grove.place"];

function isAdmin(email: string | undefined): boolean {
  if (!email) return false;
  return ADMIN_EMAILS.includes(email.toLowerCase());
}

export const load: PageServerLoad = async ({ locals, platform, url }) => {
  if (!locals.user) {
    throw error(401, "Unauthorized");
  }

  // Check if user is a Grove admin
  if (!isAdmin(locals.user.email)) {
    throw error(
      403,
      "Access denied. This page is for Grove administrators only.",
    );
  }

  if (!platform?.env?.DB) {
    throw error(500, "Database not available");
  }

  const { DB } = platform.env;

  // Pagination
  const page = Math.max(1, parseInt(url.searchParams.get("page") || "1"));
  const pageSize = 50;
  const offset = (page - 1) * pageSize;

  // Search/filter
  const search = url.searchParams.get("search") || "";
  const reasonFilter = url.searchParams.get("reason") || "";

  try {
    // Build query with optional filters
    let query = "SELECT * FROM reserved_usernames";
    const params: string[] = [];
    const conditions: string[] = [];

    if (search) {
      conditions.push("username LIKE ?");
      params.push(`%${search}%`);
    }

    if (
      reasonFilter &&
      VALID_REASONS.includes(reasonFilter as ReservationReason)
    ) {
      conditions.push("reason = ?");
      params.push(reasonFilter);
    }

    if (conditions.length > 0) {
      query += " WHERE " + conditions.join(" AND ");
    }

    query += " ORDER BY username ASC LIMIT ? OFFSET ?";
    params.push(pageSize.toString(), offset.toString());

    // Build count query params separately
    let countQuery = "SELECT COUNT(*) as count FROM reserved_usernames";
    const countParams: string[] = [];
    if (conditions.length > 0) {
      if (search) countParams.push(`%${search}%`);
      if (reasonFilter) countParams.push(reasonFilter);
      countQuery += " WHERE " + conditions.join(" AND ");
    }

    // PERFORMANCE: Run all four independent queries in parallel (~600ms savings)
    // Previously these ran sequentially: reserved usernames, count, audit log, stats
    const [reservedResult, countResult, auditResult, statsResult] =
      await Promise.all([
        // Get reserved usernames with pagination
        DB.prepare(query)
          .bind(...params)
          .all<ReservedUsername>(),

        // Get total count for pagination
        DB.prepare(countQuery)
          .bind(...countParams)
          .first<{ count: number }>(),

        // Get recent audit log entries
        DB.prepare(
          `SELECT * FROM username_audit_log
         ORDER BY created_at DESC
         LIMIT 20`,
        ).all<AuditLogEntry>(),

        // Get reason statistics
        DB.prepare(
          `SELECT reason, COUNT(*) as count
         FROM reserved_usernames
         GROUP BY reason`,
        ).all<{ reason: string; count: number }>(),
      ]);

    const stats =
      statsResult.results?.reduce(
        (acc, row) => {
          acc[row.reason] = row.count;
          return acc;
        },
        {} as Record<string, number>,
      ) || {};

    return {
      reservedUsernames: reservedResult.results || [],
      auditLog: auditResult.results || [],
      stats,
      pagination: {
        page,
        pageSize,
        total: countResult?.count || 0,
        totalPages: Math.ceil((countResult?.count || 0) / pageSize),
      },
      filters: {
        search,
        reason: reasonFilter,
      },
      validReasons: VALID_REASONS,
    };
  } catch (err) {
    console.error("[Reserved Usernames] Error loading data:", err);
    throw error(500, "Failed to load reserved usernames");
  }
};

export const actions: Actions = {
  /**
   * Add a new reserved username
   */
  add: async ({ request, locals, platform }) => {
    if (!locals.user || !isAdmin(locals.user.email)) {
      return fail(403, { error: "Access denied" });
    }

    if (!platform?.env?.DB) {
      return fail(500, { error: "Database not available" });
    }

    const { DB } = platform.env;
    const formData = await request.formData();
    const username = formData.get("username")?.toString().toLowerCase().trim();
    const reason = formData.get("reason")?.toString() as ReservationReason;
    const notes = formData.get("notes")?.toString().trim() || null;

    // Validate username
    if (!username || username.length < 2) {
      return fail(400, { error: "Username must be at least 2 characters" });
    }

    if (!/^[a-z0-9][a-z0-9-]*[a-z0-9]$|^[a-z0-9]$/.test(username)) {
      return fail(400, {
        error: "Username must be lowercase letters, numbers, and hyphens only",
      });
    }

    if (username.length > 30) {
      return fail(400, { error: "Username must be 30 characters or less" });
    }

    // Validate reason
    if (!reason || !VALID_REASONS.includes(reason)) {
      return fail(400, { error: "Invalid reservation reason" });
    }

    try {
      // Check if already reserved
      const existing = await DB.prepare(
        "SELECT username FROM reserved_usernames WHERE username = ?",
      )
        .bind(username)
        .first();

      if (existing) {
        return fail(400, {
          error: `Username "${username}" is already reserved`,
        });
      }

      // Add to reserved usernames
      await DB.prepare(
        `INSERT INTO reserved_usernames (username, reason, created_at)
         VALUES (?, ?, unixepoch())`,
      )
        .bind(username, reason)
        .run();

      // Log the action
      const auditId = crypto.randomUUID();
      await DB.prepare(
        `INSERT INTO username_audit_log (id, action, username, reason, actor_email, notes, created_at)
         VALUES (?, 'add', ?, ?, ?, ?, unixepoch())`,
      )
        .bind(auditId, username, reason, locals.user.email, notes)
        .run();

      return { success: true, message: `Reserved "${username}" successfully` };
    } catch (err) {
      console.error("[Reserved Usernames] Error adding:", err);
      return fail(500, { error: "Failed to add reserved username" });
    }
  },

  /**
   * Remove a reserved username
   */
  remove: async ({ request, locals, platform }) => {
    if (!locals.user || !isAdmin(locals.user.email)) {
      return fail(403, { error: "Access denied" });
    }

    if (!platform?.env?.DB) {
      return fail(500, { error: "Database not available" });
    }

    const { DB } = platform.env;
    const formData = await request.formData();
    const username = formData.get("username")?.toString().toLowerCase().trim();
    const notes = formData.get("notes")?.toString().trim() || null;

    if (!username) {
      return fail(400, { error: "Username is required" });
    }

    try {
      // Check if exists
      const existing = await DB.prepare(
        "SELECT username, reason FROM reserved_usernames WHERE username = ?",
      )
        .bind(username)
        .first<{ username: string; reason: string }>();

      if (!existing) {
        return fail(404, { error: `Username "${username}" is not reserved` });
      }

      // Remove from reserved usernames
      await DB.prepare("DELETE FROM reserved_usernames WHERE username = ?")
        .bind(username)
        .run();

      // Log the action
      const auditId = crypto.randomUUID();
      await DB.prepare(
        `INSERT INTO username_audit_log (id, action, username, reason, actor_email, notes, created_at)
         VALUES (?, 'remove', ?, ?, ?, ?, unixepoch())`,
      )
        .bind(auditId, username, existing.reason, locals.user.email, notes)
        .run();

      return { success: true, message: `Released "${username}" successfully` };
    } catch (err) {
      console.error("[Reserved Usernames] Error removing:", err);
      return fail(500, { error: "Failed to remove reserved username" });
    }
  },
};
