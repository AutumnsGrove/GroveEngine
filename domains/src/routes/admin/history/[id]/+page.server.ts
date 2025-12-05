import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';
import { getSearchJob, getJobResults } from '$lib/server/db';

export const load: PageServerLoad = async ({ params, platform }) => {
	if (!platform?.env?.DB) {
		throw error(500, 'Database not available');
	}

	const job = await getSearchJob(platform.env.DB, params.id);

	if (!job) {
		throw error(404, 'Job not found');
	}

	const results = await getJobResults(platform.env.DB, params.id);

	return { job, results };
};
