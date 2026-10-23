-- Add Equipment / Body Type field after Model.
-- Existing records keep an empty string; next_due_date is already TEXT and accepts '' for units with no inspection date yet.
ALTER TABLE trucks ADD COLUMN equipment_type TEXT NOT NULL DEFAULT '';
