# THERMOTECH-OPS v2.8

振禹企業工廠作業系統 - Win95/DOS 復古風格

## 🚀 功能特色

- ✅ Win95 + DOS 混合風格 UI
- ✅ 員工登入系統（密碼驗證）
- ✅ 任務管理（例行公事 / 交辦事項）
- ✅ 行事曆功能
- ✅ 管理員設定頁面
- ✅ 79 位員工 + 98 個任務項目

## 📦 技術棧

- **Frontend**: Next.js 16 + React 19 + TypeScript
- **Backend**: Supabase (PostgreSQL + Auth)
- **Styling**: Tailwind CSS 4
- **State**: Zustand
- **Deployment**: Vercel

## 🛠️ 本地開發

### 1. 安裝依賴

```bash
npm install
```

### 2. 設定環境變數

複製 `env.example` 並重新命名為 `.env.local`：

```bash
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

### 3. 啟動開發伺服器

```bash
npm run dev
```

開啟 [http://localhost:3000](http://localhost:3000)

## 🗄️ 資料庫設定

在 Supabase SQL Editor 執行：

```sql
-- 1. 建立表結構
-- 執行 OPS/docs/init_schema_and_seeds.sql（前 90 行，只建表）

-- 2. 匯入完整資料（79 人 + 98 任務 + 密碼）
-- 執行 OPS/docs/COMPLETE_INIT_WITH_UUID_BINDING.sql
```

## 👥 測試帳號

### 管理員
- **員工編號**: 70231
- **密碼**: Admin369888

### 一般員工
- **員工編號**: 70037
- **密碼**: Ops2025!

## 🌐 部署到 Vercel

### 方法 1：透過 Vercel Dashboard

1. 前往 [Vercel Dashboard](https://vercel.com/dashboard)
2. 點擊 "Import Project"
3. 連結 GitHub Repository
4. 設定環境變數：
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
5. 點擊 "Deploy"

### 方法 2：透過 Vercel CLI

```bash
# 安裝 Vercel CLI
npm i -g vercel

# 登入
vercel login

# 部署
vercel
```

## 📁 專案結構

```
thermotech-ops-app/
├── app/
│   ├── page.tsx          # 登入頁
│   ├── home/page.tsx     # 主頁面
│   └── globals.css       # Win95 全域樣式
├── components/
│   ├── Calendar.tsx      # 行事曆
│   ├── EventList.tsx     # 任務列表
│   ├── SettingsPage.tsx  # 設定頁
│   └── ...
├── lib/
│   └── api.ts           # Supabase API
└── docs/
    └── COMPLETE_INIT_WITH_UUID_BINDING.sql  # 資料庫初始化
```

## 🎨 設計風格

- **字體大小**: 11px（全域統一）
- **色系**: Win95 復古色票（#008080 / #C0C0C0 / #000080）
- **UI元件**: 3D 導角效果、緊湊排版

## 📞 聯絡資訊

振禹企業有限公司 © 2025

---

**Version**: 2.8  
**Last Updated**: 2025-11-26
