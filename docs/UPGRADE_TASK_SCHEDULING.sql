-- =====================================================
-- 任務排程系統升級
-- 支援：固定日期、日期區間、靈活重複規則
-- =====================================================

-- 步驟 1：加入新欄位到 task_definitions
ALTER TABLE task_definitions 
ADD COLUMN schedule_type TEXT DEFAULT 'recurring',
ADD COLUMN schedule_config JSONB;

-- 步驟 2：更新現有任務的 schedule_config
-- 每日任務
UPDATE task_definitions 
SET schedule_config = '{"type": "daily"}'::jsonb
WHERE frequency = 'daily';

-- 每週任務
UPDATE task_definitions 
SET schedule_config = '{"type": "weekly", "days": [1,2,3,4,5]}'::jsonb
WHERE frequency = 'weekly';

-- 每月任務
UPDATE task_definitions 
SET schedule_config = '{"type": "monthly", "dates": [1]}'::jsonb
WHERE frequency = 'monthly';

-- 事件觸發任務
UPDATE task_definitions 
SET schedule_config = '{"type": "on_demand"}'::jsonb
WHERE frequency = 'event_triggered';

-- 步驟 3：創建範例 - 區間任務
INSERT INTO task_definitions (
  title, 
  frequency, 
  base_points, 
  site_location, 
  schedule_type,
  schedule_config,
  source_file
) VALUES (
  '日本出差',
  'event_triggered',
  500,
  'ALL',
  'date_range',
  '{"type": "range", "start": "2025-12-01", "end": "2025-12-05"}'::jsonb,
  '手動建立'
);

-- 步驟 4：創建範例 - 固定日期任務
INSERT INTO task_definitions (
  title,
  frequency,
  base_points,
  site_location,
  schedule_type,
  schedule_config,
  source_file
) VALUES (
  '月度盤點',
  'monthly',
  100,
  'ALL',
  'fixed_dates',
  '{"type": "monthly", "dates": [5, 20]}'::jsonb,
  '手動建立'
);

-- 步驟 5：驗證
SELECT 
  id,
  title,
  frequency,
  schedule_type,
  schedule_config
FROM task_definitions
ORDER BY id DESC
LIMIT 10;

