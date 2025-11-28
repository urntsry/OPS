-- ============================================
-- 修正任務 ID 跳號問題（可選執行）
-- ============================================
-- 
-- 問題說明：
-- - 因為刪除任務後，PostgreSQL 的 sequence 不會自動回收 ID
-- - 導致 ID 出現跳號（例如 98 → 105）
-- 
-- 解決方案：
-- - 方案 A：保持現狀（推薦）- ID 跳號不影響功能
-- - 方案 B：重新編號（下方 SQL）- 會改變所有任務的 ID
-- 
-- ⚠️ 警告：
-- - 方案 B 會修改所有任務的 ID
-- - 如果有其他表引用 task_definitions.id，可能會造成關聯錯誤
-- - 建議只在測試階段執行
-- ============================================

-- 方案 A：僅重置 sequence（推薦）
-- 這不會改變現有任務的 ID，只是讓新任務從正確的編號開始
DO $$ 
DECLARE
  max_id INTEGER;
BEGIN
  -- 取得當前最大 ID
  SELECT COALESCE(MAX(id), 0) INTO max_id FROM task_definitions;
  
  -- 重置 sequence
  EXECUTE format('ALTER SEQUENCE task_definitions_id_seq RESTART WITH %s', max_id + 1);
  
  RAISE NOTICE '✓ Sequence 已重置，下一個 ID 將是: %', max_id + 1;
END $$;

-- 驗證
SELECT 
  last_value as current_sequence_value,
  (SELECT MAX(id) FROM task_definitions) as max_task_id
FROM task_definitions_id_seq;


-- ============================================
-- 方案 B：完全重新編號（⚠️ 謹慎使用）
-- ============================================
-- 
-- ⚠️ 執行前請先備份資料！
-- ⚠️ 這會改變所有任務的 ID！
-- 
-- 步驟：
-- 1. 停用 daily_assignments 的外鍵約束
-- 2. 重新編號 task_definitions
-- 3. 更新 daily_assignments 的 task_def_id
-- 4. 恢復外鍵約束
-- 5. 重置 sequence

/*
-- 取消下方註解以執行完全重新編號

-- 步驟 1：建立臨時映射表
CREATE TEMP TABLE id_mapping AS
SELECT 
  id as old_id, 
  ROW_NUMBER() OVER (ORDER BY id) as new_id
FROM task_definitions;

-- 步驟 2：更新 daily_assignments 的 task_def_id
UPDATE daily_assignments da
SET task_def_id = im.new_id
FROM id_mapping im
WHERE da.task_def_id = im.old_id;

-- 步驟 3：更新 task_definitions 的 id
UPDATE task_definitions td
SET id = im.new_id
FROM id_mapping im
WHERE td.id = im.old_id;

-- 步驟 4：重置 sequence
SELECT setval('task_definitions_id_seq', (SELECT MAX(id) FROM task_definitions));

-- 步驟 5：清理
DROP TABLE id_mapping;

-- 驗證
SELECT COUNT(*) as total_tasks, MIN(id) as min_id, MAX(id) as max_id 
FROM task_definitions;

SELECT COUNT(*) as total_gaps 
FROM generate_series(
  (SELECT MIN(id) FROM task_definitions),
  (SELECT MAX(id) FROM task_definitions)
) as id
WHERE id NOT IN (SELECT id FROM task_definitions);
*/

-- ============================================
-- 查詢當前 ID 狀況
-- ============================================
SELECT 
  id,
  title,
  site_location as site,
  frequency as freq
FROM task_definitions
ORDER BY id;

-- 檢查 ID 跳號情況
WITH id_gaps AS (
  SELECT 
    id,
    LEAD(id) OVER (ORDER BY id) - id - 1 as gap_size
  FROM task_definitions
)
SELECT 
  id as after_id,
  id + 1 as missing_start,
  id + gap_size as missing_end,
  gap_size as total_missing
FROM id_gaps
WHERE gap_size > 0
ORDER BY id;

