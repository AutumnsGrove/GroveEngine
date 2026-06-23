import type { User, D1DatabaseOrSession } from "../../types.js";
import { generateUUID } from "../../utils/crypto.js";

export async function getUserById(db: D1DatabaseOrSession, id: string): Promise<User | null> {
	const result = await db.prepare("SELECT * FROM users WHERE id = ?").bind(id).first<User>();
	return result;
}

export async function getUserByEmail(db: D1DatabaseOrSession, email: string): Promise<User | null> {
	const result = await db
		.prepare("SELECT * FROM users WHERE email = ?")
		.bind(email.toLowerCase())
		.first<User>();
	return result;
}

export async function createUser(
	db: D1DatabaseOrSession,
	data: {
		email: string;
		name: string | null;
		avatar_url: string | null;
		provider: string;
		provider_id: string | null;
	},
): Promise<User> {
	const id = generateUUID();
	const now = new Date().toISOString();

	await db
		.prepare(
			`INSERT INTO users (id, email, name, avatar_url, provider, provider_id, created_at, last_login)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
		)
		.bind(
			id,
			data.email.toLowerCase(),
			data.name,
			data.avatar_url,
			data.provider,
			data.provider_id,
			now,
			now,
		)
		.run();

	return (await getUserById(db, id))!;
}

export async function updateUserLogin(
	db: D1DatabaseOrSession,
	id: string,
	data: { name?: string | null; avatar_url?: string | null },
): Promise<void> {
	const now = new Date().toISOString();

	await db
		.prepare(
			`UPDATE users SET name = COALESCE(?, name), avatar_url = COALESCE(?, avatar_url), last_login = ? WHERE id = ?`,
		)
		.bind(data.name, data.avatar_url, now, id)
		.run();
}

export async function updateUserAvatar(
	db: D1DatabaseOrSession,
	id: string,
	avatarUrl: string | null,
): Promise<void> {
	await db.prepare(`UPDATE users SET avatar_url = ? WHERE id = ?`).bind(avatarUrl, id).run();
}

export async function updateUserPreferences(
	db: D1DatabaseOrSession,
	id: string,
	preferences: { theme?: string | null; grove_mode?: boolean | null; season?: string | null },
): Promise<void> {
	const sets: string[] = [];
	const values: unknown[] = [];

	if ("theme" in preferences) {
		sets.push("theme = ?");
		values.push(preferences.theme);
	}
	if ("grove_mode" in preferences) {
		sets.push("grove_mode = ?");
		values.push(preferences.grove_mode === null ? null : preferences.grove_mode ? 1 : 0);
	}
	if ("season" in preferences) {
		sets.push("season = ?");
		values.push(preferences.season);
	}

	if (sets.length === 0) return;

	values.push(id);
	await db
		.prepare(`UPDATE users SET ${sets.join(", ")} WHERE id = ?`)
		.bind(...values)
		.run();
}

export async function getOrCreateUser(
	db: D1DatabaseOrSession,
	data: {
		email: string;
		name: string | null;
		avatar_url: string | null;
		provider: string;
		provider_id: string | null;
	},
): Promise<User> {
	const existing = await getUserByEmail(db, data.email);

	if (existing) {
		await updateUserLogin(db, existing.id, {
			name: data.name,
			avatar_url: data.avatar_url,
		});
		return (await getUserById(db, existing.id))!;
	}

	return createUser(db, data);
}
