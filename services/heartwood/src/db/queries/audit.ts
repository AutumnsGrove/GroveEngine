import { logGroveError } from "@autumnsgrove/lattice/errors";
import { HW_SVC_ERRORS } from "../../errors.js";
import type {
	AuditEventType,
	SubscriptionAuditEventType,
	D1DatabaseOrSession,
} from "../../types.js";
import { generateUUID } from "../../utils/crypto.js";

const MIN_AUDIT_RETENTION_DAYS = 30;

export async function createAuditLog(
	db: D1DatabaseOrSession,
	data: {
		event_type: AuditEventType;
		user_id?: string;
		client_id?: string;
		ip_address?: string;
		user_agent?: string;
		details?: Record<string, unknown>;
	},
): Promise<void> {
	const id = generateUUID();

	await db
		.prepare(
			`INSERT INTO audit_log (id, event_type, user_id, client_id, ip_address, user_agent, details)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
		)
		.bind(
			id,
			data.event_type,
			data.user_id || null,
			data.client_id || null,
			data.ip_address || null,
			data.user_agent || null,
			data.details ? JSON.stringify(data.details) : null,
		)
		.run();
}

export async function cleanupOldAuditLogs(
	db: D1DatabaseOrSession,
	retentionDays: number = 90,
): Promise<number> {
	if (retentionDays < MIN_AUDIT_RETENTION_DAYS) {
		logGroveError("Heartwood", HW_SVC_ERRORS.INVALID_AUDIT_RETENTION, {
			detail: `retentionDays=${retentionDays}, minimum=${MIN_AUDIT_RETENTION_DAYS}`,
		});
		throw new Error(HW_SVC_ERRORS.INVALID_AUDIT_RETENTION.userMessage);
	}

	const cutoffDate = new Date();
	cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
	const cutoffIso = cutoffDate.toISOString();

	const result = await db
		.prepare("DELETE FROM audit_log WHERE created_at < ?")
		.bind(cutoffIso)
		.run();

	return result.meta?.changes ?? 0;
}

export async function createSubscriptionAuditLog(
	db: D1DatabaseOrSession,
	data: {
		user_id: string;
		event_type: SubscriptionAuditEventType;
		old_value?: string;
		new_value?: string;
	},
): Promise<void> {
	const id = generateUUID();
	await db
		.prepare(
			`INSERT INTO subscription_audit_log (id, user_id, event_type, old_value, new_value) VALUES (?, ?, ?, ?, ?)`,
		)
		.bind(id, data.user_id, data.event_type, data.old_value || null, data.new_value || null)
		.run();
}
