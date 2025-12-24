import { redirect } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// Redirect /help/[slug] to /knowledge/help/[slug]
export const GET: RequestHandler = ({ params }) => {
	redirect(301, `/knowledge/help/${params.slug}`);
};
