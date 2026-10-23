-- This app has one passcode-protected fleet, not individual accounts.
-- user_id is assigned by the server, never accepted from the browser.
CREATE TABLE IF NOT EXISTS push_subscriptions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL DEFAULT 'fleet',
  endpoint TEXT NOT NULL UNIQUE,
  p256dh TEXT NOT NULL,
  auth TEXT NOT NULL,
  expiration_time INTEGER,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  last_success_at TEXT,
  last_attempt_at TEXT,
  last_status INTEGER,
  last_test_at INTEGER,
  last_daily_date TEXT
);
CREATE INDEX IF NOT EXISTS idx_push_user ON push_subscriptions(user_id);
