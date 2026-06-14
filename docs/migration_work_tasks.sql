-- =====================================================
-- 業務任務交辦 work_tasks
-- 特色：協商工時（承辦人不能拒絕，只能回報預估）+ 待辦清單 checklist
-- 狀態機：estimating(待評估) → confirming(待確認) → in_progress(進行中) → done(已完成)
--         issuer 可在 confirming 退回 → estimating（來回協商）
-- =====================================================
CREATE TABLE IF NOT EXISTS work_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  -- 交辦人 / 承辦人
  issuer_id UUID REFERENCES profiles(id),
  issuer_name TEXT,
  assignee_id UUID NOT NULL REFERENCES profiles(id),
  assignee_name TEXT,
  -- 狀態機
  status TEXT NOT NULL DEFAULT 'estimating',
  -- 協商工時（由承辦人回報）
  estimated_hours NUMERIC(6,1),
  estimated_due DATE,
  estimate_note TEXT,
  -- 交辦人設定
  priority TEXT NOT NULL DEFAULT 'normal',  -- normal / high / urgent
  hard_due DATE,                            -- 主管硬性期限（選填）
  issuer_note TEXT,
  -- 待辦清單： [{ id, text, done }]
  checklist JSONB NOT NULL DEFAULT '[]',
  -- 完成
  accepted_at TIMESTAMPTZ,   -- 主管確認進行中時間
  completed_at TIMESTAMPTZ,
  completed_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE work_tasks IS '業務任務交辦：含協商工時與待辦清單';
COMMENT ON COLUMN work_tasks.status IS 'estimating 待評估 / confirming 待確認 / in_progress 進行中 / done 已完成 / cancelled 取消';
COMMENT ON COLUMN work_tasks.estimated_hours IS '承辦人回報的預估工時（小時）';
COMMENT ON COLUMN work_tasks.estimated_due IS '承辦人回報的預計完成日';
COMMENT ON COLUMN work_tasks.hard_due IS '交辦人設定的硬性期限（選填）';
COMMENT ON COLUMN work_tasks.checklist IS '待辦清單 [{id,text,done}]';

CREATE INDEX IF NOT EXISTS idx_work_tasks_assignee ON work_tasks(assignee_id, status);
CREATE INDEX IF NOT EXISTS idx_work_tasks_issuer ON work_tasks(issuer_id, status);
CREATE INDEX IF NOT EXISTS idx_work_tasks_status ON work_tasks(status);

ALTER TABLE work_tasks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS work_tasks_read ON work_tasks;
DROP POLICY IF EXISTS work_tasks_insert ON work_tasks;
DROP POLICY IF EXISTS work_tasks_update ON work_tasks;
DROP POLICY IF EXISTS work_tasks_delete ON work_tasks;
CREATE POLICY work_tasks_read ON work_tasks FOR SELECT USING (true);
CREATE POLICY work_tasks_insert ON work_tasks FOR INSERT WITH CHECK (true);
CREATE POLICY work_tasks_update ON work_tasks FOR UPDATE USING (true);
CREATE POLICY work_tasks_delete ON work_tasks FOR DELETE USING (true);

-- updated_at 自動更新
CREATE OR REPLACE FUNCTION set_work_tasks_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_work_tasks_updated_at ON work_tasks;
CREATE TRIGGER trg_work_tasks_updated_at BEFORE UPDATE ON work_tasks
FOR EACH ROW EXECUTE FUNCTION set_work_tasks_updated_at();
