-- Shop appointments are separate from authoritative fleet inspection and expiry dates.
-- Dates/times are wall-clock values in America/Winnipeg; end_date is inclusive.
CREATE TABLE IF NOT EXISTS shop_calendar_events (
  id TEXT PRIMARY KEY,
  revision TEXT NOT NULL,
  title TEXT NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  start_time TEXT NOT NULL DEFAULT '',
  end_time TEXT NOT NULL DEFAULT '',
  all_day INTEGER NOT NULL DEFAULT 1 CHECK (all_day IN (0, 1)),
  truck_id TEXT REFERENCES trucks(id) ON DELETE SET NULL,
  created_by_name TEXT NOT NULL,
  updated_by_name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE INDEX IF NOT EXISTS idx_shop_calendar_dates ON shop_calendar_events(start_date, end_date);
