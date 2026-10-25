-- Preserve the complete NHTSA decode on units; old rows are empty until explicitly decoded and saved.
ALTER TABLE trucks ADD COLUMN vin_data TEXT NOT NULL DEFAULT '';
