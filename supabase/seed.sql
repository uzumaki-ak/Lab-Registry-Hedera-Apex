-- Lab Registry - Seed demo users
-- Run this AFTER schema.sql in Supabase SQL Editor

-- Demo admin:  demo@lab.local / Demo123!
-- Demo user:   user@lab.local / User123!
INSERT INTO app_users (email, password_hash, role) VALUES
  ('demo@lab.local', crypt('Demo123!', gen_salt('bf')), 'admin'),
  ('user@lab.local', crypt('User123!', gen_salt('bf')), 'user')
ON CONFLICT (email) DO NOTHING;
