-- Initial schema for Truck Safety Tracker

CREATE TABLE IF NOT EXISTS trucks (
  id TEXT PRIMARY KEY,
  unit_number TEXT NOT NULL,
  vehicle_type TEXT NOT NULL DEFAULT 'Tractor',
  gvwr TEXT NOT NULL DEFAULT '',
  license_plate TEXT NOT NULL DEFAULT '',
  vin TEXT NOT NULL DEFAULT '',
  year INTEGER,
  make TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  last_inspection_date TEXT NOT NULL DEFAULT '',
  next_due_date TEXT NOT NULL,
  interval_months INTEGER NOT NULL DEFAULT 12,
  shop_name TEXT NOT NULL DEFAULT '',
  sticker_number TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL DEFAULT 'Active',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_trucks_next_due ON trucks(next_due_date);
CREATE INDEX IF NOT EXISTS idx_trucks_unit_number ON trucks(unit_number);
CREATE INDEX IF NOT EXISTS idx_trucks_vehicle_type ON trucks(vehicle_type);

CREATE TABLE IF NOT EXISTS inspections (
  id TEXT PRIMARY KEY,
  truck_id TEXT NOT NULL,
  inspection_date TEXT NOT NULL,
  expiration_date TEXT NOT NULL,
  shop_name TEXT NOT NULL DEFAULT '',
  sticker_number TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (truck_id) REFERENCES trucks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_inspections_truck_id ON inspections(truck_id, inspection_date DESC);

CREATE TABLE IF NOT EXISTS attachments (
  id TEXT PRIMARY KEY,
  truck_id TEXT NOT NULL,
  inspection_id TEXT,
  file_name TEXT NOT NULL,
  content_type TEXT NOT NULL DEFAULT 'application/octet-stream',
  size_bytes INTEGER NOT NULL DEFAULT 0,
  r2_key TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (truck_id) REFERENCES trucks(id) ON DELETE CASCADE,
  FOREIGN KEY (inspection_id) REFERENCES inspections(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_attachments_truck_id ON attachments(truck_id);
CREATE INDEX IF NOT EXISTS idx_attachments_inspection_id ON attachments(inspection_id);

CREATE TABLE IF NOT EXISTS settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

INSERT OR IGNORE INTO settings (key, value) VALUES
  ('warning_days', '30'),
  ('webhook_url', ''),
  ('webhook_type', 'auto'),
  ('notify_days', '30,14,7,1,0');
