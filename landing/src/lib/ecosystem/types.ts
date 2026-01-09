/**
 * Ecosystem Progress Types
 *
 * TypeScript types for ecosystem progress tracking data.
 * These match the D1 schema in migrations/0004_ecosystem_progress.sql
 */

export interface EcosystemProgressEvent {
  id: number;
  repo_name: string;
  repo_path: string;
  event_type: 'release' | 'commit' | 'milestone';
  event_id: string;
  event_date: string;
  title: string;
  description: string | null;
  url: string | null;
  additions: number | null;
  deletions: number | null;
  changed_files: number | null;
  commit_type: string | null;
  author_login: string | null;
  author_avatar: string | null;
  created_at: string;
}

export interface EcosystemRepoStats {
  id: number;
  repo_name: string;
  repo_path: string;
  total_commits: number;
  total_releases: number;
  total_milestones: number;
  commits_last_30_days: number;
  commits_last_7_days: number;
  features_count: number;
  fixes_count: number;
  docs_count: number;
  refactors_count: number;
  last_commit_date: string | null;
  last_release_date: string | null;
  last_release_version: string | null;
  is_active: number;
  health_score: number;
  updated_at: string;
}

export interface EcosystemSummary {
  id: number;
  total_repos: number;
  total_commits: number;
  total_releases: number;
  active_repos: number;
  commits_last_30_days: number;
  commits_last_7_days: number;
  total_features: number;
  total_fixes: number;
  last_sync_at: string | null;
  last_sync_status: string | null;
  updated_at: string;
}

/**
 * Formatted ecosystem data for the UI
 */
export interface FormattedRepoStats {
  name: string;
  path: string;
  color: string;
  icon: string;
  category: string;
  description: string;
  totalCommits: number;
  totalReleases: number;
  commitsLast30Days: number;
  commitsLast7Days: number;
  featuresCount: number;
  fixesCount: number;
  lastCommitDate: string | null;
  lastReleaseDate: string | null;
  lastReleaseVersion: string | null;
  isActive: boolean;
  healthScore: number;
}

export interface FormattedActivityEvent {
  id: number;
  repoName: string;
  repoPath: string;
  eventType: 'release' | 'commit' | 'milestone';
  eventId: string;
  eventDate: string;
  formattedDate: string;
  title: string;
  description: string | null;
  url: string | null;
  commitType: string | null;
  authorLogin: string | null;
  authorAvatar: string | null;
  /** Color from repo config */
  color: string;
}

export interface EcosystemPageData {
  summary: EcosystemSummary | null;
  repos: FormattedRepoStats[];
  recentActivity: FormattedActivityEvent[];
  lastSyncAt: string | null;
}
