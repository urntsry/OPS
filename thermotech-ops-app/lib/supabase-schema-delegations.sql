-- ============================================================
-- Delegations (交辦事項) Schema
-- ============================================================
-- 由「具有交辦權限」的人員（預設 admin role，CONFIG 可微調）
-- 將工作正式交辦給承辦人，含起訖日期、狀態追蹤、通知。
-- 與 calendar 上的 `assignment` 事件類型「並行」 — 那是非結構化的
-- 個人 to-do；本表是有正式紀錄、跨日、雙方追蹤的「工作交辦單」。
-- ============================================================

CREATE TABLE IF NOT EXISTS delegations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  -- 交辦人 / 承辦人 — 用 profiles.id (UUID)
  issuer_id UUID NOT NULL,
  issuer_name TEXT,        -- snapshot 顯示用，避免每次 join
  assignee_id UUID NOT NULL,
  assignee_name TEXT,
  -- 日期區間
  start_date DATE NOT NULL,
  due_date DATE NOT NULL,
  -- 狀態：pending(進行中) / done(完成) ; overdue 是 due_date < today AND status != 'done' 動態計算
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT DEFAULT 'normal',  -- normal / high / urgent
  notes TEXT,
  -- 完成資訊
  completed_at TIMESTAMPTZ,
  completed_note TEXT,
  -- 提醒旗標：避免重複發送
  reminder_due_sent BOOLEAN DEFAULT false,    -- 到期前一天提醒
  reminder_overdue_sent BOOLEAN DEFAULT false, -- 逾期升級提醒
  -- 元資料
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delegations_assignee ON delegations(assignee_id, status);
CREATE INDEX IF NOT EXISTS idx_delegations_issuer ON delegations(issuer_id, status);
CREATE INDEX IF NOT EXISTS idx_delegations_dates ON delegations(start_date, due_date);
CREATE INDEX IF NOT EXISTS idx_delegations_status ON delegations(status, due_date);

-- ============================================================
-- RLS — 採用 OPS 的 anon-key + 自定義登入流程兼容寫法
-- ============================================================
ALTER TABLE delegations ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for delegations" ON delegations;
CREATE POLICY "Allow all for delegations" ON delegations
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================================
-- updated_at trigger
-- ============================================================
CREATE OR REPLACE FUNCTION trigger_set_delegations_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_delegations_updated_at ON delegations;
CREATE TRIGGER set_delegations_updated_at
  BEFORE UPDATE ON delegations
  FOR EACH ROW
  EXECUTE FUNCTION trigger_set_delegations_updated_at();

COMMENT ON TABLE delegations IS '正式交辦事項 — 由具交辦權限的主管交辦給承辦人，含起訖日、狀態追蹤、通知。';
