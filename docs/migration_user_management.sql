-- =====================================================
-- 使用者管理升級：角色分層 / 模組存取 / 密碼政策
-- 角色：admin（全系統）/ manager（部門主管）/ user（一般員工）
-- 模組存取：部門 → 模組對應 + 個人 override
-- 密碼：首登強制改密 + 自助改密 + 移除明碼欄位
-- =====================================================

-- ---------- 1. profiles 密碼政策欄位 ----------
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS must_change_password BOOLEAN NOT NULL DEFAULT TRUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS password_changed_at TIMESTAMPTZ;

COMMENT ON COLUMN profiles.must_change_password IS '首次登入或被重設後需強制修改密碼';
COMMENT ON COLUMN profiles.password_changed_at IS '最後一次成功修改密碼的時間';

-- 已知目前所有人共用密碼，全部標記為需強制改密（admin 可自行調整）
UPDATE profiles SET must_change_password = TRUE WHERE password_changed_at IS NULL;

-- ---------- 2. 部門 → 模組 對應表 ----------
CREATE TABLE IF NOT EXISTS department_module_access (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  department TEXT NOT NULL,
  module_id TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(department, module_id)
);
COMMENT ON TABLE department_module_access IS '部門可存取的模組（一筆 = 該部門可見該模組）';

ALTER TABLE department_module_access ENABLE ROW LEVEL SECURITY;
CREATE POLICY dma_read ON department_module_access FOR SELECT USING (true);
CREATE POLICY dma_write ON department_module_access FOR INSERT WITH CHECK (true);
CREATE POLICY dma_update ON department_module_access FOR UPDATE USING (true);
CREATE POLICY dma_delete ON department_module_access FOR DELETE USING (true);

-- ---------- 3. 個人模組 override 表 ----------
CREATE TABLE IF NOT EXISTS user_module_overrides (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  module_id TEXT NOT NULL,
  allowed BOOLEAN NOT NULL,   -- true = 額外開放, false = 額外關閉（覆蓋部門預設）
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, module_id)
);
COMMENT ON TABLE user_module_overrides IS '個人模組例外：allowed=true 額外開放，false 額外關閉';

ALTER TABLE user_module_overrides ENABLE ROW LEVEL SECURITY;
CREATE POLICY umo_read ON user_module_overrides FOR SELECT USING (true);
CREATE POLICY umo_write ON user_module_overrides FOR INSERT WITH CHECK (true);
CREATE POLICY umo_update ON user_module_overrides FOR UPDATE USING (true);
CREATE POLICY umo_delete ON user_module_overrides FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_umo_profile ON user_module_overrides(profile_id);

-- ---------- 4. 預設部門 → 模組 對應（可於設定頁後續調整）----------
-- 基本模組：所有部門都給 meeting / points / appcenter
INSERT INTO department_module_access (department, module_id)
SELECT d, m FROM (SELECT DISTINCT department FROM profiles WHERE department IS NOT NULL) AS depts(d)
CROSS JOIN (VALUES ('meeting'), ('points'), ('appcenter')) AS mods(m)
ON CONFLICT (department, module_id) DO NOTHING;

-- 管理部：加開 fax / sales / capacity
INSERT INTO department_module_access (department, module_id) VALUES
  ('管理部', 'fax'), ('管理部', 'sales'), ('管理部', 'capacity')
ON CONFLICT (department, module_id) DO NOTHING;

-- 業務相關（高上 / 日本）：加開 sales / capacity
INSERT INTO department_module_access (department, module_id) VALUES
  ('高上', 'sales'), ('高上', 'capacity'),
  ('日本', 'sales'), ('日本', 'capacity')
ON CONFLICT (department, module_id) DO NOTHING;

-- 廠務部：加開 capacity
INSERT INTO department_module_access (department, module_id) VALUES
  ('廠務部', 'capacity')
ON CONFLICT (department, module_id) DO NOTHING;

-- 個人 override：張夢茹(70257) 額外開放 hr
INSERT INTO user_module_overrides (profile_id, module_id, allowed)
SELECT id, 'hr', TRUE FROM profiles WHERE employee_id = '70257'
ON CONFLICT (profile_id, module_id) DO NOTHING;

-- ---------- 5. 更新 verify_password（回傳 must_change_password）----------
DROP FUNCTION IF EXISTS verify_password(text, text);
CREATE OR REPLACE FUNCTION verify_password(p_employee_id TEXT, p_password TEXT)
RETURNS TABLE (
  id UUID,
  employee_id TEXT,
  full_name TEXT,
  department TEXT,
  job_title TEXT,
  role TEXT,
  points_balance INTEGER,
  site_code TEXT,
  hr_access BOOLEAN,
  must_change_password BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT p.id, p.employee_id, p.full_name, p.department, p.job_title, p.role,
         p.points_balance, p.site_code, p.hr_access, p.must_change_password
  FROM profiles p
  WHERE p.employee_id = p_employee_id
    AND p.password_hash = crypt(p_password, p.password_hash);
END;
$$;

-- ---------- 6. set_user_password（重設：可設定是否強制改密）----------
DROP FUNCTION IF EXISTS set_user_password(text, text);
DROP FUNCTION IF EXISTS set_user_password(text, text, boolean);
CREATE OR REPLACE FUNCTION set_user_password(
  p_employee_id TEXT,
  p_new_password TEXT,
  p_must_change BOOLEAN DEFAULT TRUE
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  UPDATE profiles
  SET password_hash = crypt(p_new_password, gen_salt('bf', 10)),
      must_change_password = p_must_change,
      password_changed_at = NOW()
  WHERE employee_id = p_employee_id;
  RETURN FOUND;
END;
$$;

-- ---------- 7. change_own_password（自助/首登改密，需驗證舊密碼）----------
CREATE OR REPLACE FUNCTION change_own_password(
  p_employee_id TEXT,
  p_old_password TEXT,
  p_new_password TEXT
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_ok BOOLEAN;
BEGIN
  SELECT (password_hash = crypt(p_old_password, password_hash)) INTO v_ok
  FROM profiles WHERE employee_id = p_employee_id;

  IF v_ok IS NOT TRUE THEN
    RETURN FALSE;  -- 舊密碼不符
  END IF;

  UPDATE profiles
  SET password_hash = crypt(p_new_password, gen_salt('bf', 10)),
      must_change_password = FALSE,
      password_changed_at = NOW()
  WHERE employee_id = p_employee_id;
  RETURN TRUE;
END;
$$;

-- ---------- 8. 移除明碼密碼欄位（雜湊已存在，登入不依賴明碼）----------
ALTER TABLE profiles DROP COLUMN IF EXISTS password;
