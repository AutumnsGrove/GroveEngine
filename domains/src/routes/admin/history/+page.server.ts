import type { PageServerLoad } from './$types';
import { listSearchJobs } from '$lib/server/db';

export const load: PageServerLoad = async ({ platform }) => {
	if (!platform?.env?.DB) {
		return { jobs: [], total: 0 };
	}

	const { jobs, total } = await listSearchJobs(platform.env.DB, { limit: 50 });

	return { jobs, total };
};
