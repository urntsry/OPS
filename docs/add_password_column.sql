-- =====================================================
-- 加入密碼欄位到 profiles 表
-- =====================================================

-- 1. 新增 password 欄位
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS password TEXT DEFAULT 'Ops2025!';

-- 2. 為管理員設定特殊密碼
UPDATE public.profiles 
SET password = 'Admin369888' 
WHERE employee_id IN ('70231', '70250', 'A0001');

-- 3. 驗證設定
SELECT employee_id, full_name, role, password 
FROM public.profiles 
WHERE employee_id IN ('70231', '70250', 'A0001', '70037', '10003')
ORDER BY employee_id;

-- 4. 確認所有人都有密碼
SELECT COUNT(*) as total, 
       COUNT(password) as with_password 
FROM public.profiles;

