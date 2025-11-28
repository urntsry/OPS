-- ============================================
-- THERMOTECH-OPS v2.0 資料庫升級
-- 任務分類系統 + 事件模板功能
-- ============================================

-- ============================================
-- 步驟 1：新增欄位
-- ============================================

-- 1.1 新增 item_type：區分「職能清單」vs「實際任務」
ALTER TABLE task_definitions
ADD COLUMN IF NOT EXISTS item_type TEXT DEFAULT 'actual_task' 
CHECK (item_type IN ('capability', 'actual_task'));

COMMENT ON COLUMN task_definitions.item_type IS 
'capability: 職能清單（不顯示在行事曆），actual_task: 實際任務（顯示在行事曆）';

-- 1.2 新增 event_category：事件分類
ALTER TABLE task_definitions
ADD COLUMN IF NOT EXISTS event_category TEXT;

COMMENT ON COLUMN task_definitions.event_category IS 
'事件分類：報修、活動、清潔、會計、人事、職訓、會議、出差等';

-- 1.3 新增 is_template：標記為模板（可快速建立）
ALTER TABLE task_definitions
ADD COLUMN IF NOT EXISTS is_template BOOLEAN DEFAULT false;

COMMENT ON COLUMN task_definitions.is_template IS 
'true: 可在首頁快速建立的模板事件';

-- 1.4 新增 default_notify_users：預設通知對象
ALTER TABLE task_definitions
ADD COLUMN IF NOT EXISTS default_notify_users TEXT[];

COMMENT ON COLUMN task_definitions.default_notify_users IS 
'預設通知對象（員工編號陣列）';

-- ============================================
-- 步驟 2：初步智能分類（根據關鍵字）
-- ============================================

-- 2.1 標記「職能清單」（日常工作能力，不需行事曆）
UPDATE task_definitions
SET item_type = 'capability'
WHERE title ~* '(報價|詢價|洽談|填寫|文書|接聽|理布|整理|處理日常|每日例行)'
   OR title IN (
     '與客戶洽談業務',
     '報價單填寫',
     '與廠商詢價',
     '加工單開立',
     '理布',
     '貨梯保養(電梯)',
     '外出洽談業務',
     '外出施工',
     '送貨'
   );

-- 2.2 標記「實際任務」（需要排程、追蹤）
UPDATE task_definitions
SET item_type = 'actual_task'
WHERE item_type IS NULL OR item_type != 'capability';

-- ============================================
-- 步驟 3：事件分類（初步分類）
-- ============================================

-- 3.1 報修類
UPDATE task_definitions
SET event_category = '報修',
    is_template = true
WHERE title ~* '(報修|維修|修理|故障|檢修|保養)'
   OR title IN ('冷氣清洗', '空調冷氣保養', '化糞池抽肥', '貨梯保養(電梯)');

-- 3.2 活動類
UPDATE task_definitions
SET event_category = '活動',
    is_template = true
WHERE title ~* '(活動|聚會|慶祝|福委|尾牙|旅遊)'
   OR title IN ('活動安排策劃', '參與福委會');

-- 3.3 清潔類
UPDATE task_definitions
SET event_category = '清潔',
    is_template = false  -- 清潔通常是例行，不需模板
WHERE title ~* '(清潔|打掃|整理|垃圾|環境)'
   OR title IN ('下午茶安排', '掃廁所', '擦玻璃');

-- 3.4 會計類
UPDATE task_definitions
SET event_category = '會計',
    is_template = false
WHERE title ~* '(帳款|盤點|發票|報表|薪資|財務)'
   OR title IN ('月度盤點', '應收帳款核對', '應付帳款核對');

-- 3.5 人事類
UPDATE task_definitions
SET event_category = '人事',
    is_template = true
WHERE title ~* '(人事|招聘|面試|入職|離職|員工)'
   OR title IN ('新進同仁教育訓練', '調節組員自身相關問題');

-- 3.6 職訓類（新增）
UPDATE task_definitions
SET event_category = '職訓',
    is_template = true
WHERE title ~* '(訓練|培訓|教育|學習|課程|講座)'
   OR title IN ('新進同仁教育訓練', 'ISO內部稽核人員', '防範準備');

-- 3.7 會議類（新增）
UPDATE task_definitions
SET event_category = '會議',
    is_template = true
WHERE title ~* '(會議|開會|討論|報告|簡報)'
   OR title IN ('週報整理', '調節組員自身相關問題');

-- 3.8 出差類（新增）
UPDATE task_definitions
SET event_category = '出差',
    is_template = true
WHERE title ~* '(出差|出訪|拜訪|外訪|外出)'
   OR title IN ('日本出差', '外出洽談業務', '外出施工');

-- ============================================
-- 步驟 4：設定預設通知對象（範例）
-- ============================================

-- 4.1 報修類 → 通知廠務相關人員
-- UPDATE task_definitions
-- SET default_notify_users = ARRAY['70231', '70250']  -- 替換為實際廠務人員編號
-- WHERE event_category = '報修';

-- 4.2 活動類 → 通知人事部門
-- UPDATE task_definitions
-- SET default_notify_users = ARRAY['A0001']  -- 替換為實際人事人員編號
-- WHERE event_category = '活動';

-- 4.3 會計類 → 通知財務部門
-- UPDATE task_definitions
-- SET default_notify_users = ARRAY['70037']  -- 替換為實際財務人員編號
-- WHERE event_category = '會計';

-- ============================================
-- 步驟 5：驗證結果
-- ============================================

-- 5.1 查看分類統計
SELECT 
  '分類統計' as info,
  item_type,
  event_category,
  COUNT(*) as count,
  COUNT(*) FILTER (WHERE is_template) as template_count
FROM task_definitions
GROUP BY item_type, event_category
ORDER BY item_type, event_category;

-- 5.2 查看職能清單（不顯示在行事曆）
SELECT 
  '職能清單' as type,
  id,
  title,
  event_category,
  site_location
FROM task_definitions
WHERE item_type = 'capability'
ORDER BY id
LIMIT 20;

-- 5.3 查看實際任務（顯示在行事曆）
SELECT 
  '實際任務' as type,
  id,
  title,
  event_category,
  is_template,
  schedule_type,
  display_type
FROM task_definitions
WHERE item_type = 'actual_task'
ORDER BY event_category, id
LIMIT 20;

-- 5.4 查看模板事件（首頁快速建立）
SELECT 
  '模板事件' as type,
  id,
  title,
  event_category,
  default_assignee_id,
  backup_assignee_id
FROM task_definitions
WHERE is_template = true
ORDER BY event_category, title;

-- ============================================
-- 步驟 6：建立索引（效能優化）
-- ============================================

CREATE INDEX IF NOT EXISTS idx_task_item_type 
ON task_definitions(item_type);

CREATE INDEX IF NOT EXISTS idx_task_event_category 
ON task_definitions(event_category);

CREATE INDEX IF NOT EXISTS idx_task_is_template 
ON task_definitions(is_template) WHERE is_template = true;

-- ============================================
-- 完成提示
-- ============================================

DO $$ 
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE '✓ 資料庫升級完成！';
  RAISE NOTICE '========================================';
  RAISE NOTICE '新增欄位：';
  RAISE NOTICE '  - item_type (職能清單 vs 實際任務)';
  RAISE NOTICE '  - event_category (報修/活動/清潔/會計/人事/職訓/會議/出差)';
  RAISE NOTICE '  - is_template (可快速建立的模板)';
  RAISE NOTICE '  - default_notify_users (預設通知對象)';
  RAISE NOTICE '========================================';
  RAISE NOTICE '請查看上方查詢結果確認分類是否正確';
  RAISE NOTICE '如需調整，請在設定頁進行修改';
  RAISE NOTICE '========================================';
END $$;

-- ============================================
-- 注意事項
-- ============================================
--
-- 1. 分類是基於關鍵字的初步判斷，可能不完全準確
-- 2. 請在設定頁檢查並調整分類
-- 3. default_notify_users 需要根據實際人員編號設定
-- 4. 職能清單（capability）不會顯示在行事曆
-- 5. 實際任務（actual_task）會顯示在行事曆
--
-- ============================================

