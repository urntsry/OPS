-- =============================================
-- EXTERNAL APPS & SOFTWARE DOWNLOADS
-- =============================================

-- 1. External web apps (rendered as iframe windows in OPS)
CREATE TABLE IF NOT EXISTS external_apps (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  url TEXT NOT NULL,
  icon TEXT DEFAULT 'globe',
  departments TEXT[] DEFAULT ARRAY['all'],
  is_active BOOLEAN DEFAULT TRUE,
  fullscreen_default BOOLEAN DEFAULT TRUE,
  sort_order INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Software downloads (Python exe / installers per department)
CREATE TABLE IF NOT EXISTS software_downloads (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  version TEXT NOT NULL DEFAULT '1.0.0',
  department TEXT NOT NULL DEFAULT 'all',
  file_path TEXT NOT NULL,
  file_size_bytes BIGINT,
  platform TEXT DEFAULT 'windows',
  changelog TEXT,
  is_active BOOLEAN DEFAULT TRUE,
  download_count INTEGER DEFAULT 0,
  uploaded_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. RLS
ALTER TABLE external_apps ENABLE ROW LEVEL SECURITY;
ALTER TABLE software_downloads ENABLE ROW LEVEL SECURITY;

CREATE POLICY "external_apps_read" ON external_apps FOR SELECT USING (true);
CREATE POLICY "external_apps_manage" ON external_apps FOR ALL USING (true);

CREATE POLICY "software_downloads_read" ON software_downloads FOR SELECT USING (true);
CREATE POLICY "software_downloads_manage" ON software_downloads FOR ALL USING (true);

-- 4. Seed some initial apps
INSERT INTO external_apps (name, description, url, icon, departments, fullscreen_default, sort_order) VALUES
  ('Capacity', '生產產能管理系統', 'https://ca-chi.vercel.app', 'activity', ARRAY['all'], true, 1)
ON CONFLICT DO NOTHING;
