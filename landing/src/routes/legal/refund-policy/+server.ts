import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Prerender this redirect at build time
export const prerender = true;

// Redirect /legal/refund-policy to /knowledge/legal/refund-policy
export const GET: RequestHandler = () => {
	redirect(301, '/knowledge/legal/refund-policy');
};
