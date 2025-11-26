-- 緊急檢查：profiles 表是否有 password 欄位

-- 1. 檢查表結構
SELECT column_name, data_type, column_default
FROM information_schema.columns
WHERE table_schema = 'public' 
AND table_name = 'profiles'
ORDER BY ordinal_position;

-- 2. 檢查 70037 是否存在
SELECT * FROM public.profiles WHERE employee_id = '70037';

-- 3. 如果有 password 欄位，檢查值
SELECT employee_id, full_name, password 
FROM public.profiles 
WHERE employee_id IN ('70037', '70231', '70250', 'A0001')
LIMIT 5;

