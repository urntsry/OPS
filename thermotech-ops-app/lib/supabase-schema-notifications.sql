-- =============================================
-- NOTIFICATIONS: Enhanced schema for LINE binding + preferences
-- =============================================

-- 1. Ensure notifications table exists
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

-- 2. LINE binding fields on profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS line_user_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS line_binding_code TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS line_bound_at TIMESTAMPTZ;

-- 3. Notification preferences per user
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_prefs JSONB DEFAULT '{
  "calendar_event": ["in_app", "line"],
  "new_announcement": ["in_app", "line"],
  "task_assigned": ["in_app", "line"],
  "delegation_due": ["in_app", "line"],
  "fax_received": ["in_app"],
  "meeting_reminder": ["in_app", "line"],
  "points_earned": ["in_app"]
}';

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_notifications_user_status ON notifications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_scheduled ON notifications(status, scheduled_at);
CREATE INDEX IF NOT EXISTS idx_profiles_line_binding ON profiles(line_binding_code) WHERE line_binding_code IS NOT NULL;

-- 5. RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
CREATE POLICY "notifications_read_own" ON notifications FOR SELECT USING (true);
CREATE POLICY "notifications_insert" ON notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "notifications_update" ON notifications FOR UPDATE USING (true);

-- 6. Function: generate LINE binding code
CREATE OR REPLACE FUNCTION generate_line_binding_code(p_user_id UUID)
RETURNS TEXT
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  code TEXT;
BEGIN
  code := upper(substr(md5(random()::text || clock_timestamp()::text), 1, 6));
  
  UPDATE profiles
  SET line_binding_code = code
  WHERE id = p_user_id;
  
  RETURN code;
END;
$$;

-- 7. Function: bind LINE account using code
CREATE OR REPLACE FUNCTION bind_line_account(p_binding_code TEXT, p_line_user_id TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET line_user_id = p_line_user_id,
      line_bound_at = NOW(),
      line_binding_code = NULL
  WHERE line_binding_code = p_binding_code;
  
  RETURN FOUND;
END;
$$;
