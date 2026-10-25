-- Empty reminder_days inherits the fleet-wide notify_days preference.
ALTER TABLE trucks ADD COLUMN reminder_days TEXT NOT NULL DEFAULT '';
