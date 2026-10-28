-- Existing local appointments remain single general-category events.
ALTER TABLE shop_calendar_events ADD COLUMN category TEXT NOT NULL DEFAULT 'general' CHECK (category IN ('general', 'inspection', 'repair', 'maintenance'));
ALTER TABLE shop_calendar_events ADD COLUMN recurrence TEXT NOT NULL DEFAULT 'none' CHECK (recurrence IN ('none', 'weekly', 'monthly'));
ALTER TABLE shop_calendar_events ADD COLUMN repeat_until TEXT NOT NULL DEFAULT '';
