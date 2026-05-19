/**
 * Database Configuration
 *
 * Registry of all Grove D1 databases that need to be backed up.
 */

import type { DatabaseConfig } from "../types";

export type { DatabaseConfig };

export const DATABASES: DatabaseConfig[] = [
	{
		name: "groveauth",
		id: "45eae4c7-8ae7-4078-9218-8e1677a4360f",
		binding: "GROVEAUTH_DB",
		description: "Authentication, users, sessions, OAuth",
		priority: "critical",
		estimatedSize: "212 KB",
		dailyBackup: true,
	},
	{
		name: "grove-engine-db",
		id: "a6394da2-b7a6-48ce-b7fe-b1eb3e730e68",
		binding: "GROVE_ENGINE_DB",
		description: "Core engine, CDN files, signups",
		priority: "high",
		estimatedSize: "180 KB",
		dailyBackup: true,
	},
	{
		name: "grove-domain-jobs",
		id: "cd493112-a901-4f6d-aadf-a5ca78929557",
		binding: "GROVE_DOMAIN_JOBS_DB",
		description: "Domain search jobs",
		priority: "normal",
		estimatedSize: "45 KB",
	},
	{
		name: "amber",
		id: "f688021b-a986-495a-94bb-352354768a22",
		binding: "AMBER_DB",
		description: "Amber application data",
		priority: "normal",
		estimatedSize: "86 KB",
	},
	{
		name: "grove-curios-db",
		id: "b03756ad-30d7-427a-9a1b-ec2f6478fcbd",
		binding: "GROVE_CURIOS_DB",
		description: "Curio widgets: timeline, gallery, guestbook, polls, mood ring, shrines, etc.",
		priority: "high",
		estimatedSize: "~50 KB",
		dailyBackup: true,
	},
	{
		name: "grove-observability-db",
		id: "59e70f9e-8f9c-4021-96e5-1e130e753766",
		binding: "GROVE_OBSERVABILITY_DB",
		description: "Sentinel + Vista monitoring data",
		priority: "normal",
		estimatedSize: "~200 KB",
	},
];

// Helper to get databases for daily backup
export const DAILY_DATABASES = DATABASES.filter((db) => db.dailyBackup === true);

// Cron patterns
export const CRON_DAILY = "0 3 * * *";
export const CRON_WEEKLY = "0 4 * * SUN";

// Backup schedule and retention
export const BACKUP_CONFIG = {
	// Cron: Every Sunday at 3:00 AM UTC
	cronSchedule: "0 3 * * 0",

	// Keep 12 weeks of backups
	retentionWeeks: 12,

	// R2 bucket name
	bucketName: "grove-backups",

	// Max concurrent database exports
	concurrency: 3,

	// Timeout per database export (ms)
	exportTimeout: 30000,
};
