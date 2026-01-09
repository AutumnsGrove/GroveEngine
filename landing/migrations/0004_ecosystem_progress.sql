-- Ecosystem Progress Tracking
-- Stores progress events from all Grove ecosystem repositories

-- Progress events table: unified schema for releases, commits, milestones
CREATE TABLE IF NOT EXISTS ecosystem_progress (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Repository identification
    repo_name TEXT NOT NULL,           -- e.g., 'Lattice', 'Heartwood'
    repo_path TEXT NOT NULL,           -- e.g., 'autumnsgrove/GroveEngine'

    -- Event details
    event_type TEXT NOT NULL,          -- 'release', 'commit', 'milestone'
    event_id TEXT NOT NULL,            -- GitHub SHA, tag name, or milestone ID
    event_date TEXT NOT NULL,          -- ISO 8601 timestamp

    -- Content
    title TEXT NOT NULL,               -- Version tag, commit subject, or milestone title
    description TEXT,                  -- Release body, commit body, or milestone description
    url TEXT,                          -- Link to GitHub

    -- Metrics (nullable - not all event types have these)
    additions INTEGER,                 -- Lines added (commits only)
    deletions INTEGER,                 -- Lines deleted (commits only)
    changed_files INTEGER,             -- Files changed (commits only)

    -- Commit categorization (parsed from conventional commits)
    commit_type TEXT,                  -- 'feat', 'fix', 'docs', 'refactor', etc.

    -- Metadata
    author_login TEXT,                 -- GitHub username
    author_avatar TEXT,                -- Avatar URL

    -- Timestamps
    created_at TEXT DEFAULT (datetime('now')),

    -- Ensure no duplicate events
    UNIQUE(repo_path, event_type, event_id)
);

-- Indexes for efficient querying
CREATE INDEX IF NOT EXISTS idx_ecosystem_progress_repo ON ecosystem_progress(repo_name);
CREATE INDEX IF NOT EXISTS idx_ecosystem_progress_date ON ecosystem_progress(event_date DESC);
CREATE INDEX IF NOT EXISTS idx_ecosystem_progress_type ON ecosystem_progress(event_type);
CREATE INDEX IF NOT EXISTS idx_ecosystem_progress_repo_date ON ecosystem_progress(repo_name, event_date DESC);

-- Repository stats cache: aggregate metrics updated periodically
CREATE TABLE IF NOT EXISTS ecosystem_repo_stats (
    id INTEGER PRIMARY KEY AUTOINCREMENT,

    -- Repository identification
    repo_name TEXT NOT NULL UNIQUE,
    repo_path TEXT NOT NULL,

    -- Aggregate stats
    total_commits INTEGER DEFAULT 0,
    total_releases INTEGER DEFAULT 0,
    total_milestones INTEGER DEFAULT 0,

    -- Recent activity
    commits_last_30_days INTEGER DEFAULT 0,
    commits_last_7_days INTEGER DEFAULT 0,

    -- Commit type breakdown (last 30 days)
    features_count INTEGER DEFAULT 0,
    fixes_count INTEGER DEFAULT 0,
    docs_count INTEGER DEFAULT 0,
    refactors_count INTEGER DEFAULT 0,

    -- Latest activity
    last_commit_date TEXT,
    last_release_date TEXT,
    last_release_version TEXT,

    -- Health indicators
    is_active INTEGER DEFAULT 1,       -- Has activity in last 90 days
    health_score INTEGER DEFAULT 0,    -- 0-100 based on activity patterns

    -- Timestamps
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Ecosystem-wide summary: single row with aggregate stats
CREATE TABLE IF NOT EXISTS ecosystem_summary (
    id INTEGER PRIMARY KEY CHECK (id = 1),  -- Ensure only one row

    -- Totals across all repos
    total_repos INTEGER DEFAULT 0,
    total_commits INTEGER DEFAULT 0,
    total_releases INTEGER DEFAULT 0,
    active_repos INTEGER DEFAULT 0,

    -- Recent activity
    commits_last_30_days INTEGER DEFAULT 0,
    commits_last_7_days INTEGER DEFAULT 0,

    -- Breakdown by type
    total_features INTEGER DEFAULT 0,
    total_fixes INTEGER DEFAULT 0,

    -- Last sync info
    last_sync_at TEXT,
    last_sync_status TEXT,             -- 'success', 'partial', 'failed'

    -- Timestamps
    updated_at TEXT DEFAULT (datetime('now'))
);

-- Initialize the summary row
INSERT OR IGNORE INTO ecosystem_summary (id) VALUES (1);
