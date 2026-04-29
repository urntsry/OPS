-- ============================================
-- FAX Internal Contacts (我方窗口名單) v1
-- 用於 AI 模糊比對識別簽名/聯絡人
-- ============================================

CREATE TABLE IF NOT EXISTS fax_internal_contacts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,                       -- 主要姓名 (e.g. "劉邦錦")
  aliases TEXT[],                           -- 別名/暱稱/英文名 (e.g. {"邦錦", "Bang-Jin", "B.J.Liu"})
  department TEXT,                          -- 部門 (e.g. "業務部")
  title TEXT,                               -- 職稱 (e.g. "業務專員")
  email TEXT,
  phone TEXT,
  line_user_id TEXT,                        -- LINE 推播 ID
  active BOOLEAN DEFAULT true,              -- 在職狀態
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_fax_contacts_active ON fax_internal_contacts(active);
CREATE INDEX IF NOT EXISTS idx_fax_contacts_name ON fax_internal_contacts(name);

ALTER TABLE fax_internal_contacts ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Authenticated read fax_contacts" ON fax_internal_contacts;
CREATE POLICY "Authenticated read fax_contacts" ON fax_internal_contacts
  FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Authenticated write fax_contacts" ON fax_internal_contacts;
CREATE POLICY "Authenticated write fax_contacts" ON fax_internal_contacts
  FOR ALL TO authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Service role full access fax_contacts" ON fax_internal_contacts;
CREATE POLICY "Service role full access fax_contacts" ON fax_internal_contacts
  FOR ALL TO service_role USING (true) WITH CHECK (true);

-- ============================================
-- 為 faxes 表新增「不確定」標記欄位
-- ============================================
ALTER TABLE faxes ADD COLUMN IF NOT EXISTS our_contact_uncertain BOOLEAN DEFAULT false;
ALTER TABLE faxes ADD COLUMN IF NOT EXISTS our_contact_matched_id UUID REFERENCES fax_internal_contacts(id) ON DELETE SET NULL;
ALTER TABLE faxes ADD COLUMN IF NOT EXISTS our_contact_raw TEXT;  -- 原始辨識出的文字 (未比對前)

COMMENT ON COLUMN faxes.our_contact_uncertain IS 'AI 無法在內部聯絡人清單中找到對應人員時為 true，需窗口手動確認';
COMMENT ON COLUMN faxes.our_contact_matched_id IS '若 AI 比對成功，存對應的 fax_internal_contacts.id';
COMMENT ON COLUMN faxes.our_contact_raw IS 'AI 從文件中辨識出的原始字串 (含 OCR 錯誤)';
