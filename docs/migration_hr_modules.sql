-- =====================================================
-- HR 模組：加班管理 / 考勤統計 / 紅利分配
-- =====================================================

-- =====================================================
-- 1. 加班紀錄表 (overtime_records)
-- =====================================================
CREATE TABLE IF NOT EXISTS overtime_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  record_date DATE NOT NULL,
  weekday TEXT,
  overtime_type1_hours NUMERIC(5,2) DEFAULT 0,
  overtime_type2_hours NUMERIC(5,2) DEFAULT 0,
  note TEXT,
  month_period TEXT NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, record_date)
);

COMMENT ON TABLE overtime_records IS '加班紀錄：每位員工每日的加班I/II時數';
COMMENT ON COLUMN overtime_records.month_period IS '月份區間，格式 YYYY-MM';
COMMENT ON COLUMN overtime_records.overtime_type1_hours IS '加班I時數（前2小時）';
COMMENT ON COLUMN overtime_records.overtime_type2_hours IS '加班II時數（超過2小時）';

ALTER TABLE overtime_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY overtime_records_read ON overtime_records FOR SELECT USING (true);
CREATE POLICY overtime_records_write ON overtime_records FOR INSERT WITH CHECK (true);
CREATE POLICY overtime_records_update ON overtime_records FOR UPDATE USING (true);
CREATE POLICY overtime_records_delete ON overtime_records FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_overtime_records_profile ON overtime_records(profile_id);
CREATE INDEX IF NOT EXISTS idx_overtime_records_month ON overtime_records(month_period);
CREATE INDEX IF NOT EXISTS idx_overtime_records_date ON overtime_records(record_date);

-- =====================================================
-- 2. 請假紀錄表 (leave_records)
-- =====================================================
CREATE TABLE IF NOT EXISTS leave_records (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  leave_type TEXT NOT NULL,
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL,
  days NUMERIC(5,2) DEFAULT 0,
  hours NUMERIC(5,2) DEFAULT 0,
  reason TEXT,
  year INTEGER NOT NULL,
  created_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE leave_records IS '請假紀錄：事假、病假、生理假、家庭照顧假等';

ALTER TABLE leave_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY leave_records_read ON leave_records FOR SELECT USING (true);
CREATE POLICY leave_records_write ON leave_records FOR INSERT WITH CHECK (true);
CREATE POLICY leave_records_update ON leave_records FOR UPDATE USING (true);
CREATE POLICY leave_records_delete ON leave_records FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_leave_records_profile ON leave_records(profile_id);
CREATE INDEX IF NOT EXISTS idx_leave_records_year ON leave_records(year);
CREATE INDEX IF NOT EXISTS idx_leave_records_type ON leave_records(leave_type);

-- =====================================================
-- 3. 出缺勤異常表 (attendance_anomalies)
-- =====================================================
CREATE TABLE IF NOT EXISTS attendance_anomalies (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  anomaly_type TEXT NOT NULL,
  anomaly_date DATE,
  count INTEGER DEFAULT 1,
  note TEXT,
  year INTEGER NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE attendance_anomalies IS '出缺勤異常：遲到、早退、曠職、漏刷、忘打卡等';

ALTER TABLE attendance_anomalies ENABLE ROW LEVEL SECURITY;
CREATE POLICY attendance_anomalies_read ON attendance_anomalies FOR SELECT USING (true);
CREATE POLICY attendance_anomalies_write ON attendance_anomalies FOR INSERT WITH CHECK (true);
CREATE POLICY attendance_anomalies_update ON attendance_anomalies FOR UPDATE USING (true);
CREATE POLICY attendance_anomalies_delete ON attendance_anomalies FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_anomalies_profile ON attendance_anomalies(profile_id);
CREATE INDEX IF NOT EXISTS idx_anomalies_year ON attendance_anomalies(year);

-- =====================================================
-- 4. 年度休假餘額表 (annual_leave_balance)
-- =====================================================
CREATE TABLE IF NOT EXISTS annual_leave_balance (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  year INTEGER NOT NULL,
  entitled_days NUMERIC(5,1) DEFAULT 0,
  used_days NUMERIC(5,1) DEFAULT 0,
  converted_to_pay NUMERIC(5,1) DEFAULT 0,
  carried_over NUMERIC(5,1) DEFAULT 0,
  remaining NUMERIC(5,1) DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, year)
);

COMMENT ON TABLE annual_leave_balance IS '年度休假餘額：特休可休/已休/轉代金/保留/剩餘';

ALTER TABLE annual_leave_balance ENABLE ROW LEVEL SECURITY;
CREATE POLICY annual_leave_read ON annual_leave_balance FOR SELECT USING (true);
CREATE POLICY annual_leave_write ON annual_leave_balance FOR INSERT WITH CHECK (true);
CREATE POLICY annual_leave_update ON annual_leave_balance FOR UPDATE USING (true);
CREATE POLICY annual_leave_delete ON annual_leave_balance FOR DELETE USING (true);

-- =====================================================
-- 5. 紅利月結表 (bonus_monthly)
-- =====================================================
CREATE TABLE IF NOT EXISTS bonus_monthly (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL,
  hourly_rate NUMERIC(8,2) DEFAULT 0,
  half_hour_count INTEGER DEFAULT 0,
  meal_allowance NUMERIC(8,2) DEFAULT 0,
  monthly_total NUMERIC(10,2) DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(profile_id, year_month)
);

COMMENT ON TABLE bonus_monthly IS '紅利月結：每月出勤次數、時薪、伙食費、月小計';

ALTER TABLE bonus_monthly ENABLE ROW LEVEL SECURITY;
CREATE POLICY bonus_monthly_read ON bonus_monthly FOR SELECT USING (true);
CREATE POLICY bonus_monthly_write ON bonus_monthly FOR INSERT WITH CHECK (true);
CREATE POLICY bonus_monthly_update ON bonus_monthly FOR UPDATE USING (true);
CREATE POLICY bonus_monthly_delete ON bonus_monthly FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_bonus_monthly_profile ON bonus_monthly(profile_id);
CREATE INDEX IF NOT EXISTS idx_bonus_monthly_month ON bonus_monthly(year_month);

-- =====================================================
-- 6. 獎懲紀錄表 (bonus_penalties)
-- =====================================================
CREATE TABLE IF NOT EXISTS bonus_penalties (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  year_month TEXT NOT NULL,
  reason TEXT NOT NULL,
  penalty_type TEXT NOT NULL,
  amount NUMERIC(10,2) DEFAULT 0,
  note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE bonus_penalties IS '獎懲紀錄：申誡、記過等及對應扣款';

ALTER TABLE bonus_penalties ENABLE ROW LEVEL SECURITY;
CREATE POLICY bonus_penalties_read ON bonus_penalties FOR SELECT USING (true);
CREATE POLICY bonus_penalties_write ON bonus_penalties FOR INSERT WITH CHECK (true);
CREATE POLICY bonus_penalties_update ON bonus_penalties FOR UPDATE USING (true);
CREATE POLICY bonus_penalties_delete ON bonus_penalties FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_bonus_penalties_profile ON bonus_penalties(profile_id);
CREATE INDEX IF NOT EXISTS idx_bonus_penalties_month ON bonus_penalties(year_month);

-- =====================================================
-- 7. profiles 新增 hr_access 欄位
-- =====================================================
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS hr_access BOOLEAN DEFAULT FALSE;

COMMENT ON COLUMN profiles.hr_access IS '是否有 HR 模組存取權限（非 admin 也可操作 HR）';

CREATE INDEX IF NOT EXISTS idx_profiles_hr_access ON profiles(hr_access) WHERE hr_access = true;

-- =====================================================
-- 8. 更新 verify_password 函式，加入 hr_access 回傳
-- =====================================================
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
  hr_access BOOLEAN
)
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN QUERY
  SELECT
    p.id,
    p.employee_id,
    p.full_name,
    p.department,
    p.job_title,
    p.role,
    p.points_balance,
    p.site_code,
    p.hr_access
  FROM profiles p
  WHERE p.employee_id = p_employee_id
    AND p.password_hash = crypt(p_password, p.password_hash);
END;
$$;

-- =====================================================
-- 9. 設定員工 70257 的 HR 存取權限
-- =====================================================
UPDATE profiles SET hr_access = TRUE WHERE employee_id = '70257';
