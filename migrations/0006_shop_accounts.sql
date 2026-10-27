-- Staff credentials and directory details for individual sign-in and shop attribution.
-- Supports both the shared fleet passcode and individual staff accounts.
CREATE TABLE IF NOT EXISTS shop_accounts (
  id TEXT PRIMARY KEY,
  display_name TEXT NOT NULL,
  username TEXT NOT NULL,
  password_salt TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  password_iterations INTEGER NOT NULL CHECK (password_iterations >= 100000),
  role TEXT NOT NULL DEFAULT 'technician' CHECK (role IN ('owner', 'manager', 'technician', 'viewer')),
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'suspended')),
  job_title TEXT NOT NULL DEFAULT '',
  badge_number TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  avatar_color TEXT NOT NULL DEFAULT '#3b82f6',
  last_login_at TEXT NOT NULL DEFAULT '',
  login_count INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_shop_accounts_username
  ON shop_accounts(lower(username));

CREATE TABLE IF NOT EXISTS shop_account_activity (
  id TEXT PRIMARY KEY,
  account_id TEXT,
  actor_name TEXT NOT NULL DEFAULT 'Shared Passcode',
  actor_username TEXT NOT NULL DEFAULT '',
  actor_role TEXT NOT NULL DEFAULT 'owner',
  actor_badge TEXT NOT NULL DEFAULT '',
  actor_color TEXT NOT NULL DEFAULT '#3b82f6',
  action TEXT NOT NULL,
  target_type TEXT NOT NULL DEFAULT '',
  target_id TEXT NOT NULL DEFAULT '',
  summary TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_shop_account_activity_created
  ON shop_account_activity(created_at DESC, id);

CREATE INDEX IF NOT EXISTS idx_shop_account_activity_target
  ON shop_account_activity(target_type, target_id);
