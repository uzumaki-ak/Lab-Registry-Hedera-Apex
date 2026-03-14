-- Supabase SQL Editor - Migration Query
-- Run this in your Supabase SQL Editor to update your existing database

-- 1. Add the new patient_name column to the lab_audit table
ALTER TABLE lab_audit 
ADD COLUMN IF NOT EXISTS patient_name text;

-- 2. Verify the column exists by selecting from it (Optional)
-- SELECT id, patient_name, patient_evm FROM lab_audit LIMIT 5;
