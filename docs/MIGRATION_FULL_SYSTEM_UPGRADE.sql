-- =============================================
-- OPS FULL SYSTEM UPGRADE MIGRATION
-- Run this in Supabase SQL Editor (in order)
-- =============================================
-- Includes: Auth, HR, Points, Notifications, External Apps
-- Date: 2026-05-04

-- =============================================
-- SECTION 1: AUTH (bcrypt password)
-- =============================================
CREATE EXTENSION IF NOT EXISTS pgcrypto;

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_hash TEXT;

UPDATE profiles
SET password_hash = crypt(password, gen_salt('bf', 10))
WHERE password IS NOT NULL AND password != '' AND password_hash IS NULL;

CREATE OR REPLACE FUNCTION set_user_password(p_employee_id TEXT, p_new_password TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles SET password_hash = crypt(p_new_password, gen_salt('bf', 10))
  WHERE employee_id = p_employee_id;
  RETURN FOUND;
END;
$$;

CREATE OR REPLACE FUNCTION verify_password(p_employee_id TEXT, p_password TEXT)
RETURNS TABLE (id UUID, employee_id TEXT, full_name TEXT, department TEXT, job_title TEXT, role TEXT, points_balance INTEGER, site_code TEXT)
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.employee_id, p.full_name, p.department, p.job_title, p.role, p.points_balance, p.site_code
  FROM profiles p
  WHERE p.employee_id = p_employee_id AND p.password_hash = crypt(p_password, p.password_hash);
END;
$$;

-- =============================================
-- SECTION 2: HR FIELDS
-- =============================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hire_date DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS birthday DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_contact TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_phone TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS address TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS labor_insurance_date DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS health_insurance_date DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS contract_expiry DATE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS nationality TEXT DEFAULT '本國';
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_active BOOLEAN DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notes TEXT;

CREATE TABLE IF NOT EXISTS hr_events (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_date DATE NOT NULL DEFAULT CURRENT_DATE,
  description TEXT,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  profile_id UUID REFERENCES profiles(id) ON DELETE CASCADE,
  record_date DATE NOT NULL,
  clock_in TIME,
  clock_out TIME,
  overtime_hours NUMERIC(4,2) DEFAULT 0,
  leave_type TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(profile_id, record_date)
);

ALTER TABLE hr_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE attendance_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "hr_events_read_all" ON hr_events FOR SELECT USING (true);
CREATE POLICY "hr_events_insert_admin" ON hr_events FOR INSERT WITH CHECK (true);
CREATE POLICY "hr_events_update_admin" ON hr_events FOR UPDATE USING (true);
CREATE POLICY "attendance_read_all" ON attendance_records FOR SELECT USING (true);
CREATE POLICY "attendance_insert" ON attendance_records FOR INSERT WITH CHECK (true);

CREATE OR REPLACE VIEW hr_upcoming_expirations AS
SELECT p.id, p.employee_id, p.full_name, p.department, 'labor_insurance' AS expiry_type, p.labor_insurance_date AS expiry_date
FROM profiles p WHERE p.labor_insurance_date IS NOT NULL AND p.labor_insurance_date <= CURRENT_DATE + INTERVAL '30 days' AND p.is_active = TRUE
UNION ALL
SELECT p.id, p.employee_id, p.full_name, p.department, 'health_insurance', p.health_insurance_date
FROM profiles p WHERE p.health_insurance_date IS NOT NULL AND p.health_insurance_date <= CURRENT_DATE + INTERVAL '30 days' AND p.is_active = TRUE
UNION ALL
SELECT p.id, p.employee_id, p.full_name, p.department, 'contract', p.contract_expiry
FROM profiles p WHERE p.contract_expiry IS NOT NULL AND p.contract_expiry <= CURRENT_DATE + INTERVAL '30 days' AND p.is_active = TRUE;

-- =============================================
-- SECTION 3: POINTS SYSTEM
-- =============================================
CREATE TABLE IF NOT EXISTS points_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  source_type TEXT NOT NULL,
  source_id TEXT,
  description TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS points_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  points_cost INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_points_tx_user ON points_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_points_tx_source ON points_transactions(source_type, source_id);

ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_rewards ENABLE ROW LEVEL SECURITY;
CREATE POLICY "points_tx_read_all" ON points_transactions FOR SELECT USING (true);
CREATE POLICY "points_tx_insert" ON points_transactions FOR INSERT WITH CHECK (true);
CREATE POLICY "points_rewards_read_all" ON points_rewards FOR SELECT USING (true);
CREATE POLICY "points_rewards_manage" ON points_rewards FOR ALL USING (true);

CREATE OR REPLACE FUNCTION award_points(p_user_id UUID, p_points INTEGER, p_source_type TEXT, p_source_id TEXT DEFAULT NULL, p_description TEXT DEFAULT '', p_created_by UUID DEFAULT NULL)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE tx_id UUID;
BEGIN
  INSERT INTO points_transactions (user_id, points, source_type, source_id, description, created_by)
  VALUES (p_user_id, p_points, p_source_type, p_source_id, p_description, p_created_by)
  RETURNING id INTO tx_id;
  UPDATE profiles SET points_balance = COALESCE(points_balance, 0) + p_points WHERE id = p_user_id;
  RETURN tx_id;
END;
$$;

CREATE OR REPLACE VIEW points_monthly_leaderboard AS
SELECT p.id, p.employee_id, p.full_name, p.department, p.points_balance AS total_points,
  COALESCE(m.month_points, 0) AS month_points
FROM profiles p
LEFT JOIN (SELECT user_id, SUM(points) AS month_points FROM points_transactions WHERE created_at >= date_trunc('month', CURRENT_DATE) GROUP BY user_id) m ON m.user_id = p.id
WHERE p.is_active = TRUE
ORDER BY p.points_balance DESC;

-- =============================================
-- SECTION 4: NOTIFICATIONS / LINE BINDING
-- =============================================
CREATE TABLE IF NOT EXISTS notifications (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  body TEXT,
  link TEXT,
  channels TEXT[] DEFAULT ARRAY['in_app'],
  channel_status JSONB DEFAULT '{}',
  status TEXT DEFAULT 'pending',
  read_at TIMESTAMPTZ,
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),
  sent_at TIMESTAMPTZ,
  metadata JSONB,
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS line_user_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS line_binding_code TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS line_bound_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_prefs JSONB DEFAULT '{"calendar_event":["in_app","line"],"new_announcement":["in_app","line"],"task_assigned":["in_app","line"],"delegation_due":["in_app","line"],"fax_received":["in_app"],"meeting_reminder":["in_app","line"],"points_earned":["in_app"]}';

CREATE INDEX IF NOT EXISTS idx_notifications_user_status ON notifications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON notifications(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_profiles_line_binding ON profiles(line_binding_code) WHERE line_binding_code IS NOT NULL;

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_read_own" ON notifications FOR SELECT USING (true);
CREATE POLICY "notifications_insert" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (true);

CREATE OR REPLACE FUNCTION generate_line_binding_code(p_user_id UUID) RETURNS TEXT
LANGUAGE plpgsql SECURITY DEFINER AS $$
DECLARE code TEXT;
BEGIN
  code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
  UPDATE profiles SET line_binding_code = code WHERE id = p_user_id;
  RETURN code;
END;
$$;

CREATE OR REPLACE FUNCTION bind_line_account(p_binding_code TEXT, p_line_user_id TEXT) RETURNS BOOLEAN
LANGUAGE plpgsql SECURITY DEFINER AS $$
BEGIN
  UPDATE profiles SET line_user_id = p_line_user_id, line_bound_at = NOW(), line_binding_code = NULL
  WHERE line_binding_code = p_binding_code;
  RETURN FOUND;
END;
$$;

-- =============================================
-- SECTION 5: EXTERNAL APPS & DOWNLOADS
-- =============================================
CREATE TABLE IF NOT EXISTS external_apps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  icon TEXT DEFAULT 'globe',
  departments TEXT[] DEFAULT ARRAY['all'],
  is_active BOOLEAN DEFAULT TRUE,
  fullscreen_default BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS software_downloads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  version TEXT NOT NULL DEFAULT '1.0.0',
  department TEXT NOT NULL DEFAULT 'all',
  file_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  platform TEXT DEFAULT 'windows',
  changelog TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  download_count INTEGER DEFAULT 0,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE external_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE software_downloads ENABLE ROW LEVEL SECURITY;
CREATE POLICY "external_apps_read" ON external_apps FOR SELECT USING (true);
CREATE POLICY "external_apps_manage" ON external_apps FOR ALL USING (true);
CREATE POLICY "software_downloads_read" ON software_downloads FOR SELECT USING (true);
CREATE POLICY "software_downloads_manage" ON software_downloads FOR ALL USING (true);

-- =============================================
-- DONE
-- =============================================
