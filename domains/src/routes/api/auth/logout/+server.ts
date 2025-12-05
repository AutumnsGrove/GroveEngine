// Logout
// POST /api/auth/logout

import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { deleteSession } from '$lib/server/db';

export const POST: RequestHandler = async ({ cookies, platform }) => {
	const sessionId = cookies.get('session');

	if (sessionId && platform?.env?.DB) {
		try {
			await deleteSession(platform.env.DB, sessionId);
		} catch (err) {
			console.error('[Logout Error]', err);
		}
	}

	cookies.delete('session', { path: '/' });

	return json({ success: true });
};
