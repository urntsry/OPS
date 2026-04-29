-- ============================================
-- RLS FIX — 開放 anon key 存取（OPS 使用自訂登入而非 Supabase Auth）
-- ============================================
-- 之前的 policy 限制 TO authenticated，導致 anon key 無法 INSERT / SELECT。
-- 此檔將 policies 改為跟既有 meetings 表一致：FOR ALL USING (true) WITH CHECK (true)
-- 可重複執行 (idempotent)。

-- scheduled_meetings
DROP POLICY IF EXISTS "Authenticated full access scheduled_meetings" ON scheduled_meetings;
DROP POLICY IF EXISTS "Service role full access scheduled_meetings" ON scheduled_meetings;
DROP POLICY IF EXISTS "Allow all for scheduled_meetings" ON scheduled_meetings;
CREATE POLICY "Allow all for scheduled_meetings" ON scheduled_meetings
  FOR ALL USING (true) WITH CHECK (true);

-- meeting_participants
DROP POLICY IF EXISTS "Authenticated full access meeting_participants" ON meeting_participants;
DROP POLICY IF EXISTS "Service role full access meeting_participants" ON meeting_participants;
DROP POLICY IF EXISTS "Allow all for meeting_participants" ON meeting_participants;
CREATE POLICY "Allow all for meeting_participants" ON meeting_participants
  FOR ALL USING (true) WITH CHECK (true);

-- notifications
DROP POLICY IF EXISTS "Authenticated read own notifications" ON notifications;
DROP POLICY IF EXISTS "Authenticated update own notifications" ON notifications;
DROP POLICY IF EXISTS "Service role full access notifications" ON notifications;
DROP POLICY IF EXISTS "Allow all for notifications" ON notifications;
CREATE POLICY "Allow all for notifications" ON notifications
  FOR ALL USING (true) WITH CHECK (true);
