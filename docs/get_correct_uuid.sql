-- 查詢古志禹 (70231) 的正確 UUID

SELECT id, employee_id, full_name, department, role
FROM public.profiles
WHERE employee_id = '70231';

-- 如果找不到，列出所有員工
SELECT id, employee_id, full_name, department, role
FROM public.profiles
ORDER BY employee_id;

