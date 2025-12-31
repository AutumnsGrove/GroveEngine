# Cache - Automated Database Backup System

> **Internal codename:** GroveBackups

## Project Overview

**Public Name:** Cache
**Internal Codename:** GroveBackups
**Location:** `packages/backups/` in GroveEngine monorepo
**URL:** `backups.grove.place` (optional dashboard)
**Purpose:** Automated weekly backups of all Grove D1 databases to R2
**Stack:** Cloudflare Workers + D1 + R2

*Part of the Grove ecosystem. "Squirrels cache acorns for winter."*

---

## 🎯 Goals

1. **Automated weekly backups** of all 9 D1 databases
2. **SQL dump format** — portable, restorable, human-readable
3. **12-week retention** with automatic cleanup
4. **Manual trigger capability** for on-demand backups
5. **Status dashboard** to view backup history
6. **Restore documentation** for disaster recovery
7. **Alerting** on backup failures (integrate with GroveMonitor later)

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                              Cache System                                   │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────────┐
│                    grove-backups (Worker)                        │
│                                                                  │
│  Cron Trigger: Every Sunday @ 3:00 AM UTC                       │
│  HTTP Endpoints: /status, /trigger, /download, /restore-guide   │
│                                                                  │
└──────────────────────────────┬───────────────────────────────────┘
                               │
           ┌───────────────────┼───────────────────┐
           │                   │                   │
           ▼                   ▼                   ▼
┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐
│   D1 Databases  │  │  grove-backups  │  │  grove-backups  │
│   (9 total)     │  │     (R2)        │  │     -db (D1)    │
│                 │  │                 │  │                 │
│ • groveauth     │  │ Backup Storage  │  │ Backup metadata │
│ • scout-db      │  │                 │  │ Job history     │
│ • grove-engine  │  │ /YYYY-MM-DD/    │  │ Alert config    │
│ • grovemusic    │  │   db-name.sql   │  │                 │
│ • library-*     │  │                 │  │                 │
│ • autumnsgrove-*│  │                 │  │                 │
│ • grove-domain  │  │                 │  │                 │
│ • your-site     │  │                 │  │                 │
└─────────────────┘  └─────────────────┘  └─────────────────┘

Backup Flow:
1. Cron triggers at 3 AM UTC every Sunday
2. Worker iterates through all 9 databases
3. For each DB: export schema + data to SQL
4. Upload to R2 with date-prefixed path
5. Log results to grove-backups-db
6. Clean up backups older than 12 weeks
7. Send alert if any failures (webhook)
```

---

## 📦 Project Structure

```
packages/backups/
├── src/
│   ├── index.ts                 # Main worker entry
│   ├── scheduled.ts             # Cron handler logic
│   ├── routes/
│   │   ├── status.ts            # GET /status
│   │   ├── trigger.ts           # POST /trigger
│   │   ├── download.ts          # GET /download/:date/:db
│   │   ├── list.ts              # GET /list
│   │   └── restore-guide.ts     # GET /restore-guide/:db
│   ├── lib/
│   │   ├── exporter.ts          # D1 to SQL export logic
│   │   ├── cleanup.ts           # Old backup deletion
│   │   ├── databases.ts         # Database configuration
│   │   ├── alerting.ts          # Webhook notifications
│   │   └── utils.ts             # Helper functions
│   └── types.ts                 # TypeScript interfaces
├── migrations/
│   └── 001_backup_metadata.sql  # Metadata schema
├── wrangler.toml
├── package.json
├── tsconfig.json
└── README.md
```

---

## 🗄️ Database Schema (grove-backups-db)

```sql
-- migrations/001_backup_metadata.sql

-- Backup job history
CREATE TABLE backup_jobs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT UNIQUE NOT NULL,           -- UUID for the job
  started_at INTEGER NOT NULL,           -- Unix timestamp
  completed_at INTEGER,                  -- Unix timestamp
  status TEXT NOT NULL,                  -- 'running', 'completed', 'failed'
  trigger_type TEXT NOT NULL,            -- 'scheduled', 'manual'
  total_databases INTEGER NOT NULL,
  successful_count INTEGER DEFAULT 0,
  failed_count INTEGER DEFAULT 0,
  total_size_bytes INTEGER DEFAULT 0,
  duration_ms INTEGER,
  error_message TEXT
);

CREATE INDEX idx_backup_jobs_started ON backup_jobs(started_at DESC);
CREATE INDEX idx_backup_jobs_status ON backup_jobs(status);

-- Individual database backup results
CREATE TABLE backup_results (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT NOT NULL,
  database_name TEXT NOT NULL,
  database_id TEXT NOT NULL,
  status TEXT NOT NULL,                  -- 'success', 'failed', 'skipped'
  r2_key TEXT,                           -- Path in R2
  size_bytes INTEGER,
  table_count INTEGER,
  row_count INTEGER,
  started_at INTEGER NOT NULL,
  completed_at INTEGER,
  duration_ms INTEGER,
  error_message TEXT,
  FOREIGN KEY (job_id) REFERENCES backup_jobs(job_id)
);

CREATE INDEX idx_backup_results_job ON backup_results(job_id);
CREATE INDEX idx_backup_results_db ON backup_results(database_name, started_at DESC);

-- Backup inventory (what's in R2)
CREATE TABLE backup_inventory (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  r2_key TEXT UNIQUE NOT NULL,           -- Full R2 path
  database_name TEXT NOT NULL,
  backup_date TEXT NOT NULL,             -- YYYY-MM-DD
  size_bytes INTEGER NOT NULL,
  table_count INTEGER,
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,           -- When it will be cleaned up
  deleted_at INTEGER                     -- Null if still exists
);

CREATE INDEX idx_inventory_date ON backup_inventory(backup_date DESC);
CREATE INDEX idx_inventory_db ON backup_inventory(database_name);
CREATE INDEX idx_inventory_expires ON backup_inventory(expires_at) WHERE deleted_at IS NULL;

-- Alert configuration
CREATE TABLE alert_config (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  webhook_url TEXT,
  enabled INTEGER DEFAULT 1,
  notify_on_success INTEGER DEFAULT 0,   -- Send alert even on success
  notify_on_failure INTEGER DEFAULT 1,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL
);
```

---

## ⚙️ Configuration

### Database Registry

```typescript
// src/lib/databases.ts

export interface DatabaseConfig {
  name: string;
  id: string;
  binding: string;
  description: string;
  priority: 'critical' | 'high' | 'normal';
  estimatedSize: string;
}

export const DATABASES: DatabaseConfig[] = [
  {
    name: 'groveauth',
    id: '45eae4c7-8ae7-4078-9218-8e1677a4360f',
    binding: 'GROVEAUTH_DB',
    description: 'Authentication, users, sessions, OAuth',
    priority: 'critical',
    estimatedSize: '212 KB',
  },
  {
    name: 'scout-db',
    id: '6a289378-c662-4c6a-9f1b-fa5296e03fa2',
    binding: 'SCOUT_DB',
    description: 'GroveScout searches, credits, referrals',
    priority: 'critical',
    estimatedSize: '364 KB',
  },
  {
    name: 'grove-engine-db',
    id: 'a6394da2-b7a6-48ce-b7fe-b1eb3e730e68',
    binding: 'GROVE_ENGINE_DB',
    description: 'Core engine, CDN files, signups',
    priority: 'high',
    estimatedSize: '180 KB',
  },
  {
    name: 'grovemusic-db',
    id: 'e1e31ed2-3b1f-4dbd-9435-c9105dadcfa2',
    binding: 'GROVEMUSIC_DB',
    description: 'GroveMusic data',
    priority: 'normal',
    estimatedSize: '98 KB',
  },
  {
    name: 'library-enhancer-db',
    id: 'afd1ce4c-618a-430a-bf0f-0a57647a388d',
    binding: 'LIBRARY_ENHANCER_DB',
    description: 'Library enhancer data',
    priority: 'normal',
    estimatedSize: '679 KB',
  },
  {
    name: 'autumnsgrove-posts',
    id: '510badf3-457a-4892-bf2a-45d4bfd7a7bb',
    binding: 'AUTUMNSGROVE_POSTS_DB',
    description: 'Blog posts',
    priority: 'high',
    estimatedSize: '118 KB',
  },
  {
    name: 'autumnsgrove-git-stats',
    id: '0ca4036f-93f7-4c8a-98a5-5353263acd44',
    binding: 'AUTUMNSGROVE_GIT_STATS_DB',
    description: 'Git statistics',
    priority: 'normal',
    estimatedSize: '335 KB',
  },
  {
    name: 'grove-domain-jobs',
    id: 'cd493112-a901-4f6d-aadf-a5ca78929557',
    binding: 'GROVE_DOMAIN_JOBS_DB',
    description: 'Domain search jobs',
    priority: 'normal',
    estimatedSize: '45 KB',
  },
  {
    name: 'your-site-posts',
    id: '86342742-7d34-486f-97f0-928136555e1a',
    binding: 'YOUR_SITE_POSTS_DB',
    description: 'Site posts',
    priority: 'normal',
    estimatedSize: '12 KB',
  },
];

// Backup schedule and retention
export const BACKUP_CONFIG = {
  // Cron: Every Sunday at 3:00 AM UTC
  cronSchedule: '0 3 * * 0',
  
  // Keep 12 weeks of backups
  retentionWeeks: 12,
  
  // R2 bucket name
  bucketName: 'grove-backups',
  
  // Max concurrent database exports
  concurrency: 3,
  
  // Timeout per database export (ms)
  exportTimeout: 30000,
};
```

---

## 📤 SQL Export Format

### Export Structure

```sql
-- ================================================
-- Grove Backup: groveauth
-- Generated: 2024-12-09T03:00:00.000Z
-- Job ID: 550e8400-e29b-41d4-a716-446655440000
-- Tables: 15
-- Total Rows: 1,234
-- ================================================

PRAGMA foreign_keys=OFF;
BEGIN TRANSACTION;

-- Table: users
-- Rows: 150
DROP TABLE IF EXISTS users;
CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at INTEGER NOT NULL,
  updated_at INTEGER
);

INSERT INTO "users" ("id", "email", "name", "created_at", "updated_at") VALUES ('usr_123', 'user@example.com', 'Example User', 1702100000, 1702100000);
INSERT INTO "users" ("id", "email", "name", "created_at", "updated_at") VALUES ('usr_456', 'another@example.com', 'Another User', 1702200000, NULL);
-- ... more rows

-- Table: sessions
-- Rows: 500
DROP TABLE IF EXISTS sessions;
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL,
  expires_at INTEGER NOT NULL,
  FOREIGN KEY (user_id) REFERENCES users(id)
);

-- ... more tables

COMMIT;
PRAGMA foreign_keys=ON;

-- ================================================
-- Backup Complete
-- Duration: 1.234s
-- Size: 212,992 bytes
-- ================================================
```

### Exporter Implementation

```typescript
// src/lib/exporter.ts

export interface ExportResult {
  sql: string;
  tableCount: number;
  rowCount: number;
  sizeBytes: number;
  durationMs: number;
}

export async function exportDatabase(
  db: D1Database,
  dbName: string,
  jobId: string
): Promise<ExportResult> {
  const startTime = Date.now();
  let totalRows = 0;
  
  // Get all user tables (exclude CF internal and SQLite tables)
  const tablesResult = await db.prepare(`
    SELECT name, sql FROM sqlite_master 
    WHERE type='table' 
    AND name NOT LIKE '_cf%' 
    AND name NOT LIKE 'sqlite%'
    ORDER BY name
  `).all();

  const tables = tablesResult.results as { name: string; sql: string }[];
  
  // Build header
  let sqlDump = `-- ================================================\n`;
  sqlDump += `-- Grove Backup: ${dbName}\n`;
  sqlDump += `-- Generated: ${new Date().toISOString()}\n`;
  sqlDump += `-- Job ID: ${jobId}\n`;
  sqlDump += `-- Tables: ${tables.length}\n`;
  sqlDump += `-- ================================================\n\n`;

  sqlDump += `PRAGMA foreign_keys=OFF;\n`;
  sqlDump += `BEGIN TRANSACTION;\n\n`;

  // Export each table
  for (const table of tables) {
    const tableName = table.name;
    
    // Get row count
    const countResult = await db.prepare(
      `SELECT COUNT(*) as count FROM "${tableName}"`
    ).first<{ count: number }>();
    const rowCount = countResult?.count || 0;
    totalRows += rowCount;
    
    sqlDump += `-- Table: ${tableName}\n`;
    sqlDump += `-- Rows: ${rowCount}\n`;
    sqlDump += `DROP TABLE IF EXISTS "${tableName}";\n`;
    sqlDump += `${table.sql};\n\n`;

    // Export rows in batches to avoid memory issues
    const BATCH_SIZE = 1000;
    let offset = 0;
    
    while (offset < rowCount) {
      const rowsResult = await db.prepare(
        `SELECT * FROM "${tableName}" LIMIT ${BATCH_SIZE} OFFSET ${offset}`
      ).all();
      
      for (const row of rowsResult.results) {
        const columns = Object.keys(row);
        const values = Object.values(row).map(formatSqlValue);
        
        sqlDump += `INSERT INTO "${tableName}" (${columns.map(c => `"${c}"`).join(', ')}) VALUES (${values.join(', ')});\n`;
      }
      
      offset += BATCH_SIZE;
    }
    
    sqlDump += '\n';
  }

  sqlDump += `COMMIT;\n`;
  sqlDump += `PRAGMA foreign_keys=ON;\n\n`;

  const durationMs = Date.now() - startTime;
  
  // Add footer
  sqlDump += `-- ================================================\n`;
  sqlDump += `-- Backup Complete\n`;
  sqlDump += `-- Duration: ${(durationMs / 1000).toFixed(3)}s\n`;
  sqlDump += `-- Total Rows: ${totalRows}\n`;
  sqlDump += `-- Size: ${sqlDump.length.toLocaleString()} bytes\n`;
  sqlDump += `-- ================================================\n`;

  return {
    sql: sqlDump,
    tableCount: tables.length,
    rowCount: totalRows,
    sizeBytes: sqlDump.length,
    durationMs,
  };
}

function formatSqlValue(value: unknown): string {
  if (value === null) return 'NULL';
  if (typeof value === 'number') return value.toString();
  if (typeof value === 'boolean') return value ? '1' : '0';
  if (value instanceof Uint8Array) {
    return `X'${Buffer.from(value).toString('hex')}'`;
  }
  // Escape single quotes for strings
  return `'${String(value).replace(/'/g, "''")}'`;
}
```

---

## 🌐 API Endpoints

### GET /

Worker info and documentation.

```typescript
// Response
{
  "name": "Cache",
  "version": "1.0.0",
  "description": "Automated D1 database backup system for Grove",
  "schedule": "Every Sunday at 3:00 AM UTC",
  "retention": "12 weeks",
  "databases": 9,
  "endpoints": {
    "GET /": "This documentation",
    "GET /status": "Current backup status and recent history",
    "GET /list": "List all available backups",
    "POST /trigger": "Manually trigger a backup",
    "GET /download/:date/:db": "Download a specific backup",
    "GET /restore-guide/:db": "Get restore instructions for a database"
  }
}
```

### GET /status

Current status and recent backup history.

```typescript
// Response
{
  "currentStatus": "idle", // or "running"
  "lastBackup": {
    "jobId": "550e8400-e29b-41d4-a716-446655440000",
    "date": "2024-12-08",
    "status": "completed",
    "successful": 9,
    "failed": 0,
    "totalSize": "2.1 MB",
    "duration": "45s"
  },
  "nextScheduled": "2024-12-15T03:00:00Z",
  "recentJobs": [
    {
      "jobId": "...",
      "date": "2024-12-08",
      "status": "completed",
      "databases": { "successful": 9, "failed": 0 }
    },
    // ... last 10 jobs
  ],
  "storage": {
    "totalBackups": 108, // 9 DBs × 12 weeks
    "totalSize": "25.2 MB",
    "oldestBackup": "2024-09-15",
    "newestBackup": "2024-12-08"
  }
}
```

### GET /list

List all available backups with filtering.

```typescript
// Query params:
// ?database=groveauth - Filter by database
// ?date=2024-12-08 - Filter by date
// ?limit=20 - Limit results

// Response
{
  "backups": [
    {
      "database": "groveauth",
      "date": "2024-12-08",
      "r2Key": "2024-12-08/groveauth.sql",
      "size": "212 KB",
      "tables": 15,
      "rows": 1234,
      "createdAt": "2024-12-08T03:00:45Z",
      "expiresAt": "2024-03-02T03:00:45Z"
    },
    // ...
  ],
  "total": 108,
  "filtered": 12
}
```

### POST /trigger

Manually trigger a backup.

```typescript
// Request body (optional)
{
  "databases": ["groveauth", "scout-db"], // Specific DBs, or omit for all
  "reason": "Pre-deployment backup"       // Optional note
}

// Response
{
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "started",
  "databases": 9,
  "message": "Backup job started. Check /status for progress."
}
```

### GET /download/:date/:db

Download a specific backup file.

```typescript
// Example: GET /download/2024-12-08/groveauth

// Response: SQL file download
// Content-Type: application/sql
// Content-Disposition: attachment; filename="groveauth-2024-12-08.sql"
```

### GET /restore-guide/:db

Get restore instructions for a specific database.

```typescript
// Example: GET /restore-guide/groveauth

// Response
{
  "database": "groveauth",
  "databaseId": "45eae4c7-8ae7-4078-9218-8e1677a4360f",
  "description": "Authentication, users, sessions, OAuth",
  "priority": "critical",
  "availableBackups": [
    { "date": "2024-12-08", "size": "212 KB" },
    { "date": "2024-12-01", "size": "210 KB" },
    // ...
  ],
  "restoreInstructions": {
    "method1_wrangler": {
      "name": "Wrangler CLI (Recommended)",
      "steps": [
        "1. Download backup: curl -o groveauth-2024-12-08.sql https://backups.grove.place/download/2024-12-08/groveauth",
        "2. Review the SQL file to ensure it's correct",
        "3. Execute: wrangler d1 execute groveauth --file=groveauth-2024-12-08.sql",
        "4. Verify: wrangler d1 execute groveauth --command=\"SELECT COUNT(*) FROM users\""
      ],
      "warning": "This will DROP and recreate tables. All existing data will be replaced."
    },
    "method2_timetravel": {
      "name": "D1 Time Travel (Last 30 days)",
      "steps": [
        "1. Get available restore points: wrangler d1 time-travel info groveauth",
        "2. Restore to timestamp: wrangler d1 time-travel restore groveauth --timestamp=\"2024-12-08T03:00:00Z\"",
        "3. Verify restoration"
      ],
      "note": "Time Travel is faster and doesn't require downloading files."
    }
  }
}
```

---

## 🔔 Alerting

### Webhook Payloads

```typescript
// Success notification (if enabled)
{
  "type": "backup_completed",
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "success",
  "timestamp": "2024-12-08T03:01:30Z",
  "summary": {
    "successful": 9,
    "failed": 0,
    "totalSize": "2.1 MB",
    "duration": "45s"
  },
  "details": [
    { "database": "groveauth", "status": "success", "size": "212 KB" },
    // ...
  ]
}

// Failure notification
{
  "type": "backup_failed",
  "jobId": "550e8400-e29b-41d4-a716-446655440000",
  "status": "partial_failure",
  "timestamp": "2024-12-08T03:01:30Z",
  "summary": {
    "successful": 7,
    "failed": 2,
    "totalSize": "1.8 MB",
    "duration": "52s"
  },
  "failures": [
    { "database": "scout-db", "error": "Timeout after 30s" },
    { "database": "grovemusic-db", "error": "Connection refused" }
  ]
}
```

### Discord Format

```typescript
// src/lib/alerting.ts

export function formatDiscordMessage(result: BackupJobResult): object {
  const isSuccess = result.failedCount === 0;
  
  return {
    embeds: [{
      title: isSuccess
        ? '✅ Cache Backup Completed'
        : '⚠️ Cache Backup Partially Failed',
      color: isSuccess ? 0x22c55e : 0xef4444,
      fields: [
        { 
          name: 'Databases', 
          value: `${result.successfulCount}/${result.totalDatabases} successful`,
          inline: true 
        },
        { 
          name: 'Total Size', 
          value: formatBytes(result.totalSizeBytes),
          inline: true 
        },
        { 
          name: 'Duration', 
          value: `${(result.durationMs / 1000).toFixed(1)}s`,
          inline: true 
        },
      ],
      footer: {
        text: `Job ID: ${result.jobId}`
      },
      timestamp: new Date().toISOString(),
    }],
  };
}
```

---

## 🧹 Cleanup Logic

```typescript
// src/lib/cleanup.ts

export async function cleanupOldBackups(
  bucket: R2Bucket,
  metadataDb: D1Database,
  retentionWeeks: number
): Promise<CleanupResult> {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - (retentionWeeks * 7));
  const cutoffTimestamp = Math.floor(cutoffDate.getTime() / 1000);
  
  // Get expired backups from inventory
  const expiredBackups = await metadataDb.prepare(`
    SELECT id, r2_key, database_name, backup_date, size_bytes
    FROM backup_inventory
    WHERE expires_at < ?
    AND deleted_at IS NULL
  `).bind(cutoffTimestamp).all();
  
  const results: { key: string; success: boolean; error?: string }[] = [];
  
  for (const backup of expiredBackups.results) {
    try {
      // Delete from R2
      await bucket.delete(backup.r2_key);
      
      // Mark as deleted in inventory
      await metadataDb.prepare(`
        UPDATE backup_inventory 
        SET deleted_at = ? 
        WHERE id = ?
      `).bind(Math.floor(Date.now() / 1000), backup.id).run();
      
      results.push({ key: backup.r2_key, success: true });
      
    } catch (error) {
      results.push({ 
        key: backup.r2_key, 
        success: false, 
        error: error instanceof Error ? error.message : String(error)
      });
    }
  }
  
  return {
    totalExpired: expiredBackups.results.length,
    deleted: results.filter(r => r.success).length,
    failed: results.filter(r => !r.success).length,
    freedBytes: expiredBackups.results
      .filter((_, i) => results[i].success)
      .reduce((sum, b) => sum + (b.size_bytes || 0), 0),
    results,
  };
}
```

---

## 📝 wrangler.toml

```toml
name = "grove-backups"
main = "src/index.ts"
compatibility_date = "2024-12-01"
compatibility_flags = ["nodejs_compat"]

# Cron trigger: Every Sunday at 3:00 AM UTC
[triggers]
crons = ["0 3 * * 0"]

# ============================================
# Source D1 Databases (all 9 Grove databases)
# ============================================

[[d1_databases]]
binding = "GROVEAUTH_DB"
database_name = "groveauth"
database_id = "45eae4c7-8ae7-4078-9218-8e1677a4360f"

[[d1_databases]]
binding = "SCOUT_DB"
database_name = "scout-db"
database_id = "6a289378-c662-4c6a-9f1b-fa5296e03fa2"

[[d1_databases]]
binding = "GROVE_ENGINE_DB"
database_name = "grove-engine-db"
database_id = "a6394da2-b7a6-48ce-b7fe-b1eb3e730e68"

[[d1_databases]]
binding = "GROVEMUSIC_DB"
database_name = "grovemusic-db"
database_id = "e1e31ed2-3b1f-4dbd-9435-c9105dadcfa2"

[[d1_databases]]
binding = "LIBRARY_ENHANCER_DB"
database_name = "library-enhancer-db"
database_id = "afd1ce4c-618a-430a-bf0f-0a57647a388d"

[[d1_databases]]
binding = "AUTUMNSGROVE_POSTS_DB"
database_name = "autumnsgrove-posts"
database_id = "510badf3-457a-4892-bf2a-45d4bfd7a7bb"

[[d1_databases]]
binding = "AUTUMNSGROVE_GIT_STATS_DB"
database_name = "autumnsgrove-git-stats"
database_id = "0ca4036f-93f7-4c8a-98a5-5353263acd44"

[[d1_databases]]
binding = "GROVE_DOMAIN_JOBS_DB"
database_name = "grove-domain-jobs"
database_id = "cd493112-a901-4f6d-aadf-a5ca78929557"

[[d1_databases]]
binding = "YOUR_SITE_POSTS_DB"
database_name = "your-site-posts"
database_id = "86342742-7d34-486f-97f0-928136555e1a"

# ============================================
# Metadata Database (for backup tracking)
# ============================================

[[d1_databases]]
binding = "METADATA_DB"
database_name = "grove-backups-db"
database_id = "TODO_CREATE_THIS"

# ============================================
# R2 Backup Storage
# ============================================

[[r2_buckets]]
binding = "BACKUPS"
bucket_name = "grove-backups"

# ============================================
# Environment Variables
# ============================================

[vars]
RETENTION_WEEKS = "12"
DISCORD_WEBHOOK_URL = ""  # Set via wrangler secret
ALERT_ON_SUCCESS = "false"
ALERT_ON_FAILURE = "true"
```

---

## 🚀 Deployment

### Prerequisites

```bash
# 1. Create the backup R2 bucket
wrangler r2 bucket create grove-backups

# 2. Create the metadata D1 database
wrangler d1 create grove-backups-db
# Note the database_id and update wrangler.toml

# 3. Run migrations
wrangler d1 execute grove-backups-db --file=migrations/001_backup_metadata.sql

# 4. Set Discord webhook (optional)
wrangler secret put DISCORD_WEBHOOK_URL
```

### Deploy

```bash
cd packages/backups
pnpm install
pnpm deploy
```

### Test

```bash
# Check status
curl https://grove-backups.YOUR_SUBDOMAIN.workers.dev/status

# Trigger manual backup
curl -X POST https://grove-backups.YOUR_SUBDOMAIN.workers.dev/trigger

# Tail logs
wrangler tail grove-backups
```

---

## 📋 Implementation Checklist

### Phase 1: Core Infrastructure
- [ ] Create R2 bucket `grove-backups`
- [ ] Create D1 database `grove-backups-db`
- [ ] Run migrations
- [ ] Set up project structure in `packages/backups/`

### Phase 2: Export Logic
- [ ] Implement `exporter.ts` with SQL dump logic
- [ ] Handle all data types correctly
- [ ] Add batch processing for large tables
- [ ] Include header/footer metadata in dumps

### Phase 3: Scheduled Handler
- [ ] Implement `scheduled.ts`
- [ ] Iterate through all databases
- [ ] Upload to R2 with date prefix
- [ ] Log results to metadata DB
- [ ] Handle errors gracefully

### Phase 4: API Endpoints
- [ ] GET / (documentation)
- [ ] GET /status
- [ ] GET /list
- [ ] POST /trigger
- [ ] GET /download/:date/:db
- [ ] GET /restore-guide/:db

### Phase 5: Cleanup & Alerting
- [ ] Implement cleanup logic
- [ ] Add Discord webhook support
- [ ] Configure alert thresholds

### Phase 6: Testing & Docs
- [ ] Test full backup cycle
- [ ] Test restore process
- [ ] Write README
- [ ] Add to GroveEngine docs

---

## 📚 Recovery Procedures

### Full Database Restore

```bash
# 1. Download the backup
curl -o restore.sql https://backups.grove.place/download/2024-12-08/groveauth

# 2. Review the file (important!)
head -100 restore.sql
tail -20 restore.sql

# 3. Execute against D1
wrangler d1 execute groveauth --file=restore.sql

# 4. Verify
wrangler d1 execute groveauth --command="SELECT COUNT(*) FROM users"
```

### Partial Restore (Single Table)

```bash
# 1. Download and extract specific table
curl https://backups.grove.place/download/2024-12-08/groveauth > full-backup.sql

# 2. Extract table (manual or with script)
grep -A 1000 "-- Table: users" full-backup.sql | grep -B 1000 "-- Table:" > users-only.sql

# 3. Execute
wrangler d1 execute groveauth --file=users-only.sql
```

### Using D1 Time Travel (Preferred for Recent Data)

```bash
# Check available restore points
wrangler d1 time-travel info groveauth

# Restore to specific timestamp
wrangler d1 time-travel restore groveauth --timestamp="2024-12-08T10:00:00Z"

# Or restore to bookmark
wrangler d1 time-travel restore groveauth --bookmark="<bookmark-id>"
```

---

## 🔗 Integration with GroveMonitor

Once GroveMonitor is deployed, add these metrics:

```typescript
// Metrics to expose for monitoring
const backupMetrics = {
  'backup_last_success_timestamp': lastSuccessfulBackup,
  'backup_last_duration_ms': lastBackupDuration,
  'backup_total_size_bytes': totalBackupSize,
  'backup_databases_count': 9,
  'backup_failures_24h': failuresInLast24Hours,
};
```

GroveMonitor can then alert if:
- No successful backup in 8+ days
- Backup size changed dramatically (possible data loss)
- Multiple consecutive failures

---

## 📝 Notes for Claude Code

1. **Start with the exporter** — it's the core logic
2. **Test with one database first** (e.g., `your-site-posts` - smallest)
3. **Use batch processing** for large tables to avoid memory issues
4. **The metadata DB is optional initially** — can log to console first
5. **Discord alerting can be Phase 2** — get backups working first
6. **R2 keys should be `YYYY-MM-DD/database-name.sql`** format
7. **Include comprehensive headers** in SQL dumps for debugging
