CREATE TABLE IF NOT EXISTS launch_signups (
  email TEXT PRIMARY KEY,
  language TEXT NOT NULL CHECK (language IN ('en', 'fr')),
  created_at INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  consent_version TEXT NOT NULL,
  removal_hash TEXT NOT NULL UNIQUE
);
CREATE INDEX IF NOT EXISTS launch_signups_expiry ON launch_signups(expires_at);
CREATE TABLE IF NOT EXISTS signup_daily_limits (
  day TEXT PRIMARY KEY,
  attempts INTEGER NOT NULL
);
