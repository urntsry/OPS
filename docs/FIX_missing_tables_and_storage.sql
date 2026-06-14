-- =====================================================
-- 一次性修復：delegations + work_tasks + bulletin-files storage
-- 請在 Supabase SQL Editor 執行
-- =====================================================

-- ===== 1. delegations 表（交辦事項，之前漏建） =====
CREATE TABLE IF NOT EXISTS delegations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  issuer_id UUID NOT NULL,
  issuer_name TEXT,
  assignee_id UUID NOT NULL,
  assignee_name TEXT,
  start_date DATE NOT NULL,
  due_date DATE NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  priority TEXT DEFAULT 'normal',
  notes TEXT,
  completed_at TIMESTAMPTZ,
  completed_note TEXT,
  reminder_due_sent BOOLEAN DEFAULT false,
  reminder_overdue_sent BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_delegations_assignee ON delegations(assignee_id, status);
CREATE INDEX IF NOT EXISTS idx_delegations_issuer ON delegations(issuer_id, status);
CREATE INDEX IF NOT EXISTS idx_delegations_dates ON delegations(start_date, due_date);
CREATE INDEX IF NOT EXISTS idx_delegations_status ON delegations(status, due_date);

ALTER TABLE delegations ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Allow all for delegations" ON delegations;
CREATE POLICY "Allow all for delegations" ON delegations
  FOR ALL USING (true) WITH CHECK (true);

CREATE OR REPLACE FUNCTION trigger_set_delegations_updated_at()
RETURNS TRIGGER AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS set_delegations_updated_at ON delegations;
CREATE TRIGGER set_delegations_updated_at
  BEFORE UPDATE ON delegations
  FOR EACH ROW EXECUTE FUNCTION trigger_set_delegations_updated_at();

-- ===== 2. work_tasks 表（業務任務交辦） =====
CREATE TABLE IF NOT EXISTS work_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  description TEXT,
  issuer_id UUID REFERENCES profiles(id),
  issuer_name TEXT,
  assignee_id UUID NOT NULL REFERENCES profiles(id),
  assignee_name TEXT,
  status TEXT NOT NULL DEFAULT 'estimating',
  estimated_hours NUMERIC(6,1),
  estimated_due DATE,
  estimate_note TEXT,
  priority TEXT NOT NULL DEFAULT 'normal',
  hard_due DATE,
  issuer_note TEXT,
  checklist JSONB NOT NULL DEFAULT '[]',
  accepted_at TIMESTAMPTZ,
  completed_at TIMESTAMPTZ,
  completed_note TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

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

CREATE OR REPLACE FUNCTION set_work_tasks_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql AS $$
BEGIN NEW.updated_at = NOW(); RETURN NEW; END; $$;

DROP TRIGGER IF EXISTS trg_work_tasks_updated_at ON work_tasks;
CREATE TRIGGER trg_work_tasks_updated_at BEFORE UPDATE ON work_tasks
FOR EACH ROW EXECUTE FUNCTION set_work_tasks_updated_at();

-- ===== 3. bulletin-files Storage Bucket + Policy =====
-- 建立 bucket（如果已存在不會報錯）
INSERT INTO storage.buckets (id, name, public)
VALUES ('bulletin-files', 'bulletin-files', true)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 允許 anon 上傳（我們的系統用 anon key + 自訂登入）
DROP POLICY IF EXISTS "Allow public upload to bulletin-files" ON storage.objects;
CREATE POLICY "Allow public upload to bulletin-files" ON storage.objects
  FOR INSERT WITH CHECK (bucket_id = 'bulletin-files');

DROP POLICY IF EXISTS "Allow public read bulletin-files" ON storage.objects;
CREATE POLICY "Allow public read bulletin-files" ON storage.objects
  FOR SELECT USING (bucket_id = 'bulletin-files');

DROP POLICY IF EXISTS "Allow public update bulletin-files" ON storage.objects;
CREATE POLICY "Allow public update bulletin-files" ON storage.objects
  FOR UPDATE USING (bucket_id = 'bulletin-files');

DROP POLICY IF EXISTS "Allow public delete bulletin-files" ON storage.objects;
CREATE POLICY "Allow public delete bulletin-files" ON storage.objects
  FOR DELETE USING (bucket_id = 'bulletin-files');
