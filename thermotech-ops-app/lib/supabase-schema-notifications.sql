-- ============================================
-- 通知系統 v1 (Notification Port)
-- 支援多通道：In-App、LINE、Email、SMS
-- 即使尚未綁定 LINE 也能運作（先進 In-App，等綁定後補推）
-- ============================================
-- 注意：這個檔案不會修改既有的 meetings 表（會議記錄模組）。
--      新增的會議排程功能用 scheduled_meetings 表，避免名稱衝突。
-- ============================================

-- 為 profiles 加 LINE 綁定欄位（如果還沒）
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS line_user_id TEXT;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS line_bound_at TIMESTAMPTZ;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS notification_prefs JSONB DEFAULT '{"line": true, "in_app": true, "email": false}'::jsonb;

CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL,                            -- 收件人 (profiles.id, 不強制外鍵以容許離職人員)
  type TEXT NOT NULL,                               -- 'meeting' | 'meeting_helper' | 'meeting_reminder' | 'visit' | 'fax' | 'birthday' | 'system' | ...
  title TEXT NOT NULL,
  body TEXT,                                        -- 簡述內容
  link TEXT,                                        -- 點擊跳轉連結 e.g., '/home?tab=meeting&id=xxx'
  -- 多通道發送
  channels TEXT[] DEFAULT ARRAY['in_app']::TEXT[],  -- ['in_app', 'line', 'email']
  channel_status JSONB DEFAULT '{}'::jsonb,         -- {"in_app": "sent", "line": "pending"}
  -- 狀態
  status TEXT DEFAULT 'pending',                    -- 'pending' | 'sent' | 'failed' | 'cancelled'
  read_at TIMESTAMPTZ,                              -- 使用者讀取時間
  -- 時間
  scheduled_at TIMESTAMPTZ DEFAULT NOW(),           -- 預定發送時間（可排程）
  sent_at TIMESTAMPTZ,
  -- 詳情
  metadata JSONB,                                   -- 額外結構化資料
  error TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notif_user_status ON notifications(user_id, status);
CREATE INDEX IF NOT EXISTS idx_notif_user_unread ON notifications(user_id, read_at) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_notif_scheduled ON notifications(scheduled_at) WHERE status = 'pending';
CREATE INDEX IF NOT EXISTS idx_notif_type ON notifications(type);

ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- OPS 用自訂登入（非 Supabase Auth），故開放 anon + authenticated
DROP POLICY IF EXISTS "Allow all for notifications" ON notifications;
CREATE POLICY "Allow all for notifications" ON notifications
  FOR ALL USING (true) WITH CHECK (true);

-- ============================================
-- 會議排程系統 v1
-- ============================================
-- ⚠️ 與既有的 meetings 表（會議記錄上傳）不同：
--    meetings           = 已開完的會議「記錄」(PDF/Word + AI 分析)
--    scheduled_meetings = 會議「排程」(行事曆雙擊建立 + 通知參與者)
-- 兩者透過 scheduled_meetings.meeting_record_id 連結（會後上傳記錄時填入）

CREATE TABLE IF NOT EXISTS scheduled_meetings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  summary TEXT,                                     -- 會議簡介
  location TEXT,                                    -- 會議地點
  meeting_date DATE NOT NULL,                       -- 主要會議日（用於日曆）
  start_time TIME,                                  -- 開始時間
  end_time TIME,                                    -- 結束時間
  -- 連結到 daily_assignments 以便顯示在日曆上
  assignment_id INTEGER,                            -- 一般行事曆事件
  -- 提醒狀態
  record_reminder_sent BOOLEAN DEFAULT false,       -- 是否已提醒上傳記錄
  record_uploaded BOOLEAN DEFAULT false,            -- 記錄是否已上傳
  meeting_record_id UUID REFERENCES meetings(id) ON DELETE SET NULL,  -- 連到既有 meetings 表（會議記錄）
  -- 元資料
  created_by UUID,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_date ON scheduled_meetings(meeting_date);
CREATE INDEX IF NOT EXISTS idx_scheduled_meetings_record_reminder ON scheduled_meetings(meeting_date, record_uploaded) WHERE record_uploaded = false;

CREATE TABLE IF NOT EXISTS meeting_participants (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  meeting_id UUID NOT NULL REFERENCES scheduled_meetings(id) ON DELETE CASCADE,
  user_id UUID NOT NULL,                            -- profiles.id
  role TEXT NOT NULL DEFAULT 'attendee',            -- 'attendee'(會議參與者) | 'related'(相關需通知) | 'helper'(協助準備人員)
  helper_task TEXT,                                 -- 若 helper：要做的事 e.g., '準備會議室', '訂咖啡 6 杯'
  notified_at TIMESTAMPTZ,
  acknowledged_at TIMESTAMPTZ,                      -- 確認收到通知
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(meeting_id, user_id, role)
);

CREATE INDEX IF NOT EXISTS idx_meeting_participants_meeting ON meeting_participants(meeting_id);
CREATE INDEX IF NOT EXISTS idx_meeting_participants_user ON meeting_participants(user_id);

ALTER TABLE scheduled_meetings ENABLE ROW LEVEL SECURITY;
ALTER TABLE meeting_participants ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow all for scheduled_meetings" ON scheduled_meetings;
CREATE POLICY "Allow all for scheduled_meetings" ON scheduled_meetings
  FOR ALL USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Allow all for meeting_participants" ON meeting_participants;
CREATE POLICY "Allow all for meeting_participants" ON meeting_participants
  FOR ALL USING (true) WITH CHECK (true);

COMMENT ON TABLE notifications IS '通用通知佇列 — 所有業務透過 lib/notifications.notify() 發送';
COMMENT ON TABLE scheduled_meetings IS '會議排程（雙擊行事曆建立）— 與 meetings(會議記錄) 不同';
COMMENT ON COLUMN notifications.channels IS '預期發送通道，如 [in_app, line]。channel_status 會記錄各通道實際結果';
COMMENT ON COLUMN meeting_participants.role IS 'attendee=出席者, related=相關需通知, helper=協助準備人員（含 helper_task 細節）';
