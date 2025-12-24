import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Prerender this redirect at build time
export const prerender = true;

// Redirect /legal/refund-policy to /legal/refund
export const GET: RequestHandler = () => {
	redirect(301, '/legal/refund');
};
