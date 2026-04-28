-- ============================================
-- FAX AI Analysis System — Supabase Schema
-- SECURITY HARDENED VERSION
-- ============================================

-- 1. faxes table
CREATE TABLE IF NOT EXISTS faxes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  file_name TEXT NOT NULL,
  file_url TEXT,
  file_size BIGINT,
  received_at TIMESTAMPTZ DEFAULT now(),
  status TEXT DEFAULT 'pending',
  -- AI analysis results
  customer_name TEXT,
  customer_address TEXT,
  customer_contact TEXT,
  order_number TEXT,
  order_items JSONB DEFAULT '[]',
  our_contact_person TEXT,
  our_contact_user_id UUID,
  ai_confidence FLOAT,
  ai_raw_response JSONB,
  -- Manual review
  reviewed_by UUID,
  reviewed_at TIMESTAMPTZ,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

ALTER TABLE faxes ENABLE ROW LEVEL SECURITY;

-- RLS: Only authenticated users can READ faxes
-- (API routes use service_role key which bypasses RLS)
CREATE POLICY "Authenticated users can read faxes"
  ON faxes FOR SELECT
  USING (auth.role() = 'authenticated');

-- RLS: Only authenticated users can update (for manual review/notes)
CREATE POLICY "Authenticated users can update faxes"
  ON faxes FOR UPDATE
  USING (auth.role() = 'authenticated')
  WITH CHECK (auth.role() = 'authenticated');

-- RLS: Only authenticated users can delete
CREATE POLICY "Authenticated users can delete faxes"
  ON faxes FOR DELETE
  USING (auth.role() = 'authenticated');

-- NOTE: INSERT is intentionally NOT allowed via anon key.
-- All inserts go through API routes using SUPABASE_SERVICE_ROLE_KEY
-- which bypasses RLS entirely. This ensures only the Watcher Agent
-- (authenticated via FAX_API_KEY) can create records.

-- 2. Storage bucket instructions:
-- Go to Supabase Dashboard > Storage > New Bucket
-- Bucket name: fax-files
-- Public: *** NO — set to PRIVATE ***
-- Then add this storage policy:
--
-- (In Supabase Dashboard > Storage > Policies > fax-files)
-- Policy name: "Authenticated users can read fax files"
-- Allowed operation: SELECT
-- Target roles: authenticated
-- Policy definition: true
--
-- Policy name: "Service role can upload fax files"
-- Allowed operation: INSERT
-- Target roles: service_role
-- Policy definition: true
