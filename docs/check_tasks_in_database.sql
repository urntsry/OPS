-- 檢查 Supabase 資料庫中的任務數量

-- 1. 檢查 task_definitions 表是否存在
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name = 'task_definitions';

-- 2. 檢查任務數量
SELECT COUNT(*) as total_tasks 
FROM public.task_definitions;

-- 3. 查看所有任務（前 20 筆）
SELECT id, title, frequency, site_location, is_active, source_file
FROM public.task_definitions
ORDER BY id
LIMIT 20;

-- 4. 按來源檔案統計
SELECT source_file, COUNT(*) as count
FROM public.task_definitions
GROUP BY source_file
ORDER BY count DESC;

-- 5. 按廠區統計
SELECT site_location, COUNT(*) as count
FROM public.task_definitions
GROUP BY site_location
ORDER BY count DESC;

