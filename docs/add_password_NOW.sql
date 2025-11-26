-- =====================================================
-- 加入密碼欄位並設定預設值
-- =====================================================

-- 步驟 1: 加入 password 欄位（所有人預設 Ops2025!）
ALTER TABLE public.profiles 
ADD COLUMN password TEXT DEFAULT 'Ops2025!';

-- 步驟 2: 為管理員設定特殊密碼
UPDATE public.profiles 
SET password = 'Admin369888' 
WHERE employee_id IN ('70231', '70250', 'A0001');

-- 步驟 3: 確保所有現有員工都有密碼
UPDATE public.profiles 
SET password = 'Ops2025!' 
WHERE password IS NULL;

-- 步驟 4: 驗證設定成功
SELECT employee_id, full_name, role, password 
FROM public.profiles 
WHERE employee_id IN ('70037', '70231', '70250', 'A0001', '10003')
ORDER BY employee_id;

-- 步驟 5: 檢查所有人都有密碼
SELECT 
  COUNT(*) as total_users,
  COUNT(password) as users_with_password,
  COUNT(CASE WHEN password = 'Ops2025!' THEN 1 END) as regular_users,
  COUNT(CASE WHEN password = 'Admin369888' THEN 1 END) as admin_users
FROM public.profiles;

