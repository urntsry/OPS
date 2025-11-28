-- ============================================
-- 修正任務 ID Sequence（推薦方案）
-- ============================================
-- 
-- 目的：重置 sequence，讓新任務從正確的編號開始
-- 不會改變現有任務的 ID，只是修正 sequence 的下一個值
-- 
-- ============================================

-- 步驟 1：檢查當前狀況
SELECT 
  '當前最大 ID' as info,
  MAX(id) as max_id,
  COUNT(*) as total_tasks
FROM task_definitions;

-- 步驟 2：檢查 sequence 當前值
SELECT 
  '當前 Sequence 值' as info,
  last_value as current_value
FROM task_definitions_id_seq;

-- 步驟 3：重置 Sequence
DO $$ 
DECLARE
  max_id INTEGER;
BEGIN
  -- 取得當前最大 ID
  SELECT COALESCE(MAX(id), 0) INTO max_id FROM task_definitions;
  
  -- 重置 sequence 為 max_id + 1
  EXECUTE format('ALTER SEQUENCE task_definitions_id_seq RESTART WITH %s', max_id + 1);
  
  RAISE NOTICE '✓ Sequence 已重置';
  RAISE NOTICE '  當前最大 ID: %', max_id;
  RAISE NOTICE '  下一個 ID 將是: %', max_id + 1;
END $$;

-- 步驟 4：驗證結果
SELECT 
  '修正後' as info,
  (SELECT MAX(id) FROM task_definitions) as max_task_id,
  (SELECT last_value FROM task_definitions_id_seq) as next_id,
  (SELECT COUNT(*) FROM task_definitions) as total_tasks;

-- 步驟 5：檢查 ID 跳號情況（供參考）
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
  gap_size as gap_count
FROM id_gaps
WHERE gap_size > 0
ORDER BY id;

-- ============================================
-- 預期結果：
-- ============================================
-- 
-- ✓ Sequence 已重置
--   當前最大 ID: 107
--   下一個 ID 將是: 108
-- 
-- 跳號情況（供參考）：
-- | after_id | missing_start | missing_end | gap_count |
-- |----------|---------------|-------------|-----------|
-- | 89       | 90            | 89          | 0         | (無跳號)
-- | 98       | 99            | 104         | 6         | (跳過 6 個)
-- 
-- ============================================

-- ============================================
-- 注意事項
-- ============================================
-- 
-- 1. 現有任務的 ID 不會改變
-- 2. 跳號的 ID（99-104）不會被重新使用
-- 3. 新增的任務將從 108 開始編號
-- 4. 這是完全正常且安全的做法
-- 
-- ============================================

