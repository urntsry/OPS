-- =====================================================
-- OPS profiles: 人員清冊擴充欄位
-- 目標：讓 HR RECORDS 完整對應公司「員工個人資料清單」表單
-- 安全：全部 ADD COLUMN IF NOT EXISTS，不影響既有資料
-- =====================================================

-- 身分證字號（敏感，僅 HR/admin 可見）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS id_number TEXT;

-- 血型（A / B / O / AB / 未填）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS blood_type TEXT;

-- Email
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS email TEXT;

-- 眷屬：配偶人數 / 子女人數
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS spouse_count INTEGER;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS children_count INTEGER;

-- 學歷三欄
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS education_level TEXT;   -- 最高學歷（高中/專科/大學…）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS education_school TEXT;  -- 最高學歷學校
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS education_major TEXT;   -- 科系

-- 緊急聯絡人關係（妻 / 夫 / 父 / 母 / 姐…）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS emergency_relation TEXT;

-- 備註：以下欄位先前已存在，這裡僅列出供對照，不重複新增
-- department, employee_id, full_name, phone, hire_date, birthday,
-- emergency_contact, emergency_phone, address
