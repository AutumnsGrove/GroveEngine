import { redirect } from '@sveltejs/kit';
import type { RequestHandler, EntryGenerator } from './$types';
import { allDocs } from '$lib/data/knowledge-base';

// Prerender all help article redirects at build time
export const prerender = true;

// Generate entries for all help articles
export const entries: EntryGenerator = () => {
	return allDocs
		.filter((doc) => doc.category === 'help')
		.map((doc) => ({
			slug: doc.slug
		}));
};

// Redirect /help/[slug] to /knowledge/help/[slug]
export const GET: RequestHandler = ({ params }) => {
	redirect(301, `/knowledge/help/${params.slug}`);
};
