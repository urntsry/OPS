-- =====================================================
-- THERMOTECH-OPS 任務系統升級 v3.0
-- 支援：靈活排程、任務分類、顯示控制
-- =====================================================

-- 步驟 1：備份現有資料
CREATE TABLE task_definitions_backup AS 
SELECT * FROM task_definitions;

-- 步驟 2：加入新欄位
ALTER TABLE task_definitions 
ADD COLUMN IF NOT EXISTS task_category TEXT DEFAULT 'routine' 
  CHECK (task_category IN ('routine', 'assignment', 'public', 'announcement')),
ADD COLUMN IF NOT EXISTS display_type TEXT DEFAULT 'collapsed'
  CHECK (display_type IN ('event', 'collapsed', 'periodic')),
ADD COLUMN IF NOT EXISTS schedule_type TEXT DEFAULT 'recurring'
  CHECK (schedule_type IN ('once', 'range', 'recurring')),
ADD COLUMN IF NOT EXISTS schedule_config JSONB DEFAULT '{}'::jsonb;

-- 步驟 3：更新註釋
COMMENT ON COLUMN task_definitions.task_category IS '任務分類：routine(例行公事), assignment(交辦事項), public(公共事項), announcement(公告)';
COMMENT ON COLUMN task_definitions.display_type IS '顯示方式：event(直接顯示), collapsed(摺疊), periodic(週期顯示)';
COMMENT ON COLUMN task_definitions.schedule_type IS '排程類型：once(單次), range(區間), recurring(重複)';
COMMENT ON COLUMN task_definitions.schedule_config IS '排程配置 JSON';

-- 步驟 4：設定預設值（保持向下相容）
-- 將現有的每日任務設定為「摺疊顯示」
UPDATE task_definitions 
SET 
  task_category = 'routine',
  display_type = 'collapsed',
  schedule_type = 'recurring',
  schedule_config = jsonb_build_object(
    'type', 'daily',
    'workdays_only', true
  )
WHERE frequency = 'daily';

-- 將現有的每週任務設定為「週期顯示」
UPDATE task_definitions 
SET 
  task_category = 'routine',
  display_type = 'periodic',
  schedule_type = 'recurring',
  schedule_config = jsonb_build_object(
    'type', 'weekly',
    'days', ARRAY[1,2,3,4,5]  -- 預設週一到週五
  )
WHERE frequency = 'weekly';

-- 將現有的每月任務設定為「週期顯示」
UPDATE task_definitions 
SET 
  task_category = 'routine',
  display_type = 'periodic',
  schedule_type = 'recurring',
  schedule_config = jsonb_build_object(
    'type', 'monthly',
    'dates', ARRAY[1]  -- 預設每月 1 號
  )
WHERE frequency = 'monthly';

-- 將事件觸發任務設定為「特殊事件」
UPDATE task_definitions 
SET 
  task_category = 'public',
  display_type = 'event',
  schedule_type = 'once'
WHERE frequency = 'event_triggered';

-- 步驟 5：建立範例資料

-- 範例 1：區間任務（出差）
INSERT INTO task_definitions (
  title, 
  description,
  task_category,
  frequency, 
  base_points,
  site_location,
  display_type,
  schedule_type,
  schedule_config,
  default_assignee_id,
  source_file
) VALUES (
  '日本出差',
  '前往日本進行業務洽談',
  'assignment',
  'event_triggered',
  500,
  'ALL',
  'event',
  'range',
  jsonb_build_object(
    'type', 'range',
    'start_date', '2025-12-01',
    'end_date', '2025-12-05',
    'description', '日本東京出差'
  ),
  (SELECT id FROM profiles WHERE employee_id = '70231' LIMIT 1),
  '手動建立'
);

-- 範例 2：每月固定日期任務
INSERT INTO task_definitions (
  title,
  description,
  task_category,
  frequency,
  base_points,
  site_location,
  display_type,
  schedule_type,
  schedule_config,
  source_file
) VALUES (
  '月度盤點',
  '每月 5 號和 20 號進行庫存盤點',
  'public',
  'monthly',
  100,
  'ALL',
  'periodic',
  'recurring',
  jsonb_build_object(
    'type', 'monthly',
    'dates', ARRAY[5, 20]
  ),
  '手動建立'
);

-- 範例 3：每週特定日任務
INSERT INTO task_definitions (
  title,
  description,
  task_category,
  frequency,
  base_points,
  site_location,
  display_type,
  schedule_type,
  schedule_config,
  source_file
) VALUES (
  '週報整理',
  '每週一和週五整理週報',
  'routine',
  'weekly',
  50,
  'ALL',
  'periodic',
  'recurring',
  jsonb_build_object(
    'type', 'weekly',
    'days', ARRAY[1, 5]  -- 週一和週五
  ),
  '手動建立'
);

-- 步驟 6：建立輔助函數 - 計算任務在特定日期是否要顯示
CREATE OR REPLACE FUNCTION should_show_task_on_date(
  p_task_id BIGINT,  -- 改為 BIGINT
  p_date DATE
) RETURNS BOOLEAN AS $$
DECLARE
  v_task RECORD;
  v_config JSONB;
  v_day_of_week INTEGER;
  v_day_of_month INTEGER;
BEGIN
  -- 取得任務資訊
  SELECT * INTO v_task FROM task_definitions WHERE id = p_task_id;
  
  IF NOT FOUND THEN
    RETURN FALSE;
  END IF;
  
  v_config := v_task.schedule_config;
  
  -- 單次任務
  IF v_task.schedule_type = 'once' THEN
    RETURN p_date = (v_config->>'date')::DATE;
  END IF;
  
  -- 區間任務
  IF v_task.schedule_type = 'range' THEN
    RETURN p_date BETWEEN 
      (v_config->>'start_date')::DATE AND 
      (v_config->>'end_date')::DATE;
  END IF;
  
  -- 重複任務
  IF v_task.schedule_type = 'recurring' THEN
    -- 每日任務
    IF v_config->>'type' = 'daily' THEN
      IF (v_config->>'workdays_only')::BOOLEAN THEN
        v_day_of_week := EXTRACT(DOW FROM p_date);
        RETURN v_day_of_week BETWEEN 1 AND 5;  -- 週一到週五
      ELSE
        RETURN TRUE;
      END IF;
    END IF;
    
    -- 每週任務
    IF v_config->>'type' = 'weekly' THEN
      v_day_of_week := EXTRACT(DOW FROM p_date);
      RETURN v_day_of_week = ANY(
        ARRAY(SELECT jsonb_array_elements_text(v_config->'days')::INTEGER)
      );
    END IF;
    
    -- 每月任務
    IF v_config->>'type' = 'monthly' THEN
      v_day_of_month := EXTRACT(DAY FROM p_date);
      RETURN v_day_of_month = ANY(
        ARRAY(SELECT jsonb_array_elements_text(v_config->'dates')::INTEGER)
      );
    END IF;
  END IF;
  
  RETURN FALSE;
END;
$$ LANGUAGE plpgsql;

-- 步驟 7：驗證
SELECT 
  id,
  title,
  task_category,
  display_type,
  schedule_type,
  schedule_config
FROM task_definitions
WHERE schedule_config IS NOT NULL
ORDER BY id DESC
LIMIT 10;

-- 測試輔助函數
SELECT 
  title,
  should_show_task_on_date(id, '2025-12-05'::DATE) as show_on_dec_5
FROM task_definitions
WHERE schedule_config IS NOT NULL
LIMIT 5;

