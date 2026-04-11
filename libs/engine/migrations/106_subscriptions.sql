-- Migration 106: Subscriptions v1
-- Email notifications when followed groves publish new posts (#1547)

-- Subscription records: wanderer subscribes to a grove's email notifications
CREATE TABLE IF NOT EXISTS subscriptions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    target_tenant_id TEXT NOT NULL,
    email TEXT NOT NULL,
    preferred_hour INTEGER DEFAULT 9,
    timezone TEXT DEFAULT 'America/New_York',
    created_at INTEGER DEFAULT (unixepoch()),
    UNIQUE(user_id, target_tenant_id)
);

CREATE INDEX IF NOT EXISTS idx_subscriptions_target ON subscriptions(target_tenant_id);
CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);

-- Pending notifications: captured on post publish, consumed by digest cron
CREATE TABLE IF NOT EXISTS pending_notifications (
    id TEXT PRIMARY KEY,
    target_tenant_id TEXT NOT NULL,
    tenant_name TEXT,
    tenant_subdomain TEXT NOT NULL,
    post_slug TEXT NOT NULL,
    post_title TEXT NOT NULL,
    post_excerpt TEXT,
    post_image TEXT,
    published_at INTEGER NOT NULL,
    created_at INTEGER DEFAULT (unixepoch()),
    UNIQUE(target_tenant_id, post_slug)
);

CREATE INDEX IF NOT EXISTS idx_pending_tenant ON pending_notifications(target_tenant_id);

-- Unsubscribe tokens: one-click, no-login-required unsubscribe via signed URL
CREATE TABLE IF NOT EXISTS subscription_unsubscribe_tokens (
    id TEXT PRIMARY KEY,
    subscription_id TEXT NOT NULL,
    token TEXT UNIQUE NOT NULL,
    created_at INTEGER DEFAULT (unixepoch()),
    FOREIGN KEY (subscription_id) REFERENCES subscriptions(id) ON DELETE CASCADE
);
