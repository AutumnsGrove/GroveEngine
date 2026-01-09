import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

interface Subscriber {
  id: number;
  email: string;
  created_at: string;
  unsubscribed_at: string | null;
}

interface CountResult {
  count: number;
}

export const load: PageServerLoad = async ({ locals, platform }) => {
	if (!locals.user) {
		throw error(401, 'Unauthorized');
	}

	if (!platform?.env?.DB) {
		throw error(500, 'Database not available');
	}

	const { DB } = platform.env;

	try {
		// Get all email signups (excluding unsubscribed)
		const activeSubscribers = await DB.prepare(
			'SELECT * FROM email_signups WHERE unsubscribed_at IS NULL ORDER BY created_at DESC'
		).all<Subscriber>();

		// Get unsubscribed count
		const unsubscribedCount = await DB.prepare(
			'SELECT COUNT(*) as count FROM email_signups WHERE unsubscribed_at IS NOT NULL'
		).first<CountResult>();

		return {
			subscribers: activeSubscribers.results || [],
			totalActive: activeSubscribers.results?.length || 0,
			totalUnsubscribed: unsubscribedCount?.count || 0
		};
	} catch (err) {
		console.error('[Subscribers Error]', err);
		throw error(500, 'Failed to load subscribers');
	}
};
