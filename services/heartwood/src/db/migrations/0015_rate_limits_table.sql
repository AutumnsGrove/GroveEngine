-- Track the rate_limits table already live in production D1.
--
-- This table backs Better Auth's customStorage rate limiter (src/auth/index.ts)
-- and Grove's own checkRateLimit (src/db/queries/rate-limiting.ts). It has
-- existed in prod since before this migration history started tracking it —
-- only ever documented as a comment in 0001_better_auth.sql — so this closes
-- that drift rather than creating new state. IF NOT EXISTS makes it a no-op
-- against the existing prod table.
CREATE TABLE IF NOT EXISTS rate_limits (
    key TEXT PRIMARY KEY,
    count INTEGER DEFAULT 1,
    window_start TEXT DEFAULT CURRENT_TIMESTAMP
);
