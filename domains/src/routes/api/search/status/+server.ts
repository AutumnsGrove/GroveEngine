// Get Domain Search Status
// GET /api/search/status?job_id=xxx

import { json, error } from '@sveltejs/kit';
import type { RequestHandler } from './$types';
import { getSearchJob, getJobResults } from '$lib/server/db';

export const GET: RequestHandler = async ({ url, locals, platform }) => {
	// Check authentication
	if (!locals.user?.is_admin) {
		throw error(401, 'Unauthorized');
	}

	if (!platform?.env?.DB) {
		throw error(500, 'Database not available');
	}

	const jobId = url.searchParams.get('job_id');
	if (!jobId) {
		throw error(400, 'job_id is required');
	}

	try {
		const job = await getSearchJob(platform.env.DB, jobId);
		if (!job) {
			throw error(404, 'Job not found');
		}

		const results = await getJobResults(platform.env.DB, jobId);

		return json({
			job,
			results
		});
	} catch (err) {
		console.error('[Get Status Error]', err);
		if (err instanceof Error && 'status' in err) {
			throw err;
		}
		throw error(500, 'Failed to get job status');
	}
};
