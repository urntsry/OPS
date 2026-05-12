-- =====================================================
-- OPS profiles: 新增 Capacity 功能所需欄位
-- 用於 LINE Bot webhook 中的加班、語音建單等流程
-- =====================================================

-- 業務代碼（如 H, K 等）— 對應 Capacity company_personnel.sales_code
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS sales_code CHAR(1);

-- 班別 — 對應 Capacity company_personnel.shift_type
-- 'normal' (8:30-17:30), 'early' (8:00), 'late' (9:00), 'late_plus' (9:30), 'exempt' (免打卡)
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS shift_type TEXT DEFAULT 'normal';

-- 是否為主管（加班審核用）— 對應 Capacity company_personnel.is_supervisor
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS is_supervisor BOOLEAN DEFAULT FALSE;

-- 索引
CREATE INDEX IF NOT EXISTS idx_profiles_sales_code ON profiles(sales_code) WHERE sales_code IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_profiles_line_user_id ON profiles(line_user_id) WHERE line_user_id IS NOT NULL;
