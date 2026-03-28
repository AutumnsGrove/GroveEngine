/**
 * Monitoring Domain Schema — Thorn (Text Moderation), Petal (Image), Sentinel (Stress Testing)
 *
 * Content moderation and infrastructure monitoring tables.
 */

import { sqliteTable, text, integer, real, uniqueIndex } from "drizzle-orm/sqlite-core";
import { sql } from "drizzle-orm";

// ─────────────────────────────────────────────────────────────────────────────
// MODERATION: Thorn (Text) & Petal (Image)
// ─────────────────────────────────────────────────────────────────────────────

export const thornModerationLog = sqliteTable("thorn_moderation_log", {
	id: text("id").primaryKey(),
	timestamp: text("timestamp")
		.notNull()
		.default(sql`(datetime('now'))`),
	userId: text("user_id"),
	tenantId: text("tenant_id"),
	contentType: text("content_type").notNull(),
	hookPoint: text("hook_point").notNull(),
	action: text("action").notNull(),
	categories: text("categories"),
	confidence: real("confidence"),
	model: text("model"),
	contentRef: text("content_ref"),
});

export const thornFlaggedContent = sqliteTable("thorn_flagged_content", {
	id: text("id").primaryKey(),
	createdAt: text("created_at")
		.notNull()
		.default(sql`(datetime('now'))`),
	userId: text("user_id"),
	tenantId: text("tenant_id"),
	contentType: text("content_type").notNull(),
	contentRef: text("content_ref"),
	action: text("action").notNull(),
	categories: text("categories"),
	confidence: real("confidence"),
	status: text("status").notNull().default("pending"),
	reviewedBy: text("reviewed_by"),
	reviewedAt: text("reviewed_at"),
	reviewNotes: text("review_notes"),
});

export const petalAccountFlags = sqliteTable(
	"petal_account_flags",
	{
		id: text("id").primaryKey(),
		userId: text("user_id").notNull(),
		flagType: text("flag_type").notNull(),
		createdAt: text("created_at").default(sql`(datetime('now'))`),
		blockUploads: integer("block_uploads").default(1),
		requiresManualReview: integer("requires_manual_review").default(1),
		reviewStatus: text("review_status").default("pending"),
		reviewedBy: text("reviewed_by"),
		reviewedAt: text("reviewed_at"),
		reviewNotes: text("review_notes"),
	},
	(table) => [uniqueIndex("idx_petal_flags_user_type").on(table.userId, table.flagType)],
);

export const petalSecurityLog = sqliteTable("petal_security_log", {
	id: text("id").primaryKey(),
	timestamp: text("timestamp")
		.notNull()
		.default(sql`(datetime('now'))`),
	layer: text("layer").notNull(),
	result: text("result").notNull(),
	category: text("category"),
	confidence: real("confidence"),
	contentHash: text("content_hash").notNull(),
	feature: text("feature").notNull(),
	userId: text("user_id"),
	tenantId: text("tenant_id"),
});

export const petalNcmecQueue = sqliteTable("petal_ncmec_queue", {
	id: text("id").primaryKey(),
	contentHash: text("content_hash").notNull(),
	detectedAt: text("detected_at").notNull(),
	reportDeadline: text("report_deadline").notNull(),
	userId: text("user_id").notNull(),
	tenantId: text("tenant_id"),
	reported: integer("reported").default(0),
	reportedAt: text("reported_at"),
	reportId: text("report_id"),
	lastAttempt: text("last_attempt"),
	attemptCount: integer("attempt_count").default(0),
	lastError: text("last_error"),
});

// ─────────────────────────────────────────────────────────────────────────────
// INFRASTRUCTURE: Sentinel (Stress Testing)
// ─────────────────────────────────────────────────────────────────────────────

export const sentinelRuns = sqliteTable("sentinel_runs", {
	id: text("id").primaryKey(),
	tenantId: text("tenant_id").notNull(),
	name: text("name").notNull(),
	description: text("description"),
	profileType: text("profile_type", {
		enum: ["spike", "sustained", "oscillation", "ramp", "custom"],
	}).notNull(),
	targetOperations: integer("target_operations").notNull(),
	durationSeconds: integer("duration_seconds").notNull(),
	concurrency: integer("concurrency").default(10),
	targetSystems: text("target_systems").notNull().default('["d1_writes", "d1_reads"]'),
	status: text("status", { enum: ["pending", "running", "completed", "failed", "cancelled"] })
		.notNull()
		.default("pending"),
	scheduledAt: integer("scheduled_at"),
	startedAt: integer("started_at"),
	completedAt: integer("completed_at"),
	totalOperations: integer("total_operations").default(0),
	successfulOperations: integer("successful_operations").default(0),
	failedOperations: integer("failed_operations").default(0),
	avgLatencyMs: real("avg_latency_ms"),
	p50LatencyMs: real("p50_latency_ms"),
	p95LatencyMs: real("p95_latency_ms"),
	p99LatencyMs: real("p99_latency_ms"),
	maxLatencyMs: real("max_latency_ms"),
	minLatencyMs: real("min_latency_ms"),
	throughputOpsSec: real("throughput_ops_sec"),
	errorCount: integer("error_count").default(0),
	errorTypes: text("error_types").default("{}"),
	estimatedCostUsd: real("estimated_cost_usd"),
	configSnapshot: text("config_snapshot"),
	triggeredBy: text("triggered_by"),
	notes: text("notes"),
	metadata: text("metadata").default("{}"),
	createdAt: integer("created_at")
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer("updated_at")
		.notNull()
		.default(sql`(unixepoch())`),
});

export const sentinelMetrics = sqliteTable("sentinel_metrics", {
	id: text("id").primaryKey(),
	runId: text("run_id")
		.notNull()
		.references(() => sentinelRuns.id, { onDelete: "cascade" }),
	tenantId: text("tenant_id").notNull(),
	operationType: text("operation_type").notNull(),
	operationName: text("operation_name"),
	batchIndex: integer("batch_index").default(0),
	startedAt: integer("started_at").notNull(),
	completedAt: integer("completed_at"),
	latencyMs: real("latency_ms"),
	success: integer("success").notNull().default(1),
	errorMessage: text("error_message"),
	errorCode: text("error_code"),
	rowsAffected: integer("rows_affected"),
	bytesTransferred: integer("bytes_transferred"),
	metadata: text("metadata").default("{}"),
});

export const sentinelCheckpoints = sqliteTable("sentinel_checkpoints", {
	id: text("id").primaryKey(),
	runId: text("run_id")
		.notNull()
		.references(() => sentinelRuns.id, { onDelete: "cascade" }),
	tenantId: text("tenant_id").notNull(),
	checkpointIndex: integer("checkpoint_index").notNull(),
	recordedAt: integer("recorded_at").notNull(),
	elapsedSeconds: integer("elapsed_seconds").notNull(),
	operationsCompleted: integer("operations_completed").notNull(),
	operationsFailed: integer("operations_failed").notNull(),
	currentThroughput: real("current_throughput"),
	avgLatencyMs: real("avg_latency_ms"),
	estimatedD1Reads: integer("estimated_d1_reads"),
	estimatedD1Writes: integer("estimated_d1_writes"),
	estimatedKvOps: integer("estimated_kv_ops"),
	estimatedR2Ops: integer("estimated_r2_ops"),
	errorRate: real("error_rate"),
	metadata: text("metadata").default("{}"),
});

export const sentinelBaselines = sqliteTable("sentinel_baselines", {
	id: text("id").primaryKey(),
	tenantId: text("tenant_id").notNull(),
	name: text("name").notNull(),
	description: text("description"),
	profileType: text("profile_type").notNull(),
	targetSystems: text("target_systems").notNull(),
	baselineThroughput: real("baseline_throughput"),
	baselineP50Latency: real("baseline_p50_latency"),
	baselineP95Latency: real("baseline_p95_latency"),
	baselineP99Latency: real("baseline_p99_latency"),
	baselineErrorRate: real("baseline_error_rate"),
	throughputThreshold: real("throughput_threshold"),
	latencyP95Threshold: real("latency_p95_threshold"),
	errorRateThreshold: real("error_rate_threshold"),
	sourceRunIds: text("source_run_ids"),
	isActive: integer("is_active").default(1),
	createdAt: integer("created_at")
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer("updated_at")
		.notNull()
		.default(sql`(unixepoch())`),
});

export const sentinelSchedules = sqliteTable("sentinel_schedules", {
	id: text("id").primaryKey(),
	tenantId: text("tenant_id").notNull(),
	name: text("name").notNull(),
	description: text("description"),
	cronExpression: text("cron_expression").notNull(),
	timezone: text("timezone").default("UTC"),
	profileType: text("profile_type").notNull(),
	targetOperations: integer("target_operations").notNull(),
	durationSeconds: integer("duration_seconds").notNull(),
	concurrency: integer("concurrency").default(10),
	targetSystems: text("target_systems").notNull().default('["d1_writes", "d1_reads"]'),
	enableMaintenanceMode: integer("enable_maintenance_mode").default(1),
	maintenanceMessage: text("maintenance_message").default(
		"Scheduled infrastructure validation in progress",
	),
	isActive: integer("is_active").default(1),
	lastRunAt: integer("last_run_at"),
	lastRunId: text("last_run_id").references(() => sentinelRuns.id, { onDelete: "set null" }),
	nextRunAt: integer("next_run_at"),
	alertOnFailure: integer("alert_on_failure").default(1),
	alertEmail: text("alert_email"),
	createdAt: integer("created_at")
		.notNull()
		.default(sql`(unixepoch())`),
	updatedAt: integer("updated_at")
		.notNull()
		.default(sql`(unixepoch())`),
});

export const sentinelTestData = sqliteTable("sentinel_test_data", {
	id: text("id").primaryKey(),
	tenantId: text("tenant_id").notNull(),
	data: text("data"),
	createdAt: integer("created_at")
		.notNull()
		.default(sql`(unixepoch())`),
});
