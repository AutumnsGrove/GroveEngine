/**
 * Comped Invites - Business Logic Service
 *
 * Handles CRUD operations, audit logging, email sending,
 * and bulk promotion for comped/beta invites.
 */

import { sendInviteEmail } from "$lib/server/invite-email";
import { EMAIL_RE } from "./schemas";
import { queryOne, queryMany, execute } from "@autumnsgrove/lattice/server/services/database";

// ============================================================================
// Types
// ============================================================================

export interface CompedInvite {
	id: string;
	email: string;
	tier: string;
	invite_type: "comped" | "beta";
	custom_message: string | null;
	invited_by: string;
	invite_token: string;
	created_at: number;
	used_at: number | null;
	used_by_tenant_id: string | null;
	email_sent_at: number | null;
}

export interface AuditLogEntry {
	id: string;
	action: string;
	invite_id: string;
	email: string;
	tier: string;
	invite_type: "comped" | "beta";
	actor_email: string;
	notes: string | null;
	created_at: number;
}

export interface EligibleSubscriber {
	id: number;
	email: string;
	name: string | null;
	created_at: string;
	source: string;
}

interface EmailEnv {
	ZEPHYR_API_KEY?: string;
	RESEND_API_KEY?: string;
	ZEPHYR_URL?: string;
	ZEPHYR?: unknown;
}

// ============================================================================
// Load Data
// ============================================================================

export interface LoadFilters {
	page: number;
	pageSize: number;
	search: string;
	statusFilter: string;
	typeFilter: string;
}

export async function loadInviteData(DB: D1Database, filters: LoadFilters) {
	const { page, pageSize, search, statusFilter, typeFilter } = filters;
	const offset = (page - 1) * pageSize;

	// Build query with optional filters
	let query = "SELECT * FROM comped_invites";
	const params: (string | number)[] = [];
	const conditions: string[] = [];

	if (search) {
		conditions.push("email LIKE ?");
		params.push(`%${search}%`);
	}

	if (statusFilter === "used") {
		conditions.push("used_at IS NOT NULL");
	} else if (statusFilter === "pending") {
		conditions.push("used_at IS NULL");
	}

	if (typeFilter === "comped" || typeFilter === "beta") {
		conditions.push("invite_type = ?");
		params.push(typeFilter);
	}

	if (conditions.length > 0) {
		query += " WHERE " + conditions.join(" AND ");
	}

	query += " ORDER BY created_at DESC LIMIT ? OFFSET ?";
	params.push(pageSize, offset);

	// Build count query
	let countQuery = "SELECT COUNT(*) as count FROM comped_invites";
	const countParams: string[] = [];
	if (conditions.length > 0) {
		countQuery += " WHERE " + conditions.join(" AND ");
		if (search) countParams.push(`%${search}%`);
		if (typeFilter === "comped" || typeFilter === "beta") countParams.push(typeFilter);
	}

	// Run all queries in parallel
	const [invitesList, countResult, auditList, statsResult, eligibleList] = await Promise.all([
		queryMany<CompedInvite>(DB, query, params),
		queryOne<{ count: number }>(DB, countQuery, countParams),
		queryMany<AuditLogEntry>(
			DB,
			`SELECT * FROM comped_invites_audit ORDER BY created_at DESC LIMIT 20`,
		),
		queryOne<{ total: number; used: number; pending: number; beta: number; comped: number }>(
			DB,
			`SELECT
             COUNT(*) as total,
             COUNT(CASE WHEN used_at IS NOT NULL THEN 1 END) as used,
             COUNT(CASE WHEN used_at IS NULL THEN 1 END) as pending,
             COUNT(CASE WHEN invite_type = 'beta' THEN 1 END) as beta,
             COUNT(CASE WHEN invite_type = 'comped' THEN 1 END) as comped
           FROM comped_invites`,
		),
		// Find email subscribers who are eligible for beta promotion
		queryMany<EligibleSubscriber>(
			DB,
			`SELECT es.id, es.email, es.name, es.created_at, es.source
           FROM email_signups es
           LEFT JOIN comped_invites ci ON LOWER(es.email) = LOWER(ci.email)
           LEFT JOIN tenants t ON LOWER(es.email) = LOWER(t.email)
           WHERE es.unsubscribed_at IS NULL
             AND ci.id IS NULL
             AND t.id IS NULL
           ORDER BY es.created_at DESC`,
		),
	]);

	return {
		invites: invitesList,
		auditLog: auditList,
		eligibleSubscribers: eligibleList,
		stats: {
			total: statsResult?.total || 0,
			used: statsResult?.used || 0,
			pending: statsResult?.pending || 0,
			beta: statsResult?.beta || 0,
			comped: statsResult?.comped || 0,
		},
		pagination: {
			page,
			pageSize,
			total: countResult?.count || 0,
			totalPages: Math.ceil((countResult?.count || 0) / pageSize),
		},
	};
}

// ============================================================================
// Create Invite
// ============================================================================

export interface CreateInviteParams {
	email: string;
	tier: string;
	inviteType: string;
	customMessage: string | null;
	notes: string | null;
	actorEmail: string;
}

export async function createInvite(DB: D1Database, params: CreateInviteParams, emailEnv: EmailEnv) {
	const { email, tier, inviteType, customMessage, notes, actorEmail } = params;

	if (!EMAIL_RE.test(email)) {
		return { success: false as const, error: "Please enter a valid email address" };
	}

	let step = "check-existing";
	try {
		const existing = await queryOne<{ id: string; used_at: number | null }>(
			DB,
			"SELECT id, used_at FROM comped_invites WHERE email = ?",
			[email],
		);

		if (existing) {
			if (existing.used_at) {
				return { success: false as const, error: `${email} has already used their comped invite` };
			}
			return { success: false as const, error: `${email} already has a pending comped invite` };
		}

		step = "check-tenant";
		const existingTenant = await queryOne<{ subdomain: string }>(
			DB,
			`SELECT subdomain FROM tenants WHERE email = ?`,
			[email],
		);

		if (existingTenant) {
			return {
				success: false as const,
				error: `${email} is already a Grove user (${existingTenant.subdomain}.grove.place)`,
			};
		}

		step = "insert-invite";
		const inviteId = crypto.randomUUID();
		const inviteToken = crypto.randomUUID();
		await execute(
			DB,
			`INSERT INTO comped_invites (id, email, tier, invite_type, custom_message, invited_by, invite_token, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, unixepoch())`,
			[inviteId, email, tier, inviteType, customMessage, actorEmail, inviteToken],
		);

		step = "insert-audit";
		const auditId = crypto.randomUUID();
		await execute(
			DB,
			`INSERT INTO comped_invites_audit (id, action, invite_id, email, tier, invite_type, actor_email, notes, created_at)
         VALUES (?, 'create', ?, ?, ?, ?, ?, ?, unixepoch())`,
			[auditId, inviteId, email, tier, inviteType, actorEmail, notes],
		);

		// Send the invite email via Zephyr
		step = "send-email";
		const emailResult = await sendInviteEmailWrapped({
			email,
			tier,
			inviteType,
			customMessage,
			inviteToken,
			invitedBy: actorEmail,
			inviteId,
			DB,
			emailEnv,
		});

		const typeLabel = inviteType === "beta" ? "beta" : "comped";
		return {
			success: true as const,
			emailStatus: emailResult.status,
			emailError: emailResult.error,
			message: `Created ${typeLabel} invite for ${email} (${tier} tier)`,
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : "Unknown database error";
		console.error(`[Comped Invites] Error at step "${step}":`, message, err);
		return {
			success: false as const,
			error: `Failed to create comped invite (${step}): ${message}`,
			status: 500,
		};
	}
}

// ============================================================================
// Resend Invite
// ============================================================================

export async function resendInvite(
	DB: D1Database,
	inviteId: string,
	actorEmail: string,
	emailEnv: EmailEnv,
) {
	try {
		const invite = await queryOne<CompedInvite>(
			DB,
			"SELECT id, email, tier, invite_type, custom_message, invited_by, invite_token, used_at FROM comped_invites WHERE id = ?",
			[inviteId],
		);

		if (!invite) {
			return { success: false as const, error: "Invite not found", status: 404 };
		}

		if (invite.used_at) {
			return {
				success: false as const,
				error: "Cannot resend — this invite has already been used",
				status: 400,
			};
		}

		if (!invite.invite_token) {
			return {
				success: false as const,
				error: "Invite has no token — it may need to be recreated",
				status: 400,
			};
		}

		const zephyrApiKey = emailEnv.ZEPHYR_API_KEY || emailEnv.RESEND_API_KEY;

		if (!zephyrApiKey) {
			return {
				success: false as const,
				error: "No email API key configured — cannot send email",
				status: 500,
			};
		}

		const emailResult = await sendInviteEmail({
			email: invite.email,
			tier: invite.tier,
			inviteType: invite.invite_type,
			customMessage: invite.custom_message,
			inviteToken: invite.invite_token,
			invitedBy: invite.invited_by,
			zephyrApiKey,
			zephyrUrl: emailEnv.ZEPHYR_URL,
			zephyrBinding: emailEnv.ZEPHYR,
		});

		if (emailResult.success) {
			await execute(DB, `UPDATE comped_invites SET email_sent_at = unixepoch() WHERE id = ?`, [
				inviteId,
			]);

			// Audit the resend
			await execute(
				DB,
				`INSERT INTO comped_invites_audit (id, action, invite_id, email, tier, invite_type, actor_email, notes, created_at)
           VALUES (?, 'resend', ?, ?, ?, ?, ?, 'Email resent', unixepoch())`,
				[crypto.randomUUID(), inviteId, invite.email, invite.tier, invite.invite_type, actorEmail],
			);

			return {
				success: true as const,
				emailStatus: "sent" as const,
				message: `Resent invite email to ${invite.email}`,
			};
		} else {
			console.error(`[Comped Invites] Resend failed for ${invite.email}:`, emailResult.error);
			return {
				success: true as const,
				emailStatus: "failed" as const,
				emailError: emailResult.error,
				message: `Resend attempted for ${invite.email}, but email delivery failed`,
			};
		}
	} catch (err) {
		const message = err instanceof Error ? err.message : "Unknown error";
		console.error("[Comped Invites] Error resending invite:", message, err);
		return {
			success: false as const,
			error: `Failed to resend invite email: ${message}`,
			status: 500,
		};
	}
}

// ============================================================================
// Revoke Invite
// ============================================================================

export async function revokeInvite(
	DB: D1Database,
	inviteId: string,
	notes: string | null,
	actorEmail: string,
) {
	try {
		const invite = await queryOne<CompedInvite>(
			DB,
			"SELECT id, email, tier, invite_type, used_at FROM comped_invites WHERE id = ?",
			[inviteId],
		);

		if (!invite) {
			return { success: false as const, error: "Invite not found", status: 404 };
		}

		if (invite.used_at) {
			return {
				success: false as const,
				error: "Cannot revoke an invite that has already been used",
				status: 400,
			};
		}

		await execute(DB, "DELETE FROM comped_invites WHERE id = ?", [inviteId]);

		const auditId = crypto.randomUUID();
		await execute(
			DB,
			`INSERT INTO comped_invites_audit (id, action, invite_id, email, tier, invite_type, actor_email, notes, created_at)
         VALUES (?, 'revoke', ?, ?, ?, ?, ?, ?, unixepoch())`,
			[auditId, inviteId, invite.email, invite.tier, invite.invite_type, actorEmail, notes],
		);

		return {
			success: true as const,
			message: `Revoked comped invite for ${invite.email}`,
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : "Unknown database error";
		console.error("[Comped Invites] Error revoking invite:", message, err);
		return {
			success: false as const,
			error: `Failed to revoke comped invite: ${message}`,
			status: 500,
		};
	}
}

// ============================================================================
// Promote Subscriber
// ============================================================================

export interface PromoteParams {
	email: string;
	tier: string;
	customMessage: string | null;
	actorEmail: string;
}

export async function promoteSubscriber(DB: D1Database, params: PromoteParams, emailEnv: EmailEnv) {
	const { email, tier, customMessage, actorEmail } = params;

	if (!EMAIL_RE.test(email)) {
		return { success: false as const, error: "Invalid email address" };
	}

	let step = "check-subscriber";
	try {
		// Verify subscriber exists in email list
		const subscriber = await queryOne<{ id: number; email: string }>(
			DB,
			"SELECT id, email FROM email_signups WHERE LOWER(email) = LOWER(?) AND unsubscribed_at IS NULL",
			[email],
		);

		if (!subscriber) {
			return { success: false as const, error: `${email} is not an active email subscriber` };
		}

		// Check they don't already have an invite
		step = "check-existing";
		const existing = await queryOne<{ id: string; used_at: number | null }>(
			DB,
			"SELECT id, used_at FROM comped_invites WHERE LOWER(email) = LOWER(?)",
			[email],
		);

		if (existing) {
			if (existing.used_at) {
				return { success: false as const, error: `${email} has already used their invite` };
			}
			return { success: false as const, error: `${email} already has a pending invite` };
		}

		// Check they're not already a Grove user
		step = "check-tenant";
		const existingTenant = await queryOne<{ subdomain: string }>(
			DB,
			"SELECT subdomain FROM tenants WHERE LOWER(email) = LOWER(?)",
			[email],
		);

		if (existingTenant) {
			return {
				success: false as const,
				error: `${email} is already a Grove user (${existingTenant.subdomain}.grove.place)`,
			};
		}

		// Create the beta invite
		step = "insert-invite";
		const inviteId = crypto.randomUUID();
		const inviteToken = crypto.randomUUID();
		await execute(
			DB,
			`INSERT INTO comped_invites (id, email, tier, invite_type, custom_message, invited_by, invite_token, created_at)
         VALUES (?, ?, ?, 'beta', ?, ?, ?, unixepoch())`,
			[inviteId, email, tier, customMessage, actorEmail, inviteToken],
		);

		// Audit log
		step = "insert-audit";
		await execute(
			DB,
			`INSERT INTO comped_invites_audit (id, action, invite_id, email, tier, invite_type, actor_email, notes, created_at)
         VALUES (?, 'create', ?, ?, ?, 'beta', ?, 'Promoted from email list', unixepoch())`,
			[crypto.randomUUID(), inviteId, email, tier, actorEmail],
		);

		// Send the invite email
		step = "send-email";
		const emailResult = await sendInviteEmailWrapped({
			email,
			tier,
			inviteType: "beta",
			customMessage,
			inviteToken,
			invitedBy: actorEmail,
			inviteId,
			DB,
			emailEnv,
		});

		return {
			success: true as const,
			emailStatus: emailResult.status,
			emailError: emailResult.error,
			message: `Promoted ${email} to beta (${tier} tier)`,
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : "Unknown database error";
		console.error(`[Comped Invites] Error promoting subscriber at step "${step}":`, message, err);
		return {
			success: false as const,
			error: `Failed to promote subscriber (${step}): ${message}`,
			status: 500,
		};
	}
}

// ============================================================================
// Bulk Promote
// ============================================================================

export interface BulkPromoteParams {
	tier: string;
	customMessage: string | null;
	actorEmail: string;
}

export async function bulkPromoteSubscribers(
	DB: D1Database,
	params: BulkPromoteParams,
	emailEnv: EmailEnv,
) {
	const { tier, customMessage, actorEmail } = params;

	// Cap batch size to avoid worker timeout (4 async ops per subscriber)
	const BATCH_LIMIT = 50;

	try {
		// Find eligible subscribers (capped to avoid worker timeout)
		const subscribers = await queryMany<{ id: number; email: string }>(
			DB,
			`SELECT es.id, es.email
         FROM email_signups es
         LEFT JOIN comped_invites ci ON LOWER(es.email) = LOWER(ci.email)
         LEFT JOIN tenants t ON LOWER(es.email) = LOWER(t.email)
         WHERE es.unsubscribed_at IS NULL
           AND ci.id IS NULL
           AND t.id IS NULL
         ORDER BY es.created_at ASC
         LIMIT ?`,
			[BATCH_LIMIT],
		);
		if (subscribers.length === 0) {
			return { success: false as const, error: "No eligible subscribers to promote", status: 400 };
		}

		const zephyrApiKey = emailEnv.ZEPHYR_API_KEY || emailEnv.RESEND_API_KEY;

		let promoted = 0;
		let emailsSent = 0;
		let emailsFailed = 0;
		const errors: string[] = [];

		for (const sub of subscribers) {
			const inviteId = crypto.randomUUID();
			const inviteToken = crypto.randomUUID();

			try {
				// Create the invite (OR IGNORE handles race if already promoted)
				const insertResult = await execute(
					DB,
					`INSERT OR IGNORE INTO comped_invites (id, email, tier, invite_type, custom_message, invited_by, invite_token, created_at)
             VALUES (?, ?, ?, 'beta', ?, ?, ?, unixepoch())`,
					[inviteId, sub.email, tier, customMessage, actorEmail, inviteToken],
				);

				// Skip if already promoted by a concurrent request
				if (insertResult.meta.changes === 0) {
					continue;
				}

				// Audit log
				await execute(
					DB,
					`INSERT INTO comped_invites_audit (id, action, invite_id, email, tier, invite_type, actor_email, notes, created_at)
             VALUES (?, 'create', ?, ?, ?, 'beta', ?, 'Bulk promoted from email list', unixepoch())`,
					[crypto.randomUUID(), inviteId, sub.email, tier, actorEmail],
				);

				promoted++;

				// Send the invite email
				if (zephyrApiKey) {
					const emailResult = await sendInviteEmail({
						email: sub.email,
						tier,
						inviteType: "beta",
						customMessage,
						inviteToken,
						invitedBy: actorEmail,
						zephyrApiKey,
						zephyrUrl: emailEnv.ZEPHYR_URL,
						zephyrBinding: emailEnv.ZEPHYR,
					});

					if (emailResult.success) {
						emailsSent++;
						await execute(
							DB,
							`UPDATE comped_invites SET email_sent_at = unixepoch() WHERE id = ?`,
							[inviteId],
						);
					} else {
						emailsFailed++;
						console.error(
							`[Comped Invites] Bulk email failed for ${sub.email}:`,
							emailResult.error,
						);
					}
				}
			} catch (err) {
				const message = err instanceof Error ? err.message : "Unknown error";
				errors.push(`${sub.email}: ${message}`);
				console.error(`[Comped Invites] Bulk promote error for ${sub.email}:`, message);
			}
		}

		const emailNote = zephyrApiKey
			? ` (${emailsSent} emails sent${emailsFailed > 0 ? `, ${emailsFailed} failed` : ""})`
			: " (no email API key configured — emails not sent)";

		const errorNote = errors.length > 0 ? ` (${errors.length} failed)` : "";

		return {
			success: true as const,
			emailStatus:
				emailsFailed > 0
					? ("partial" as const)
					: emailsSent > 0
						? ("sent" as const)
						: ("not-configured" as const),
			message: `Promoted ${promoted} of ${subscribers.length} subscribers to beta (${tier} tier)${errorNote}${emailNote}`,
			promoteErrors: errors.length > 0 ? errors : undefined,
		};
	} catch (err) {
		const message = err instanceof Error ? err.message : "Unknown database error";
		console.error("[Comped Invites] Error in bulk promote:", message, err);
		return {
			success: false as const,
			error: `Failed to bulk promote subscribers: ${message}`,
			status: 500,
		};
	}
}

// ============================================================================
// Internal Helpers
// ============================================================================

async function sendInviteEmailWrapped(opts: {
	email: string;
	tier: string;
	inviteType: string;
	customMessage: string | null;
	inviteToken: string;
	invitedBy: string;
	inviteId: string;
	DB: D1Database;
	emailEnv: EmailEnv;
}): Promise<{ status: "sent" | "failed" | "not-configured"; error?: string }> {
	const zephyrApiKey = opts.emailEnv.ZEPHYR_API_KEY || opts.emailEnv.RESEND_API_KEY;

	if (!zephyrApiKey) {
		console.warn(
			"[Comped Invites] No ZEPHYR_API_KEY configured — invite created but email not sent",
		);
		return { status: "not-configured" };
	}

	const emailResult = await sendInviteEmail({
		email: opts.email,
		tier: opts.tier,
		inviteType: opts.inviteType,
		customMessage: opts.customMessage,
		inviteToken: opts.inviteToken,
		invitedBy: opts.invitedBy,
		zephyrApiKey,
		zephyrUrl: opts.emailEnv.ZEPHYR_URL,
		zephyrBinding: opts.emailEnv.ZEPHYR,
	});

	if (emailResult.success) {
		await execute(opts.DB, `UPDATE comped_invites SET email_sent_at = unixepoch() WHERE id = ?`, [
			opts.inviteId,
		]);
		return { status: "sent" };
	} else {
		console.error(`[Comped Invites] Email send failed for ${opts.email}:`, emailResult.error);
		return { status: "failed", error: emailResult.error };
	}
}
