import type { Handle } from '@sveltejs/kit';
import { getUserById } from '$lib/server/db';

interface SessionRow {
	id: string;
	user_id: string;
	expires_at: string;
}

export const handle: Handle = async ({ event, resolve }) => {
	// Initialize user as null
	event.locals.user = null;

	// Check for session cookie
	const sessionId = event.cookies.get('session');
	if (!sessionId || !event.platform?.env?.DB) {
		return resolve(event);
	}

	try {
		const db = event.platform.env.DB;

		// Get session and check if it's valid
		const session = await db
			.prepare('SELECT * FROM sessions WHERE id = ? AND expires_at > datetime("now")')
			.bind(sessionId)
			.first<SessionRow>();

		if (!session) {
			// Clear invalid session cookie
			event.cookies.delete('session', { path: '/' });
			return resolve(event);
		}

		// Get user
		const user = await getUserById(db, session.user_id);

		if (user) {
			event.locals.user = {
				id: user.id,
				email: user.email,
				is_admin: user.is_admin
			};
		}
	} catch (error) {
		console.error('[Auth Hook Error]', error);
	}

	return resolve(event);
};
