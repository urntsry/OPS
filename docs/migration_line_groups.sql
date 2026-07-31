-- =============================================
-- LINE GROUPS: 記錄官方帳號所在的群組/多人聊天室
-- 用於「公告推播到公司群組」功能
-- =============================================

CREATE TABLE IF NOT EXISTS line_groups (
  group_id     TEXT PRIMARY KEY,            -- LINE groupId 或 roomId
  name         TEXT,                        -- 群組名稱（若可取得）
  source_type  TEXT DEFAULT 'group',        -- group | room
  is_active    BOOLEAN DEFAULT true,        -- 官方帳號是否仍在此群組
  push_enabled BOOLEAN DEFAULT true,        -- 是否允許被選為公告推播對象
  joined_at    TIMESTAMPTZ DEFAULT NOW(),
  last_seen_at TIMESTAMPTZ DEFAULT NOW(),
  created_at   TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE line_groups ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS line_groups_all ON line_groups;
CREATE POLICY line_groups_all ON line_groups FOR ALL USING (true) WITH CHECK (true);
