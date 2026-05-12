# THERMOTECH-OPS 環境設定指南

## 重要：請手動建立 .env.local 檔案

在專案根目錄 `thermotech-ops-app/` 下，建立一個名為 `.env.local` 的檔案，並貼上以下內容（請替換為實際的金鑰）：

```bash
# === OPS Supabase ===
NEXT_PUBLIC_SUPABASE_URL=https://your-ops-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-ops-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-ops-service-role-key

# === Capacity Supabase（LINE Bot 加班/語音建單功能需要）===
CAPACITY_SUPABASE_URL=https://your-capacity-project.supabase.co
CAPACITY_SUPABASE_SERVICE_KEY=your-capacity-service-role-key
CAPACITY_APP_URL=https://ca-chi.vercel.app

# === LINE Bot ===
LINE_CHANNEL_ACCESS_TOKEN=your-line-channel-access-token
LINE_CHANNEL_SECRET=your-line-channel-secret

# === Google AI（會議分析 + 語音建單）===
GOOGLE_GEMINI_API_KEY=your-gemini-api-key
GOOGLE_API_KEY=your-google-api-key

# === FAX Agent ===
FAX_API_KEY=your-fax-api-key
```

## 取得金鑰

1. **OPS Supabase**: [Supabase Dashboard](https://supabase.com/dashboard) → OPS 專案 → Settings → API
2. **Capacity Supabase**: 同上，選 Capacity 專案
3. **LINE Bot**: [LINE Developers Console](https://developers.line.biz) → Messaging API
4. **Google AI**: [Google AI Studio](https://aistudio.google.com/) → 建立 API Key
5. **FAX_API_KEY**: 自行生成安全隨機字串，同步設定於 `fax-agent/config.json`

## LINE Webhook 設定

LINE Developers Console → Messaging API → Webhook URL 設為：
```
https://<your-ops-vercel-domain>/api/line/webhook
```

完成後即可執行 `npm run dev` 啟動開發伺服器。
