-- Migration to add verified_by to lab_audit
ALTER TABLE lab_audit ADD COLUMN IF NOT EXISTS verified_by text;
