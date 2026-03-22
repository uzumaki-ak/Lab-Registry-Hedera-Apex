-- V5.1 SEED DATA FOR TESTING

-- 1. Patients (Phone/PIN Signup)
-- In the signup UI, use these combinations:
INSERT INTO hospital_pre_reg (phone_number, hashed_pin, patient_evm)
VALUES 
('1234567890', '123456', '0x1000000000000000000000000000000000000001'),
('9876543210', '654321', '0x2000000000000000000000000000000000000002')
ON CONFLICT (phone_number) DO NOTHING;

-- 2. Staff (Email/Role Signup)
-- In the signup UI, use these emails and select the corresponding role:
INSERT INTO authorized_staff_emails (email, role)
VALUES 
('tech@hospital.com', 'technician'),
('officer@hospital.com', 'medical_officer'),
('director@hospital.com', 'director')
ON CONFLICT (email) DO NOTHING;
