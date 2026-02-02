import { fail, redirect, type Actions } from "@sveltejs/kit";
import type { PageServerLoad } from "./$types";
import { generateId } from "@autumnsgrove/groveengine/services";
import { sendPorchReply } from "@autumnsgrove/groveengine/zephyr";

interface Visit {
  id: string;
  visit_number: string;
  user_id: string | null;
  guest_email: string | null;
  guest_name: string | null;
  category: string;
  subject: string;
  status: string;
  admin_notes: string | null;
  created_at: number;
  updated_at: number;
}

interface Message {
  id: string;
  visit_id: string;
  sender_type: string;
  sender_name: string | null;
  content: string;
  created_at: number;
}

interface User {
  id: string;
  email: string;
  name: string | null;
}

// Wayfinder emails (platform owner - same person, multiple accounts)
const WAYFINDER_EMAILS = ["autumn@grove.place", "autumnbrown23@pm.me"];

function isWayfinder(email: string | undefined): boolean {
  if (!email) return false;
  return WAYFINDER_EMAILS.includes(email.toLowerCase());
}

export const load: PageServerLoad = async ({ params, parent, platform }) => {
  // Auth is handled by parent layout - just check Wayfinder access
  const parentData = await parent();
  if (!parentData.isWayfinder) {
    throw redirect(302, "/admin");
  }

  if (!platform?.env?.DB) {
    return {
      visit: null,
      messages: [],
      userEmail: null,
    };
  }

  let visit: Visit | null = null;
  let messages: Message[] = [];
  let userEmail: string | null = null;

  try {
    // Run all queries in parallel to reduce latency (~60% improvement per AGENT.md:316-366)
    const [visitResult, messagesResult] = await Promise.all([
      platform.env.DB.prepare(
        `SELECT id, visit_number, user_id, guest_email, guest_name, category, subject, status, admin_notes, created_at, updated_at
				 FROM porch_visits
				 WHERE id = ?`,
      )
        .bind(params.id)
        .first<Visit>()
        .catch((err) => {
          console.warn("Failed to load visit:", err);
          return null;
        }),
      platform.env.DB.prepare(
        `SELECT id, visit_id, sender_type, sender_name, content, created_at
				 FROM porch_messages
				 WHERE visit_id = ?
				 ORDER BY created_at ASC`,
      )
        .bind(params.id)
        .all<Message>()
        .catch((err) => {
          console.warn("Failed to load messages:", err);
          return { results: [] };
        }),
    ]);

    visit = visitResult;
    messages = messagesResult.results || [];

    // Get user email if this is an authenticated visitor (separate query since it depends on visit.user_id)
    if (visit?.user_id) {
      const user = await platform.env.DB.prepare(
        `SELECT email FROM users WHERE id = ?`,
      )
        .bind(visit.user_id)
        .first<User>()
        .catch(() => null);
      userEmail = user?.email || null;
    }
  } catch (err) {
    console.error("Failed to load visit data:", err);
  }

  return {
    visit,
    messages,
    userEmail,
  };
};

export const actions: Actions = {
  reply: async ({ params, request, locals, platform }) => {
    if (!locals.user || !isWayfinder(locals.user.email)) {
      throw redirect(302, "/admin/login");
    }

    if (!platform?.env?.DB) {
      return fail(500, { error: "Database not available." });
    }

    const formData = await request.formData();
    const content = (formData.get("content") as string)?.trim();

    if (!content || content.length < 1) {
      return fail(400, { error: "Please enter a reply." });
    }

    // Get visit with email
    const visit = await platform.env.DB.prepare(
      `SELECT id, visit_number, subject, user_id, guest_email FROM porch_visits WHERE id = ?`,
    )
      .bind(params.id)
      .first<Visit>();

    if (!visit) {
      return fail(404, { error: "Visit not found." });
    }

    // Get recipient email
    let recipientEmail = visit.guest_email;
    if (visit.user_id && !recipientEmail) {
      const user = await platform.env.DB.prepare(
        `SELECT email FROM users WHERE id = ?`,
      )
        .bind(visit.user_id)
        .first<User>();
      recipientEmail = user?.email || null;
    }

    const messageId = generateId();
    const now = Math.floor(Date.now() / 1000);

    try {
      // Insert message
      await platform.env.DB.prepare(
        `INSERT INTO porch_messages (id, visit_id, sender_type, sender_name, content, created_at)
				 VALUES (?, ?, ?, ?, ?, ?)`,
      )
        .bind(messageId, visit.id, "autumn", "Autumn", content, now)
        .run();

      // Update visit - mark as pending (waiting for user response)
      await platform.env.DB.prepare(
        `UPDATE porch_visits SET updated_at = ?, status = 'pending' WHERE id = ?`,
      )
        .bind(now, visit.id)
        .run();
    } catch (err) {
      console.error("Failed to save reply:", err);
      return fail(500, { error: "Failed to send reply. Please try again." });
    }

    // Email reply to visitor via Zephyr
    // IMPORTANT: Errors are now RETURNED, not swallowed (fixes silent failure bug)
    let emailFailed = false;
    let emailError: string | undefined;

    if (recipientEmail) {
      const emailResult = await sendPorchReply(
        recipientEmail,
        {
          content,
          visitId: visit.id,
          visitNumber: visit.visit_number,
          subject: visit.subject,
          visitorName: visit.guest_name || undefined,
        },
        {
          correlationId: visit.id,
        },
      );

      if (!emailResult.success) {
        // Error is RETURNED to caller, not swallowed
        console.error("Porch reply email failed:", emailResult.error);
        emailFailed = true;
        emailError = emailResult.error?.message;
      }
    }

    // Return success with email status so UI can inform admin
    return {
      replySuccess: true,
      emailFailed,
      emailError,
      noRecipient: !recipientEmail,
    };
  },

  updateStatus: async ({ params, request, locals, platform }) => {
    if (!locals.user || !isWayfinder(locals.user.email)) {
      throw redirect(302, "/admin/login");
    }

    if (!platform?.env?.DB) {
      return fail(500, { error: "Database not available." });
    }

    const formData = await request.formData();
    const status = formData.get("status") as string;

    if (!["open", "pending", "resolved"].includes(status)) {
      return fail(400, { error: "Invalid status." });
    }

    const now = Math.floor(Date.now() / 1000);

    try {
      if (status === "resolved") {
        await platform.env.DB.prepare(
          `UPDATE porch_visits SET status = ?, updated_at = ?, resolved_at = ?, resolved_by = ? WHERE id = ?`,
        )
          .bind(status, now, now, locals.user.id, params.id)
          .run();
      } else {
        await platform.env.DB.prepare(
          `UPDATE porch_visits SET status = ?, updated_at = ?, resolved_at = NULL, resolved_by = NULL WHERE id = ?`,
        )
          .bind(status, now, params.id)
          .run();
      }
    } catch (err) {
      console.error("Failed to update status:", err);
      return fail(500, { error: "Failed to update status." });
    }

    return { statusSuccess: true };
  },

  saveNotes: async ({ params, request, locals, platform }) => {
    if (!locals.user || !isWayfinder(locals.user.email)) {
      throw redirect(302, "/admin/login");
    }

    if (!platform?.env?.DB) {
      return fail(500, { error: "Database not available." });
    }

    const formData = await request.formData();
    const notes = (formData.get("notes") as string) || "";

    const now = Math.floor(Date.now() / 1000);

    try {
      await platform.env.DB.prepare(
        `UPDATE porch_visits SET admin_notes = ?, updated_at = ? WHERE id = ?`,
      )
        .bind(notes, now, params.id)
        .run();
    } catch (err) {
      console.error("Failed to save notes:", err);
      return fail(500, { error: "Failed to save notes." });
    }

    return { notesSuccess: true };
  },
};
