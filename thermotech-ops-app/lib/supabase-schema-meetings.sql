-- ============================================
-- THERMOTECH-OPS: Meeting System Tables
-- Run this in Supabase SQL Editor
-- ============================================

-- 會議分類
CREATE TABLE IF NOT EXISTS meeting_categories (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  color TEXT DEFAULT '#000080',
  created_by UUID REFERENCES profiles(id),
  is_ai_suggested BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- 會議紀錄
CREATE TABLE IF NOT EXISTS meetings (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  meeting_date DATE DEFAULT CURRENT_DATE,
  category_id UUID REFERENCES meeting_categories(id),
  summary TEXT,
  raw_content TEXT,
  file_url TEXT,
  file_name TEXT,
  file_type TEXT CHECK (file_type IN ('pdf', 'docx', 'image', 'text')),
  uploaded_by UUID REFERENCES profiles(id),
  ai_analysis JSONB,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'analyzing', 'analyzed', 'archived', 'scheduled')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- AI 擷取的時程/截止日
CREATE TABLE IF NOT EXISTS meeting_deadlines (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  description TEXT NOT NULL,
  deadline_date DATE,
  is_urgent BOOLEAN DEFAULT false,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- AI 擷取的人員任務
CREATE TABLE IF NOT EXISTS meeting_tasks (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  meeting_id UUID REFERENCES meetings(id) ON DELETE CASCADE,
  assignee_name TEXT NOT NULL,
  assignee_id UUID REFERENCES profiles(id),
  task_description TEXT NOT NULL,
  due_date DATE,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'completed')),
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_meetings_date ON meetings(meeting_date DESC);
CREATE INDEX IF NOT EXISTS idx_meetings_status ON meetings(status);
CREATE INDEX IF NOT EXISTS idx_meetings_category ON meetings(category_id);
CREATE INDEX IF NOT EXISTS idx_meeting_tasks_meeting ON meeting_tasks(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_deadlines_meeting ON meeting_deadlines(meeting_id);

-- Enable RLS (Row Level Security) - allow all for now
ALTER TABLE meeting_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_deadlines ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_tasks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all for meeting_categories" ON meeting_categories FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for meetings" ON meetings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for meeting_deadlines" ON meeting_deadlines FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all for meeting_tasks" ON meeting_tasks FOR ALL USING (true) WITH CHECK (true);

-- Storage bucket for meeting files
INSERT INTO storage.buckets (id, name, public) VALUES ('meeting-files', 'meeting-files', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Allow public access to meeting-files" ON storage.objects FOR ALL USING (bucket_id = 'meeting-files') WITH CHECK (bucket_id = 'meeting-files');
