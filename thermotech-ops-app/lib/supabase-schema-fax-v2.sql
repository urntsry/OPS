-- ============================================
-- FAX System v2 — Add handled status + document_type
-- Run this AFTER the initial faxes table is created
-- ============================================

ALTER TABLE faxes ADD COLUMN IF NOT EXISTS document_type TEXT DEFAULT 'unknown';
ALTER TABLE faxes ADD COLUMN IF NOT EXISTS is_handled BOOLEAN DEFAULT false;
ALTER TABLE faxes ADD COLUMN IF NOT EXISTS handled_by UUID;
ALTER TABLE faxes ADD COLUMN IF NOT EXISTS handled_at TIMESTAMPTZ;
ALTER TABLE faxes ADD COLUMN IF NOT EXISTS delivery_date TEXT;
ALTER TABLE faxes ADD COLUMN IF NOT EXISTS total_amount TEXT;
ALTER TABLE faxes ADD COLUMN IF NOT EXISTS currency TEXT;
ALTER TABLE faxes ADD COLUMN IF NOT EXISTS special_notes TEXT;
ALTER TABLE faxes ADD COLUMN IF NOT EXISTS customer_phone TEXT;
ALTER TABLE faxes ADD COLUMN IF NOT EXISTS notify_sent BOOLEAN DEFAULT false;
