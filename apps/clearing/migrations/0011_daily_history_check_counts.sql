-- Grove Clearing: Daily History Check Counts
-- Migration: 0011_daily_history_check_counts.sql
--
-- status_daily_history.status used to record the WORST status seen that day,
-- which meant a single transient blip (e.g. one flaky 404) locked the whole
-- day's color in permanently. These columns let us track every individual
-- health check outcome so the day's status can be an average instead.

ALTER TABLE status_daily_history ADD COLUMN operational_checks INTEGER DEFAULT 0;
ALTER TABLE status_daily_history ADD COLUMN degraded_checks INTEGER DEFAULT 0;
ALTER TABLE status_daily_history ADD COLUMN partial_outage_checks INTEGER DEFAULT 0;
ALTER TABLE status_daily_history ADD COLUMN major_outage_checks INTEGER DEFAULT 0;
ALTER TABLE status_daily_history ADD COLUMN maintenance_checks INTEGER DEFAULT 0;
