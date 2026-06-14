-- =====================================================
-- 公佈欄專業化升級 migration
-- 1) bulletins 加欄位：置頂、已讀確認、發布對象、發布時間
-- 2) bulletin_reads：已讀/已確認回條
-- =====================================================

-- ---------- 1. bulletins 新欄位 ----------
ALTER TABLE bulletins ADD COLUMN IF NOT EXISTS pinned BOOLEAN NOT NULL DEFAULT FALSE;
ALTER TABLE bulletins ADD COLUMN IF NOT EXISTS require_ack BOOLEAN NOT NULL DEFAULT FALSE;
-- 發布對象：'all'=全員 / 'department'=指定部門 / 'custom'=指定人員
ALTER TABLE bulletins ADD COLUMN IF NOT EXISTS audience TEXT NOT NULL DEFAULT 'all';
ALTER TABLE bulletins ADD COLUMN IF NOT EXISTS audience_departments TEXT[] NOT NULL DEFAULT '{}';
ALTER TABLE bulletins ADD COLUMN IF NOT EXISTS audience_user_ids UUID[] NOT NULL DEFAULT '{}';
ALTER TABLE bulletins ADD COLUMN IF NOT EXISTS published_at TIMESTAMPTZ;

COMMENT ON COLUMN bulletins.pinned IS '是否置頂（置頂公告排在最上方並可觸發登入彈窗）';
COMMENT ON COLUMN bulletins.require_ack IS '是否需要員工按「我已詳閱」確認';
COMMENT ON COLUMN bulletins.audience IS '發布對象：all=全員 / department=指定部門 / custom=指定人員';
COMMENT ON COLUMN bulletins.audience_departments IS 'audience=department 時，指定的部門名稱清單';
COMMENT ON COLUMN bulletins.audience_user_ids IS 'audience=custom 時，指定的 profiles.id 清單';
COMMENT ON COLUMN bulletins.published_at IS '發布時間（status 轉為 published 時設定）';

-- 既有已發布公告補上 published_at（用 created_at 回填）
UPDATE bulletins SET published_at = created_at
WHERE status = 'published' AND published_at IS NULL;

-- ---------- 2. bulletin_reads（已讀 / 已確認回條） ----------
CREATE TABLE IF NOT EXISTS bulletin_reads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  bulletin_id UUID NOT NULL REFERENCES bulletins(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acked_at TIMESTAMPTZ,
  UNIQUE (bulletin_id, user_id)
);

COMMENT ON TABLE bulletin_reads IS '公佈欄已讀/已確認回條：每位員工對每則公告一筆';
COMMENT ON COLUMN bulletin_reads.read_at IS '首次開啟（已讀）時間';
COMMENT ON COLUMN bulletin_reads.acked_at IS '按下「我已詳閱」確認時間（require_ack 公告用）';

CREATE INDEX IF NOT EXISTS idx_bulletin_reads_bulletin ON bulletin_reads(bulletin_id);
CREATE INDEX IF NOT EXISTS idx_bulletin_reads_user ON bulletin_reads(user_id);

ALTER TABLE bulletin_reads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS bulletin_reads_read ON bulletin_reads;
DROP POLICY IF EXISTS bulletin_reads_insert ON bulletin_reads;
DROP POLICY IF EXISTS bulletin_reads_update ON bulletin_reads;
CREATE POLICY bulletin_reads_read ON bulletin_reads FOR SELECT USING (true);
CREATE POLICY bulletin_reads_insert ON bulletin_reads FOR INSERT WITH CHECK (true);
CREATE POLICY bulletin_reads_update ON bulletin_reads FOR UPDATE USING (true);

CREATE INDEX IF NOT EXISTS idx_bulletins_pinned ON bulletins(pinned) WHERE pinned = TRUE;
