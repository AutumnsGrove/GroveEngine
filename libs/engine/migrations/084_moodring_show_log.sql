-- Add show_mood_log toggle to mood ring config
-- When enabled, the public component renders a dot constellation of mood history

ALTER TABLE mood_ring_config ADD COLUMN show_mood_log INTEGER NOT NULL DEFAULT 0;
