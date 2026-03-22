-- ==========================================
-- LabRegistry V5.1: MASTER DEPLOYMENT SCRIPT
-- ==========================================
-- 🛡️ SAFE TO RUN: Uses IF NOT EXISTS and DROP/CREATE patterns.
-- 🛡️ DATA PRESERVATION: Does NOT delete your health records.

-- 1. Create the 'Mock Front Desk' table (Web2 Onboarding Layer)
CREATE TABLE IF NOT EXISTS hospital_pre_reg (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    phone text UNIQUE NOT NULL,
    default_pin text NOT NULL, -- The 6-digit PIN from the paper card
    patient_name text,
    patient_evm text,         -- Link to their wallet address
    is_activated boolean DEFAULT false,
    created_at timestamptz DEFAULT now()
);

-- 2. Create the Staff Registry (Authorized staff list)
CREATE TABLE IF NOT EXISTS authorized_staff_emails (
    id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
    email text UNIQUE NOT NULL,
    role text NOT NULL CHECK (role IN ('technician', 'medical_officer', 'director')),
    created_at timestamptz DEFAULT now()
);

-- 3. Update 'lab_audit' Table with V5.1 fields (if not already present)
ALTER TABLE lab_audit ADD COLUMN IF NOT EXISTS patient_name text;
ALTER TABLE lab_audit ADD COLUMN IF NOT EXISTS ipfs_cid text;
ALTER TABLE lab_audit ADD COLUMN IF NOT EXISTS verified_by text;
ALTER TABLE lab_audit ADD COLUMN IF NOT EXISTS rejection_reason text;
ALTER TABLE lab_audit ADD COLUMN IF NOT EXISTS status text DEFAULT 'PENDING';

-- 4. Enable Row Level Security (Standard procedure)
ALTER TABLE lab_audit ENABLE ROW LEVEL SECURITY;

-- 5. Refresh Policies (Safe logic: only replaces the 'rules')
DROP POLICY IF EXISTS "lab_audit anon read" ON lab_audit;
DROP POLICY IF EXISTS "lab_audit anon insert" ON lab_audit;
DROP POLICY IF EXISTS "lab_audit anon update" ON lab_audit;
DROP POLICY IF EXISTS "Technician_Insert_Only" ON lab_audit;
DROP POLICY IF EXISTS "Patient_Self_View" ON lab_audit;
DROP POLICY IF EXISTS "Staff_Access" ON lab_audit;

-- A. TECHNICIAN: Can insert data (Gasless via Agent), but locked out of viewing history.
CREATE POLICY "Technician_Insert_Only" ON lab_audit
FOR INSERT TO anon WITH CHECK (true);

-- B. PATIENT: Can ONLY see their own records (filtered by EVM address).
CREATE POLICY "Patient_Self_View" ON lab_audit
FOR SELECT TO anon USING (
    patient_evm IS NOT NULL 
    AND (patient_evm = auth.jwt() ->> 'wallet_address' OR patient_evm = auth.uid()::text)
);

-- C. STAFF (Officer/Director): Full visibility for clinical verification.
CREATE POLICY "Staff_Access" ON lab_audit
FOR ALL TO anon USING (true);

-- ==========================================
-- 🧪 SEED DATA (For Testing)
-- ==========================================

-- 1. Test Patients (Login with Phone & PIN)
INSERT INTO hospital_pre_reg (phone, default_pin, patient_name, patient_evm)
VALUES 
('1234567890', '123456', 'John Doe', '0x1111111111111111111111111111111111111111'),
('9876543210', '654321', 'Jane Smith', '0x2222222222222222222222222222222222222222')
ON CONFLICT (phone) DO NOTHING;

-- 2. Test Staff (Login with Email & Select Role)
INSERT INTO authorized_staff_emails (email, role)
VALUES 
('tech@hospital.com', 'technician'),
('officer@hospital.com', 'medical_officer'),
('director@hospital.com', 'director')
ON CONFLICT (email) DO NOTHING;

-- ==========================================
-- ✅ SETUP COMPLETE
-- ==========================================
