-- 檢查古志禹是否存在
SELECT * FROM public.profiles WHERE employee_id = '70231';

-- 如果上面沒結果，列出所有員工看看有哪些
SELECT employee_id, full_name, department, role 
FROM public.profiles 
ORDER BY employee_id 
LIMIT 20;

-- 檢查總共有多少員工
SELECT COUNT(*) FROM public.profiles;

