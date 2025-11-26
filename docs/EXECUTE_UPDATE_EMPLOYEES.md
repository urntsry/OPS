-- =====================================================
-- 執行指南：更新為完整的 79 位員工
-- =====================================================

-- 步驟 1：在 Supabase SQL Editor 執行
-- 複製 OPS/docs/update_all_employees.sql 的全部內容並執行

-- 步驟 2：驗證匯入成功
SELECT COUNT(*) FROM public.profiles;
-- 應該顯示：79

-- 步驟 3：確認古志禹存在
SELECT * FROM public.profiles WHERE employee_id = '70231';
-- 應該顯示：古志禹 (70231), 管理部

-- 步驟 4：查看前 20 位員工
SELECT employee_id, full_name, department, role 
FROM public.profiles 
ORDER BY employee_id 
LIMIT 20;

