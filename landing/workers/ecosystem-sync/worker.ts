/**
 * Grove Ecosystem Sync Worker
 *
 * Scheduled worker that polls GitHub API for activity across all Grove repos.
 * Syncs commits, releases, and milestones to D1 for the journey page.
 *
 * Schedule: Every 6 hours
 */

interface Env {
  DB: D1Database;
  GITHUB_TOKEN: string;
}

// =============================================================================
// ECOSYSTEM CONFIGURATION
// =============================================================================

interface RepoConfig {
  name: string;
  repo: string; // owner/repo format
  trackingMethod: 'releases' | 'commits' | 'hybrid';
}

/**
 * Grove ecosystem repositories
 * Note: This is duplicated from the frontend config for Worker isolation.
 * In production, this could be stored in KV or D1 for dynamic updates.
 */
const ECOSYSTEM_REPOS: RepoConfig[] = [
  { name: 'Lattice', repo: 'autumnsgrove/GroveEngine', trackingMethod: 'releases' },
  { name: 'Heartwood', repo: 'autumnsgrove/heartwood', trackingMethod: 'commits' },
  { name: 'Amber', repo: 'autumnsgrove/amber', trackingMethod: 'commits' },
  { name: 'Foliage', repo: 'autumnsgrove/foliage', trackingMethod: 'commits' },
  { name: 'Ivy', repo: 'autumnsgrove/ivy', trackingMethod: 'commits' },
  { name: 'Rings', repo: 'autumnsgrove/rings', trackingMethod: 'commits' },
  { name: 'Meadow', repo: 'autumnsgrove/meadow', trackingMethod: 'commits' },
  { name: 'Forage', repo: 'autumnsgrove/forage', trackingMethod: 'commits' },
  { name: 'Aria', repo: 'autumnsgrove/aria', trackingMethod: 'commits' },
  { name: 'Scout', repo: 'autumnsgrove/scout', trackingMethod: 'commits' },
  { name: 'Outpost', repo: 'autumnsgrove/outpost', trackingMethod: 'commits' },
];

// =============================================================================
// GITHUB API TYPES
// =============================================================================

interface GitHubCommit {
  sha: string;
  commit: {
    message: string;
    author: {
      name: string;
      email: string;
      date: string;
    };
  };
  html_url: string;
  author: {
    login: string;
    avatar_url: string;
  } | null;
  stats?: {
    additions: number;
    deletions: number;
    total: number;
  };
  files?: Array<{ filename: string }>;
}

interface GitHubRelease {
  id: number;
  tag_name: string;
  name: string;
  body: string;
  html_url: string;
  published_at: string;
  author: {
    login: string;
    avatar_url: string;
  };
}

// =============================================================================
// GITHUB API CLIENT
// =============================================================================

async function githubFetch<T>(
  endpoint: string,
  token: string,
  options: RequestInit = {}
): Promise<T | null> {
  const url = endpoint.startsWith('http')
    ? endpoint
    : `https://api.github.com${endpoint}`;

  try {
    const response = await fetch(url, {
      ...options,
      headers: {
        Accept: 'application/vnd.github.v3+json',
        Authorization: `Bearer ${token}`,
        'User-Agent': 'Grove-Ecosystem-Sync/1.0',
        ...options.headers,
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        // Repo doesn't exist or is private - not an error
        return null;
      }
      console.error(`[GitHub] ${response.status} for ${endpoint}`);
      return null;
    }

    return response.json() as Promise<T>;
  } catch (err) {
    console.error(`[GitHub] Error fetching ${endpoint}:`, err);
    return null;
  }
}

// =============================================================================
// COMMIT TYPE PARSING
// =============================================================================

/**
 * Parse conventional commit type from message
 * e.g., "feat: add user auth" -> "feat"
 */
function parseCommitType(message: string): string | null {
  const match = message.match(/^(feat|fix|docs|style|refactor|perf|test|build|ci|chore|revert)(\(.+\))?:/i);
  return match ? match[1].toLowerCase() : null;
}

/**
 * Get first line of commit message as title
 */
function getCommitTitle(message: string): string {
  const firstLine = message.split('\n')[0];
  return firstLine.substring(0, 200); // Truncate long titles
}

// =============================================================================
// DATA SYNC FUNCTIONS
// =============================================================================

async function syncCommits(
  db: D1Database,
  token: string,
  config: RepoConfig
): Promise<{ added: number; skipped: number }> {
  let added = 0;
  let skipped = 0;

  // Fetch recent commits (last 30 days max, or 100 commits)
  const commits = await githubFetch<GitHubCommit[]>(
    `/repos/${config.repo}/commits?per_page=50`,
    token
  );

  if (!commits || commits.length === 0) {
    return { added: 0, skipped: 0 };
  }

  for (const commit of commits) {
    const commitType = parseCommitType(commit.commit.message);
    const title = getCommitTitle(commit.commit.message);

    try {
      await db
        .prepare(
          `INSERT OR IGNORE INTO ecosystem_progress (
            repo_name, repo_path, event_type, event_id, event_date,
            title, description, url, commit_type,
            author_login, author_avatar
          ) VALUES (?, ?, 'commit', ?, ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          config.name,
          config.repo,
          commit.sha,
          commit.commit.author.date,
          title,
          commit.commit.message.length > 200
            ? commit.commit.message.substring(200)
            : null,
          commit.html_url,
          commitType,
          commit.author?.login || commit.commit.author.name,
          commit.author?.avatar_url || null
        )
        .run();

      // Check if row was actually inserted
      const result = await db
        .prepare('SELECT changes() as count')
        .first<{ count: number }>();

      if (result && result.count > 0) {
        added++;
      } else {
        skipped++;
      }
    } catch (err) {
      console.error(`[Sync] Error inserting commit ${commit.sha}:`, err);
      skipped++;
    }
  }

  return { added, skipped };
}

async function syncReleases(
  db: D1Database,
  token: string,
  config: RepoConfig
): Promise<{ added: number; skipped: number }> {
  let added = 0;
  let skipped = 0;

  const releases = await githubFetch<GitHubRelease[]>(
    `/repos/${config.repo}/releases?per_page=50`,
    token
  );

  if (!releases || releases.length === 0) {
    return { added: 0, skipped: 0 };
  }

  for (const release of releases) {
    try {
      await db
        .prepare(
          `INSERT OR IGNORE INTO ecosystem_progress (
            repo_name, repo_path, event_type, event_id, event_date,
            title, description, url,
            author_login, author_avatar
          ) VALUES (?, ?, 'release', ?, ?, ?, ?, ?, ?, ?)`
        )
        .bind(
          config.name,
          config.repo,
          release.tag_name,
          release.published_at,
          release.name || release.tag_name,
          release.body?.substring(0, 2000) || null,
          release.html_url,
          release.author.login,
          release.author.avatar_url
        )
        .run();

      const result = await db
        .prepare('SELECT changes() as count')
        .first<{ count: number }>();

      if (result && result.count > 0) {
        added++;
      } else {
        skipped++;
      }
    } catch (err) {
      console.error(`[Sync] Error inserting release ${release.tag_name}:`, err);
      skipped++;
    }
  }

  return { added, skipped };
}

// =============================================================================
// STATS AGGREGATION
// =============================================================================

async function updateRepoStats(db: D1Database, repoName: string, repoPath: string): Promise<void> {
  const now = new Date().toISOString();
  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString();

  // Calculate aggregate stats
  const stats = await db
    .prepare(
      `SELECT
        COUNT(*) FILTER (WHERE event_type = 'commit') as total_commits,
        COUNT(*) FILTER (WHERE event_type = 'release') as total_releases,
        COUNT(*) FILTER (WHERE event_type = 'commit' AND event_date >= ?) as commits_30d,
        COUNT(*) FILTER (WHERE event_type = 'commit' AND event_date >= ?) as commits_7d,
        COUNT(*) FILTER (WHERE event_type = 'commit' AND commit_type = 'feat' AND event_date >= ?) as features,
        COUNT(*) FILTER (WHERE event_type = 'commit' AND commit_type = 'fix' AND event_date >= ?) as fixes,
        COUNT(*) FILTER (WHERE event_type = 'commit' AND commit_type = 'docs' AND event_date >= ?) as docs,
        COUNT(*) FILTER (WHERE event_type = 'commit' AND commit_type = 'refactor' AND event_date >= ?) as refactors,
        MAX(CASE WHEN event_type = 'commit' THEN event_date END) as last_commit,
        MAX(CASE WHEN event_type = 'release' THEN event_date END) as last_release
      FROM ecosystem_progress
      WHERE repo_name = ?`
    )
    .bind(thirtyDaysAgo, sevenDaysAgo, thirtyDaysAgo, thirtyDaysAgo, thirtyDaysAgo, thirtyDaysAgo, repoName)
    .first<{
      total_commits: number;
      total_releases: number;
      commits_30d: number;
      commits_7d: number;
      features: number;
      fixes: number;
      docs: number;
      refactors: number;
      last_commit: string | null;
      last_release: string | null;
    }>();

  if (!stats) return;

  // Get latest release version
  const latestRelease = await db
    .prepare(
      `SELECT title FROM ecosystem_progress
       WHERE repo_name = ? AND event_type = 'release'
       ORDER BY event_date DESC LIMIT 1`
    )
    .bind(repoName)
    .first<{ title: string }>();

  // Calculate health score (0-100)
  // Based on: recent activity, commit frequency, feature vs fix ratio
  const isActive = stats.last_commit && stats.last_commit >= ninetyDaysAgo;
  const activityScore = Math.min(50, (stats.commits_30d || 0) * 2);
  const diversityScore = Math.min(30, ((stats.features || 0) + (stats.docs || 0)) * 3);
  const recencyScore = stats.commits_7d && stats.commits_7d > 0 ? 20 : (stats.commits_30d && stats.commits_30d > 0 ? 10 : 0);
  const healthScore = activityScore + diversityScore + recencyScore;

  // Upsert repo stats
  await db
    .prepare(
      `INSERT INTO ecosystem_repo_stats (
        repo_name, repo_path,
        total_commits, total_releases, total_milestones,
        commits_last_30_days, commits_last_7_days,
        features_count, fixes_count, docs_count, refactors_count,
        last_commit_date, last_release_date, last_release_version,
        is_active, health_score, updated_at
      ) VALUES (?, ?, ?, ?, 0, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT(repo_name) DO UPDATE SET
        total_commits = excluded.total_commits,
        total_releases = excluded.total_releases,
        commits_last_30_days = excluded.commits_last_30_days,
        commits_last_7_days = excluded.commits_last_7_days,
        features_count = excluded.features_count,
        fixes_count = excluded.fixes_count,
        docs_count = excluded.docs_count,
        refactors_count = excluded.refactors_count,
        last_commit_date = excluded.last_commit_date,
        last_release_date = excluded.last_release_date,
        last_release_version = excluded.last_release_version,
        is_active = excluded.is_active,
        health_score = excluded.health_score,
        updated_at = excluded.updated_at`
    )
    .bind(
      repoName,
      repoPath,
      stats.total_commits || 0,
      stats.total_releases || 0,
      stats.commits_30d || 0,
      stats.commits_7d || 0,
      stats.features || 0,
      stats.fixes || 0,
      stats.docs || 0,
      stats.refactors || 0,
      stats.last_commit,
      stats.last_release,
      latestRelease?.title || null,
      isActive ? 1 : 0,
      healthScore,
      now
    )
    .run();
}

async function updateEcosystemSummary(db: D1Database): Promise<void> {
  const now = new Date().toISOString();

  const summary = await db
    .prepare(
      `SELECT
        COUNT(DISTINCT repo_name) as total_repos,
        SUM(total_commits) as total_commits,
        SUM(total_releases) as total_releases,
        SUM(CASE WHEN is_active = 1 THEN 1 ELSE 0 END) as active_repos,
        SUM(commits_last_30_days) as commits_30d,
        SUM(commits_last_7_days) as commits_7d,
        SUM(features_count) as total_features,
        SUM(fixes_count) as total_fixes
      FROM ecosystem_repo_stats`
    )
    .first<{
      total_repos: number;
      total_commits: number;
      total_releases: number;
      active_repos: number;
      commits_30d: number;
      commits_7d: number;
      total_features: number;
      total_fixes: number;
    }>();

  if (!summary) return;

  await db
    .prepare(
      `UPDATE ecosystem_summary SET
        total_repos = ?,
        total_commits = ?,
        total_releases = ?,
        active_repos = ?,
        commits_last_30_days = ?,
        commits_last_7_days = ?,
        total_features = ?,
        total_fixes = ?,
        last_sync_at = ?,
        last_sync_status = 'success',
        updated_at = ?
      WHERE id = 1`
    )
    .bind(
      summary.total_repos || 0,
      summary.total_commits || 0,
      summary.total_releases || 0,
      summary.active_repos || 0,
      summary.commits_30d || 0,
      summary.commits_7d || 0,
      summary.total_features || 0,
      summary.total_fixes || 0,
      now,
      now
    )
    .run();
}

// =============================================================================
// MAIN SYNC FUNCTION
// =============================================================================

interface SyncResult {
  repo: string;
  commits: { added: number; skipped: number };
  releases: { added: number; skipped: number };
  error?: string;
}

async function syncEcosystem(env: Env): Promise<SyncResult[]> {
  const results: SyncResult[] = [];

  for (const repo of ECOSYSTEM_REPOS) {
    console.log(`[Sync] Processing ${repo.name} (${repo.repo})`);

    const result: SyncResult = {
      repo: repo.name,
      commits: { added: 0, skipped: 0 },
      releases: { added: 0, skipped: 0 },
    };

    try {
      // Sync commits for all repos
      if (repo.trackingMethod === 'commits' || repo.trackingMethod === 'hybrid') {
        result.commits = await syncCommits(env.DB, env.GITHUB_TOKEN, repo);
        console.log(`[Sync] ${repo.name}: ${result.commits.added} new commits`);
      }

      // Sync releases for release-tracked repos
      if (repo.trackingMethod === 'releases' || repo.trackingMethod === 'hybrid') {
        result.releases = await syncReleases(env.DB, env.GITHUB_TOKEN, repo);
        console.log(`[Sync] ${repo.name}: ${result.releases.added} new releases`);
      }

      // Update repo stats
      await updateRepoStats(env.DB, repo.name, repo.repo);
    } catch (err) {
      result.error = err instanceof Error ? err.message : 'Unknown error';
      console.error(`[Sync] Error syncing ${repo.name}:`, err);
    }

    results.push(result);

    // Small delay between repos to be nice to GitHub API
    await new Promise((resolve) => setTimeout(resolve, 500));
  }

  // Update ecosystem-wide summary
  await updateEcosystemSummary(env.DB);

  return results;
}

// =============================================================================
// WORKER HANDLERS
// =============================================================================

export default {
  // Scheduled handler - runs on cron trigger
  async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
    console.log(`[Ecosystem] Cron triggered at ${new Date().toISOString()}`);

    const results = await syncEcosystem(env);

    const totalCommits = results.reduce((sum, r) => sum + r.commits.added, 0);
    const totalReleases = results.reduce((sum, r) => sum + r.releases.added, 0);
    const errors = results.filter((r) => r.error).length;

    console.log(
      `[Ecosystem] Sync complete: ${totalCommits} commits, ${totalReleases} releases, ${errors} errors`
    );
  },

  // HTTP handler - for manual triggering and health checks
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);

    // Health check
    if (url.pathname === '/health') {
      return new Response('OK', { status: 200 });
    }

    // Get ecosystem stats (public)
    if (url.pathname === '/stats') {
      const summary = await env.DB.prepare(
        'SELECT * FROM ecosystem_summary WHERE id = 1'
      ).first();

      const repoStats = await env.DB.prepare(
        'SELECT * FROM ecosystem_repo_stats ORDER BY health_score DESC'
      ).all();

      return new Response(
        JSON.stringify({ summary, repos: repoStats.results }),
        {
          status: 200,
          headers: { 'Content-Type': 'application/json' },
        }
      );
    }

    // Get recent activity (public)
    if (url.pathname === '/activity') {
      const limit = parseInt(url.searchParams.get('limit') || '50');
      const repoFilter = url.searchParams.get('repo');

      let query = `
        SELECT * FROM ecosystem_progress
        ${repoFilter ? 'WHERE repo_name = ?' : ''}
        ORDER BY event_date DESC
        LIMIT ?
      `;

      const stmt = repoFilter
        ? env.DB.prepare(query).bind(repoFilter, limit)
        : env.DB.prepare(query).bind(limit);

      const activity = await stmt.all();

      return new Response(JSON.stringify({ events: activity.results }), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // Manual trigger (protected)
    if (url.pathname === '/trigger' && request.method === 'POST') {
      const authHeader = request.headers.get('Authorization');
      if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return new Response('Unauthorized', { status: 401 });
      }

      ctx.waitUntil(
        syncEcosystem(env).then((results) => {
          const totalCommits = results.reduce((sum, r) => sum + r.commits.added, 0);
          console.log(`[Ecosystem] Manual trigger: ${totalCommits} new commits`);
        })
      );

      return new Response(JSON.stringify({ status: 'processing' }), {
        status: 202,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return new Response('Not Found', { status: 404 });
  },
};
