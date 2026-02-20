import type { LayoutServerLoad } from "./$types";
import { loadChannelMessages } from "@autumnsgrove/lattice/services";

export const load: LayoutServerLoad = async ({ platform, locals }) => {
	const db = platform?.env?.DB;

	const messages = db ? await loadChannelMessages(db, "meadow").catch(() => []) : [];

	// Resolve user's subdomain for "My Grove" link
	// locals.user.id is the Heartwood user ID → maps to users.groveauth_id → users.tenant_id → tenants.id
	let userSubdomain: string | null = null;
	if (db && locals.user) {
		try {
			const row = await db
				.prepare(
					`SELECT t.subdomain FROM users u
           JOIN tenants t ON u.tenant_id = t.id
           WHERE u.groveauth_id = ? AND t.active = 1 LIMIT 1`,
				)
				.bind(locals.user.id)
				.first<{ subdomain: string }>();
			userSubdomain = row?.subdomain ?? null;
		} catch {
			// Non-critical — "My Grove" link will just not appear
		}
	}

	return {
		messages,
		user: locals.user,
		userSubdomain,
	};
};
