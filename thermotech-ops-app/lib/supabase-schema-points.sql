-- =============================================
-- POINTS SYSTEM: Transaction-based point tracking
-- =============================================

-- 1. Points transactions table
CREATE TABLE IF NOT EXISTS points_transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  points INTEGER NOT NULL,
  source_type TEXT NOT NULL,  -- 'announcement_read', 'task_complete', 'bonus', 'redemption', 'penalty'
  source_id TEXT,             -- reference to bulletin/task/etc ID
  description TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Points redemption rules
CREATE TABLE IF NOT EXISTS points_rewards (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  points_cost INTEGER NOT NULL,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Index for fast user queries
CREATE INDEX IF NOT EXISTS idx_points_tx_user ON points_transactions(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_points_tx_source ON points_transactions(source_type, source_id);

-- 4. RLS
ALTER TABLE points_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE points_rewards ENABLE ROW LEVEL SECURITY;

CREATE POLICY "points_tx_read_all" ON points_transactions FOR SELECT USING (true);
CREATE POLICY "points_tx_insert" ON points_transactions FOR INSERT WITH CHECK (true);

CREATE POLICY "points_rewards_read_all" ON points_rewards FOR SELECT USING (true);
CREATE POLICY "points_rewards_manage" ON points_rewards FOR ALL USING (true);

-- 5. Function: award points (inserts transaction + updates balance)
CREATE OR REPLACE FUNCTION award_points(
  p_user_id UUID,
  p_points INTEGER,
  p_source_type TEXT,
  p_source_id TEXT DEFAULT NULL,
  p_description TEXT DEFAULT '',
  p_created_by UUID DEFAULT NULL
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  tx_id UUID;
BEGIN
  INSERT INTO points_transactions (user_id, points, source_type, source_id, description, created_by)
  VALUES (p_user_id, p_points, p_source_type, p_source_id, p_description, p_created_by)
  RETURNING id INTO tx_id;

  UPDATE profiles
  SET points_balance = COALESCE(points_balance, 0) + p_points
  WHERE id = p_user_id;

  RETURN tx_id;
END;
$$;

-- 6. View: monthly leaderboard
CREATE OR REPLACE VIEW points_monthly_leaderboard AS
SELECT
  p.id,
  p.employee_id,
  p.full_name,
  p.department,
  p.points_balance AS total_points,
  COALESCE(monthly.month_points, 0) AS month_points
FROM profiles p
LEFT JOIN (
  SELECT user_id, SUM(points) AS month_points
  FROM points_transactions
  WHERE created_at >= date_trunc('month', CURRENT_DATE)
  GROUP BY user_id
) monthly ON monthly.user_id = p.id
WHERE p.is_active = TRUE
ORDER BY p.points_balance DESC;
