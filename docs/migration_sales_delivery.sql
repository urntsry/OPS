-- =====================================================
-- Sales 模組：交期表 (Delivery Schedule)
-- 網頁版 Excel：每個「年度分頁」存成一份 JSON 文件
--   columns: 欄位定義陣列（表頭可改、欄位可增刪）
--   rows:    所有資料列（每列為一個物件，key 對應 columns.key）
-- =====================================================

CREATE TABLE IF NOT EXISTS delivery_schedules (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sheet_name TEXT NOT NULL UNIQUE,        -- 分頁名稱，例如 "2026.01~"
  sheet_order INTEGER NOT NULL DEFAULT 0, -- 分頁排序
  columns JSONB NOT NULL DEFAULT '[]',    -- [{ key, label, type, width }]
  rows JSONB NOT NULL DEFAULT '[]',       -- [{ <key>: value, ... }]
  updated_by UUID REFERENCES profiles(id),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE delivery_schedules IS 'Sales 交期表：每個年度分頁一份 JSON 文件（網頁版 Excel）';
COMMENT ON COLUMN delivery_schedules.columns IS '欄位定義 [{key,label,type,width}]，type=text|number|date';
COMMENT ON COLUMN delivery_schedules.rows IS '資料列陣列，每列物件的 key 對應 columns.key';

ALTER TABLE delivery_schedules ENABLE ROW LEVEL SECURITY;
CREATE POLICY delivery_schedules_read ON delivery_schedules FOR SELECT USING (true);
CREATE POLICY delivery_schedules_write ON delivery_schedules FOR INSERT WITH CHECK (true);
CREATE POLICY delivery_schedules_update ON delivery_schedules FOR UPDATE USING (true);
CREATE POLICY delivery_schedules_delete ON delivery_schedules FOR DELETE USING (true);

CREATE INDEX IF NOT EXISTS idx_delivery_schedules_order ON delivery_schedules(sheet_order);

-- 預設建立 2026 分頁（含標準欄位定義）
INSERT INTO delivery_schedules (sheet_name, sheet_order, columns, rows)
VALUES (
  '2026.01~',
  1,
  '[
    { "key": "order_date",   "label": "発注日",    "type": "date",   "width": 100 },
    { "key": "slip_code",    "label": "伝票コード", "type": "text",   "width": 110 },
    { "key": "name",         "label": "名稱",       "type": "text",   "width": 200 },
    { "key": "qty",          "label": "数量",       "type": "number", "width": 70 },
    { "key": "unit_price",   "label": "単価",       "type": "number", "width": 90 },
    { "key": "amount",       "label": "金額",       "type": "number", "width": 100 },
    { "key": "delivery_date","label": "希望納期",   "type": "date",   "width": 100 },
    { "key": "col_h",        "label": "",           "type": "text",   "width": 70 },
    { "key": "remark",       "label": "備考",       "type": "text",   "width": 140 },
    { "key": "factory",      "label": "工場",       "type": "text",   "width": 80 },
    { "key": "invoice",      "label": "Invoice",    "type": "text",   "width": 130 },
    { "key": "work_order",   "label": "工單號碼",   "type": "text",   "width": 110 }
  ]'::jsonb,
  '[]'::jsonb
)
ON CONFLICT (sheet_name) DO NOTHING;
