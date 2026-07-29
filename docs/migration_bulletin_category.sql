-- =====================================================
-- 公告 bulletins：補上 category 欄位
-- 原因：合併 PUBLIC/NOTICE 為統一公告後，程式改用 category 區分
--       （admin=行政公告 / routine=例行事項 / urgent=緊急通知 / general=一般通知）
--       但先前未建立對應 migration，正式站資料庫缺此欄位，導致發布公告時
--       報錯：Could not find the 'category' column of 'bulletins' in the schema cache
-- 安全：ADD COLUMN IF NOT EXISTS，可重複執行，不影響既有資料
-- =====================================================

ALTER TABLE bulletins ADD COLUMN IF NOT EXISTS category TEXT NOT NULL DEFAULT 'general';

COMMENT ON COLUMN bulletins.category IS '公告分類：admin=行政公告 / routine=例行事項 / urgent=緊急通知 / general=一般通知';
