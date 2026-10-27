-- General unit documents are separate from inspection certificate attachments.
CREATE TABLE IF NOT EXISTS shop_unit_documents (
  id TEXT PRIMARY KEY,
  truck_id TEXT NOT NULL,
  document_type TEXT NOT NULL CHECK (document_type IN ('registration', 'insurance', 'permit', 'maintenance', 'general')),
  label TEXT NOT NULL DEFAULT '',
  file_name TEXT NOT NULL,
  content_type TEXT NOT NULL CHECK (content_type IN ('application/pdf', 'image/jpeg', 'image/png', 'image/webp')),
  size_bytes INTEGER NOT NULL CHECK (size_bytes > 0 AND size_bytes <= 10485760),
  expiry_date TEXT NOT NULL DEFAULT '',
  r2_key TEXT NOT NULL UNIQUE,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),
  FOREIGN KEY (truck_id) REFERENCES trucks(id) ON DELETE CASCADE
);

CREATE INDEX IF NOT EXISTS idx_shop_unit_documents_truck
  ON shop_unit_documents(truck_id, created_at DESC, id);
CREATE INDEX IF NOT EXISTS idx_shop_unit_documents_expiry
  ON shop_unit_documents(expiry_date);
