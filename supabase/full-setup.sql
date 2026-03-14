-- Lab Registry - Full setup (schema + seed)
-- Run in Supabase Dashboard → SQL Editor → Paste → Run

CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS app_users (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  email        text UNIQUE NOT NULL,
  password_hash text NOT NULL,
  role         text NOT NULL DEFAULT 'user' CHECK (role IN ('admin', 'user')),
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE app_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow auth via RPC only" ON app_users;
CREATE POLICY "Allow auth via RPC only" ON app_users FOR ALL USING (false);

CREATE OR REPLACE FUNCTION auth_app_user(p_email text, p_password text)
RETURNS TABLE(id uuid, email text, role text)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT au.id, au.email, au.role
  FROM app_users au
  WHERE au.email = p_email
    AND au.password_hash = extensions.crypt(p_password, au.password_hash);
$$;

GRANT EXECUTE ON FUNCTION auth_app_user(text, text) TO anon;

CREATE TABLE IF NOT EXISTS lab_audit (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id    text,
  patient_evm  text,
  test_name    text,
  result_value text,
  ai_summary   text,
  tx_id        text,
  status       text,
  created_at   timestamptz DEFAULT now()
);

ALTER TABLE lab_audit ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "lab_audit anon read" ON lab_audit;
DROP POLICY IF EXISTS "lab_audit anon insert" ON lab_audit;
CREATE POLICY "lab_audit anon read" ON lab_audit FOR SELECT TO anon USING (true);
CREATE POLICY "lab_audit anon insert" ON lab_audit FOR INSERT TO anon WITH CHECK (true);

INSERT INTO app_users (email, password_hash, role) VALUES
  ('demo@lab.local', extensions.crypt('Demo123!', extensions.gen_salt('bf')), 'admin'),
  ('user@lab.local', extensions.crypt('User123!', extensions.gen_salt('bf')), 'user')
ON CONFLICT (email) DO NOTHING;
