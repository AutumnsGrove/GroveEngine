import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Redirect /legal/refund-policy to /legal/refund
export const GET: RequestHandler = () => {
	redirect(301, '/legal/refund');
};
