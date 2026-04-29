-- ============================================
-- FAX Agent Heartbeat / Status Monitoring
-- ============================================

CREATE TABLE IF NOT EXISTS fax_agent_status (
  id INTEGER PRIMARY KEY DEFAULT 1,
  agent_id TEXT DEFAULT 'default',
  last_heartbeat TIMESTAMPTZ DEFAULT NOW(),
  last_scan_at TIMESTAMPTZ,
  watch_folder TEXT,
  files_in_folder INTEGER DEFAULT 0,
  files_processed_total INTEGER DEFAULT 0,
  last_uploaded_at TIMESTAMPTZ,
  last_uploaded_file TEXT,
  last_error TEXT,
  last_error_at TIMESTAMPTZ,
  agent_version TEXT,
  hostname TEXT,
  scan_count INTEGER DEFAULT 0,
  CONSTRAINT single_row CHECK (id = 1)
);

INSERT INTO fax_agent_status (id) VALUES (1) ON CONFLICT (id) DO NOTHING;

ALTER TABLE fax_agent_status ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated users can read agent status" ON fax_agent_status;
CREATE POLICY "Authenticated users can read agent status"
  ON fax_agent_status FOR SELECT
  USING (auth.role() = 'authenticated');

-- INSERT/UPDATE only via service_role (API routes)
