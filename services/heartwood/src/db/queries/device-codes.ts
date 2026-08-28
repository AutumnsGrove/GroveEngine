import type { DeviceCode, D1DatabaseOrSession } from "../../types.js";
import { generateUUID } from "../../utils/crypto.js";

export async function createDeviceCode(
	db: D1DatabaseOrSession,
	data: {
		device_code_hash: string;
		user_code: string;
		client_id: string;
		scope?: string;
		expires_at: number;
		interval: number;
	},
): Promise<string> {
	const id = generateUUID();
	const now = Math.floor(Date.now() / 1000);

	await db
		.prepare(
			`INSERT INTO device_codes (id, device_code_hash, user_code, client_id, scope, expires_at, interval, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		)
		.bind(
			id,
			data.device_code_hash,
			data.user_code,
			data.client_id,
			data.scope || null,
			data.expires_at,
			data.interval,
			now,
		)
		.run();

	return id;
}

export async function getDeviceCodeByUserCode(
	db: D1DatabaseOrSession,
	userCode: string,
): Promise<DeviceCode | null> {
	const normalizedCode = userCode.replace(/[-\s]/g, "").toUpperCase();

	const formattedCode =
		normalizedCode.length === 8
			? `${normalizedCode.slice(0, 4)}-${normalizedCode.slice(4)}`
			: userCode;

	const result = await db
		.prepare("SELECT * FROM device_codes WHERE user_code = ? OR user_code = ?")
		.bind(formattedCode, userCode)
		.first<DeviceCode>();

	return result;
}

export async function getDeviceCodeByHash(
	db: D1DatabaseOrSession,
	deviceCodeHash: string,
): Promise<DeviceCode | null> {
	const result = await db
		.prepare("SELECT * FROM device_codes WHERE device_code_hash = ?")
		.bind(deviceCodeHash)
		.first<DeviceCode>();

	return result;
}

export async function authorizeDeviceCode(
	db: D1DatabaseOrSession,
	id: string,
	userId: string,
): Promise<void> {
	await db
		.prepare(`UPDATE device_codes SET status = 'authorized', user_id = ? WHERE id = ?`)
		.bind(userId, id)
		.run();
}

export async function denyDeviceCode(db: D1DatabaseOrSession, id: string): Promise<void> {
	await db.prepare(`UPDATE device_codes SET status = 'denied' WHERE id = ?`).bind(id).run();
}

export async function updateDevicePollCount(
	db: D1DatabaseOrSession,
	id: string,
): Promise<DeviceCode | null> {
	const now = Math.floor(Date.now() / 1000);

	await db
		.prepare(`UPDATE device_codes SET poll_count = poll_count + 1, last_poll_at = ? WHERE id = ?`)
		.bind(now, id)
		.run();

	return db.prepare("SELECT * FROM device_codes WHERE id = ?").bind(id).first<DeviceCode>();
}

export async function incrementDeviceInterval(
	db: D1DatabaseOrSession,
	id: string,
	incrementBy: number,
): Promise<void> {
	await db
		.prepare(`UPDATE device_codes SET interval = interval + ? WHERE id = ?`)
		.bind(incrementBy, id)
		.run();
}

export async function expireDeviceCode(db: D1DatabaseOrSession, id: string): Promise<void> {
	await db.prepare(`UPDATE device_codes SET status = 'expired' WHERE id = ?`).bind(id).run();
}

export async function isUserCodeUnique(
	db: D1DatabaseOrSession,
	userCode: string,
): Promise<boolean> {
	const result = await db
		.prepare("SELECT 1 FROM device_codes WHERE user_code = ?")
		.bind(userCode)
		.first();

	return result === null;
}

export async function cleanupExpiredDeviceCodes(db: D1DatabaseOrSession): Promise<void> {
	const now = Math.floor(Date.now() / 1000);
	await db.prepare("DELETE FROM device_codes WHERE expires_at < ?").bind(now).run();
}

export async function deleteDeviceCode(db: D1DatabaseOrSession, id: string): Promise<void> {
	await db.prepare("DELETE FROM device_codes WHERE id = ?").bind(id).run();
}

/**
 * Atomically consume an authorized device code in one statement: only
 * succeeds if the row is still `authorized`, and deletes it as part of the
 * same query. A separate read-then-delete (the previous shape) left a
 * window where two concurrent polls could both observe `authorized` and
 * both go on to mint a full token pair before either delete landed.
 * Returns null if the code was already consumed (or was never authorized),
 * which the caller treats as "someone already claimed this code."
 */
export async function consumeDeviceCode(
	db: D1DatabaseOrSession,
	id: string,
): Promise<DeviceCode | null> {
	return db
		.prepare(`DELETE FROM device_codes WHERE id = ? AND status = 'authorized' RETURNING *`)
		.bind(id)
		.first<DeviceCode>();
}
