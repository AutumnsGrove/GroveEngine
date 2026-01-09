import type { PageServerLoad } from "./$types";
import historyData from "../../../static/data/history.csv?raw";
import {
  ECOSYSTEM_REPOS,
  type EcosystemRepo,
} from "$lib/ecosystem/config";
import type {
  EcosystemSummary,
  EcosystemRepoStats,
  EcosystemProgressEvent,
  FormattedRepoStats,
  FormattedActivityEvent,
  EcosystemPageData,
} from "$lib/ecosystem/types";

/**
 * CSV Schema (17 columns):
 * timestamp, label, git_hash, total_code_lines, svelte_lines, ts_lines,
 * js_lines, css_lines, doc_words, doc_lines, total_files, directories,
 * estimated_tokens, commits, test_files, test_lines, bundle_size_kb
 */
const EXPECTED_COLUMNS = 17;

interface VersionSummary {
  version: string;
  date: string;
  commitHash: string;
  summary: string;
  stats: {
    totalCommits: number;
    features: number;
    fixes: number;
    refactoring: number;
    docs: number;
    tests: number;
    performance: number;
  };
  highlights: {
    features: string[];
    fixes: string[];
  };
}

interface SnapshotData {
  timestamp: string;
  label: string;
  gitHash: string;
  totalCodeLines: number;
  svelteLines: number;
  tsLines: number;
  jsLines: number;
  cssLines: number;
  docWords: number;
  docLines: number;
  totalFiles: number;
  directories: number;
  estimatedTokens: number;
  commits: number;
  testFiles: number;
  testLines: number;
  bundleSizeKb: number;
  date: string;
}

function safeParseInt(value: string | undefined): number {
  if (!value) return 0;
  const parsed = parseInt(value, 10);
  return isNaN(parsed) ? 0 : parsed;
}

function parseTimestampToDate(timestamp: string): string {
  if (!timestamp || !timestamp.includes("_")) {
    return "Unknown date";
  }

  const datePart = timestamp.split("_")[0];
  const dateParts = datePart.split("-");

  if (dateParts.length !== 3) {
    return "Unknown date";
  }

  const year = safeParseInt(dateParts[0]);
  const month = safeParseInt(dateParts[1]);
  const day = safeParseInt(dateParts[2]);

  if (year < 2000 || month < 1 || month > 12 || day < 1 || day > 31) {
    return "Unknown date";
  }

  return new Date(year, month - 1, day).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function parseCSV(csv: string): SnapshotData[] {
  if (!csv || typeof csv !== "string") {
    console.warn("CSV data is empty or invalid");
    return [];
  }

  const lines = csv.trim().split("\n");

  // Need at least header + 1 data row
  if (lines.length < 2) {
    console.warn("CSV has no data rows");
    return [];
  }

  const results: SnapshotData[] = [];

  for (let i = 1; i < lines.length; i++) {
    const line = lines[i];
    if (!line.trim()) continue;

    const values = line.split(",");

    if (values.length !== EXPECTED_COLUMNS) {
      console.warn(
        `Skipping malformed CSV line ${i}: expected ${EXPECTED_COLUMNS} columns, got ${values.length}`,
      );
      continue;
    }

    results.push({
      timestamp: values[0] || "",
      label: values[1] || "",
      gitHash: values[2] || "",
      totalCodeLines: safeParseInt(values[3]),
      svelteLines: safeParseInt(values[4]),
      tsLines: safeParseInt(values[5]),
      jsLines: safeParseInt(values[6]),
      cssLines: safeParseInt(values[7]),
      docWords: safeParseInt(values[8]),
      docLines: safeParseInt(values[9]),
      totalFiles: safeParseInt(values[10]),
      directories: safeParseInt(values[11]),
      estimatedTokens: safeParseInt(values[12]),
      commits: safeParseInt(values[13]),
      testFiles: safeParseInt(values[14]),
      testLines: safeParseInt(values[15]),
      bundleSizeKb: safeParseInt(values[16]),
      date: parseTimestampToDate(values[0]),
    });
  }

  return results;
}

// Load all summary JSON files at build time using Vite's import.meta.glob
const summaryModules = import.meta.glob(
  "../../../static/data/summaries/*.json",
  {
    eager: true,
    import: "default",
  },
) as Record<string, VersionSummary>;

function loadSummaries(): Map<string, VersionSummary> {
  const summaries = new Map<string, VersionSummary>();

  for (const [path, summary] of Object.entries(summaryModules)) {
    if (summary && summary.version) {
      summaries.set(summary.version, summary);
    }
  }

  return summaries;
}

// =============================================================================
// ECOSYSTEM DATA LOADING
// =============================================================================

function getRepoConfig(repoName: string): EcosystemRepo | undefined {
  return ECOSYSTEM_REPOS.find((r) => r.name === repoName);
}

function formatDate(dateStr: string | null): string {
  if (!dateStr) return "Unknown";
  const date = new Date(dateStr);
  return date.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function formatRepoStats(stats: EcosystemRepoStats): FormattedRepoStats {
  const config = getRepoConfig(stats.repo_name);
  return {
    name: stats.repo_name,
    path: stats.repo_path,
    color: config?.color || "bg-gray-500",
    icon: config?.icon || "Box",
    category: config?.category || "tools",
    description: config?.description || "",
    totalCommits: stats.total_commits,
    totalReleases: stats.total_releases,
    commitsLast30Days: stats.commits_last_30_days,
    commitsLast7Days: stats.commits_last_7_days,
    featuresCount: stats.features_count,
    fixesCount: stats.fixes_count,
    lastCommitDate: stats.last_commit_date,
    lastReleaseDate: stats.last_release_date,
    lastReleaseVersion: stats.last_release_version,
    isActive: stats.is_active === 1,
    healthScore: stats.health_score,
  };
}

function formatActivityEvent(event: EcosystemProgressEvent): FormattedActivityEvent {
  const config = getRepoConfig(event.repo_name);
  return {
    id: event.id,
    repoName: event.repo_name,
    repoPath: event.repo_path,
    eventType: event.event_type,
    eventId: event.event_id,
    eventDate: event.event_date,
    formattedDate: formatDate(event.event_date),
    title: event.title,
    description: event.description,
    url: event.url,
    commitType: event.commit_type,
    authorLogin: event.author_login,
    authorAvatar: event.author_avatar,
    color: config?.color || "bg-gray-500",
  };
}

async function loadEcosystemData(
  db: D1Database | undefined
): Promise<EcosystemPageData> {
  // Return empty data if no database available (local dev without D1)
  if (!db) {
    return {
      summary: null,
      repos: [],
      recentActivity: [],
      lastSyncAt: null,
    };
  }

  try {
    // Load ecosystem summary
    const summaryResult = await db
      .prepare("SELECT * FROM ecosystem_summary WHERE id = 1")
      .first<EcosystemSummary>();

    // Load repo stats
    const repoStatsResult = await db
      .prepare("SELECT * FROM ecosystem_repo_stats ORDER BY health_score DESC")
      .all<EcosystemRepoStats>();

    // Load recent activity (last 50 events)
    const activityResult = await db
      .prepare(
        "SELECT * FROM ecosystem_progress ORDER BY event_date DESC LIMIT 50"
      )
      .all<EcosystemProgressEvent>();

    return {
      summary: summaryResult || null,
      repos: (repoStatsResult.results || []).map(formatRepoStats),
      recentActivity: (activityResult.results || []).map(formatActivityEvent),
      lastSyncAt: summaryResult?.last_sync_at || null,
    };
  } catch (err) {
    // Tables might not exist yet - return empty data
    console.warn("Failed to load ecosystem data:", err);
    return {
      summary: null,
      repos: [],
      recentActivity: [],
      lastSyncAt: null,
    };
  }
}

// =============================================================================
// MAIN LOAD FUNCTION
// =============================================================================

export const load: PageServerLoad = async ({ platform }) => {
  const snapshots = parseCSV(historyData);
  const summaries = loadSummaries();

  // Load ecosystem data from D1 (if available)
  const ecosystem = await loadEcosystemData(platform?.env?.DB);

  // Handle empty data gracefully
  if (snapshots.length === 0) {
    return {
      snapshots: [],
      latest: null,
      growth: null,
      totalSnapshots: 0,
      summaries: Object.fromEntries(summaries),
      ecosystem,
    };
  }

  const latest = snapshots[snapshots.length - 1];
  const first = snapshots[0];

  // Calculate growth between first and latest snapshot
  const growth =
    snapshots.length > 1
      ? {
          codeLines: latest.totalCodeLines - first.totalCodeLines,
          docWords: latest.docWords - first.docWords,
          files: latest.totalFiles - first.totalFiles,
          commits: latest.commits - first.commits,
        }
      : null;

  return {
    snapshots,
    latest,
    growth,
    totalSnapshots: snapshots.length,
    summaries: Object.fromEntries(summaries),
    ecosystem,
  };
};
