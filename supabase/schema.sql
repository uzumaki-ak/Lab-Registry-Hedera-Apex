-- Lab Registry - Supabase schema
-- Run this in: Supabase Dashboard → SQL Editor → New query → Paste & Run

-- Enable pgcrypto for password hashing
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- App users (for demo login - replace with Supabase Auth later)
CREATE TABLE IF NOT EXISTS app_users (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email      text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role       text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at timestamptz DEFAULT now()
);

-- RLS: block direct table access; auth via RPC only
ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow auth via RPC only" ON app_users
  FOR ALL USING (false);

-- Auth function (returns user row if email+password match)
CREATE OR REPLACE FUNCTION auth_app_user(p_email text, p_password text)
RETURNS TABLE(id uuid, email text, role text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT au.id, au.email, au.role
  FROM app_users au
  WHERE au.email = p_email
    AND au.password_hash = crypt(p_password, au.password_hash);
$$;

-- Allow anon (frontend) to call auth
GRANT EXECUTE ON FUNCTION auth_app_user(text, text) TO anon;

-- Lab audit (stores reports; can be populated from agent/Mirror Node)
CREATE TABLE IF NOT EXISTS lab_audit (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id     text,
  patient_evm   text,
  patient_name  text,
  test_name     text,
  result_value  text,
  ai_summary    text,
  tx_id         text,
  status        text,
  created_at    timestamptz DEFAULT now()
);

ALTER TABLE lab_audit ENABLE ROW LEVEL SECURITY;

-- Allow anon to read/insert lab_audit for demo (tighten later)
CREATE POLICY "lab_audit anon read" ON lab_audit FOR SELECT TO anon USING (true);
CREATE POLICY "lab_audit anon insert" ON lab_audit FOR INSERT TO anon WITH CHECK (true);
