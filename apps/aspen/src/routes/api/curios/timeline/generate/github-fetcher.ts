/**
 * Timeline Curio - GitHub API Helpers
 *
 * Handles fetching commits and stats from the GitHub API
 * with concurrent batching and two-tier repo discovery.
 */

import type { Commit } from "@autumnsgrove/curios/timeline";

/** Maximum concurrent GitHub API requests to avoid rate limiting */
const CONCURRENCY_LIMIT = 5;

/**
 * Run async functions with limited concurrency.
 * Processes items in batches of `limit` size for controlled parallelism.
 */
export async function runWithConcurrency<T, R>(
	items: T[],
	fn: (item: T) => Promise<R>,
	limit: number = CONCURRENCY_LIMIT,
): Promise<R[]> {
	const results: R[] = [];

	for (let i = 0; i < items.length; i += limit) {
		const batch = items.slice(i, i + limit);
		const batchResults = await Promise.all(batch.map(fn));
		results.push(...batchResults);
	}

	return results;
}

interface GitHubRepo {
	name: string;
	full_name: string;
	fork: boolean;
	pushed_at: string;
}

interface GitHubCommitDetail {
	sha: string;
	commit: {
		message: string;
		author: {
			date: string;
			name: string;
			email: string;
		};
	};
	stats?: {
		additions: number;
		deletions: number;
	};
}

/**
 * Fetch commits from GitHub for a specific date using the Commits API.
 *
 * Uses a two-tier strategy:
 * 1. Fast path: If timeline_activity has repos_active for this date (from backfill),
 *    use those repos directly — skips GitHub repo discovery.
 * 2. Slow path: Discover repos via /users/{username}/repos, then query each.
 */
export async function fetchGitHubCommits(
	username: string,
	token: string,
	date: string,
	includeRepos: string[] | null,
	excludeRepos: string[] | null,
	db: D1Database,
	tenantId: string,
): Promise<Commit[]> {
	let repoFullNames: string[] = [];

	// Fast path: check if backfill already recorded which repos had activity
	try {
		const activity = await db
			.prepare(
				`SELECT repos_active FROM timeline_activity
         WHERE tenant_id = ? AND activity_date = ?`,
			)
			.bind(tenantId, date)
			.first<{ repos_active: string }>();

		if (activity?.repos_active) {
			const repoNames = JSON.parse(activity.repos_active) as string[];
			repoFullNames = repoNames.map((name) => `${username}/${name}`);
			console.log(`Fast path: using ${repoFullNames.length} repos from backfill data`);
		}
	} catch {
		// Non-fatal: fall through to slow path
	}

	// Slow path: discover repos from GitHub API
	if (repoFullNames.length === 0) {
		const repos = await fetchUserRepos(username, token, includeRepos, excludeRepos);
		repoFullNames = repos.map((r) => r.full_name);
		console.log(`Slow path: discovered ${repoFullNames.length} repos from GitHub API`);
	}

	// Filter repos by include/exclude lists
	const filteredRepos = repoFullNames.filter((repoFullName) => {
		const repoName = repoFullName.split("/")[1];
		if (includeRepos && !includeRepos.includes(repoName)) return false;
		if (excludeRepos && excludeRepos.includes(repoName)) return false;
		return true;
	});

	// Fetch commits from repos in parallel
	const commitArrays = await runWithConcurrency(filteredRepos, (repoFullName) =>
		fetchRepoCommitsForDate(repoFullName, username, token, date),
	);
	const allCommits = commitArrays.flat();

	return allCommits;
}

/**
 * Fetch user's repositories, filtered by include/exclude lists.
 */
async function fetchUserRepos(
	username: string,
	token: string,
	includeRepos: string[] | null,
	excludeRepos: string[] | null,
): Promise<GitHubRepo[]> {
	const response = await fetch(
		`https://api.github.com/users/${username}/repos?per_page=100&sort=pushed&type=owner`,
		{
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: "application/vnd.github.v3+json",
				"User-Agent": "Lattice-Timeline-Curio",
			},
		},
	);

	if (!response.ok) {
		throw new Error(`Failed to fetch repos: ${response.status}`);
	}

	let repos = (await response.json()) as GitHubRepo[];

	if (includeRepos) {
		repos = repos.filter((r) => includeRepos.includes(r.name));
	}
	if (excludeRepos) {
		repos = repos.filter((r) => !excludeRepos.includes(r.name));
	}

	// Exclude forks by default
	repos = repos.filter((r) => !r.fork);

	return repos;
}

/**
 * Fetch commits for a specific repo on a single date.
 */
async function fetchRepoCommitsForDate(
	repoFullName: string,
	authorUsername: string,
	token: string,
	date: string,
): Promise<Commit[]> {
	const commits: Commit[] = [];
	let page = 1;
	const perPage = 100;

	const sinceDate = `${date}T00:00:00Z`;
	const untilDate = `${date}T23:59:59Z`;

	while (true) {
		const url = new URL(`https://api.github.com/repos/${repoFullName}/commits`);
		url.searchParams.set("author", authorUsername);
		url.searchParams.set("since", sinceDate);
		url.searchParams.set("until", untilDate);
		url.searchParams.set("per_page", String(perPage));
		url.searchParams.set("page", String(page));

		const response = await fetch(url.toString(), {
			headers: {
				Authorization: `Bearer ${token}`,
				Accept: "application/vnd.github.v3+json",
				"User-Agent": "Lattice-Timeline-Curio",
			},
		});

		if (!response.ok) {
			if (response.status === 409) break; // Empty repository
			console.warn(`Failed to fetch commits for ${repoFullName}: ${response.status}`);
			break;
		}

		const pageCommits = (await response.json()) as GitHubCommitDetail[];

		if (pageCommits.length === 0) break;

		const repoName = repoFullName.split("/")[1];

		for (const commit of pageCommits) {
			commits.push({
				sha: commit.sha,
				message: commit.commit.message,
				repo: repoName,
				timestamp: commit.commit.author.date,
				additions: 0,
				deletions: 0,
			});
		}

		if (pageCommits.length < perPage) break;

		page++;

		// Rate limit between pages
		await new Promise((resolve) => setTimeout(resolve, 100));
	}

	return commits;
}

/**
 * Enrich commits with real additions/deletions from individual commit details.
 */
export async function fetchCommitStats(
	commits: Commit[],
	username: string,
	token: string,
): Promise<void> {
	await runWithConcurrency(commits, async (commit) => {
		try {
			const response = await fetch(
				`https://api.github.com/repos/${username}/${commit.repo}/commits/${commit.sha}`,
				{
					headers: {
						Authorization: `Bearer ${token}`,
						Accept: "application/vnd.github.v3+json",
						"User-Agent": "Lattice-Timeline-Curio",
					},
				},
			);

			if (response.ok) {
				const detail = (await response.json()) as GitHubCommitDetail;
				commit.additions = detail.stats?.additions ?? 0;
				commit.deletions = detail.stats?.deletions ?? 0;
			}
		} catch {
			// Non-fatal: keep 0 for this commit
		}
	});
}
