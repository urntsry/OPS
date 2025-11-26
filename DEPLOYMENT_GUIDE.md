# 🚀 THERMOTECH-OPS 部署指南

## 📋 部署前準備

### 1. GitHub Repository

確認您的專案已推送到 GitHub：

```bash
cd thermotech-ops-app
git init
git add .
git commit -m "Initial commit - THERMOTECH-OPS v2.8"
git branch -M main
git remote add origin https://github.com/your-username/thermotech-ops.git
git push -u origin main
```

### 2. Supabase 環境變數

從 Supabase Dashboard 取得：
- **Project URL**: `https://[your-project].supabase.co`
- **Anon Key**: 在 Settings → API → anon/public

---

## 🌐 方法 1：Vercel Dashboard 部署（推薦）

### 步驟 1：匯入專案

1. 前往 [https://vercel.com/new](https://vercel.com/new)
2. 點擊 "Import Git Repository"
3. 連結您的 GitHub 帳號（如果尚未連結）
4. 選擇 `thermotech-ops` repository

### 步驟 2：設定專案

- **Framework Preset**: Next.js（自動偵測）
- **Root Directory**: `thermotech-ops-app` ⚠️ **重要！**
- **Build Command**: `npm run build`
- **Output Directory**: `.next`

### 步驟 3：設定環境變數

在 "Environment Variables" 區塊加入：

| Name | Value |
|------|-------|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://[your-project].supabase.co` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | `eyJhbGc...（您的 anon key）` |

### 步驟 4：部署

點擊 "Deploy" → 等待 2-3 分鐘 → 完成！

---

## 🖥️ 方法 2：Vercel CLI 部署

### 步驟 1：安裝 Vercel CLI

```bash
npm i -g vercel
```

### 步驟 2：登入

```bash
vercel login
```

（會開啟瀏覽器進行 OAuth 驗證）

### 步驟 3：初始化專案

```bash
cd thermotech-ops-app
vercel
```

回答問題：
```
? Set up and deploy? Y
? Which scope? (選擇您的帳號)
? Link to existing project? N
? What's your project's name? thermotech-ops
? In which directory is your code located? ./
? Want to override the settings? N
```

### 步驟 4：設定環境變數

```bash
vercel env add NEXT_PUBLIC_SUPABASE_URL
# 貼上您的 Supabase URL

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# 貼上您的 Anon Key
```

### 步驟 5：部署到生產環境

```bash
vercel --prod
```

---

## ✅ 部署後檢查

### 1. 測試網站

開啟 Vercel 提供的網址（例如：`https://thermotech-ops.vercel.app`）

### 2. 測試登入

使用測試帳號：
```
員工編號：70231
密碼：Admin369888
```

### 3. 檢查資料庫連線

如果登入失敗，檢查：
1. Vercel 環境變數是否正確設定
2. Supabase 資料庫是否已初始化（執行 SQL）
3. 瀏覽器 Console 是否有錯誤訊息

---

## 🔄 更新部署

### 自動部署（推薦）

每次 push 到 `main` 分支，Vercel 會自動重新部署：

```bash
git add .
git commit -m "Update feature XYZ"
git push origin main
```

### 手動部署

```bash
vercel --prod
```

---

## 🐛 常見問題

### Q1: 環境變數沒有生效

**A**: 在 Vercel Dashboard → Settings → Environment Variables 確認：
- 變數名稱正確（包含 `NEXT_PUBLIC_` 前綴）
- 已選擇 Production、Preview、Development 環境
- 重新部署專案

### Q2: 資料庫連線失敗

**A**: 檢查：
```sql
-- 在 Supabase SQL Editor 執行
SELECT COUNT(*) FROM profiles;
SELECT COUNT(*) FROM task_definitions;
```

確保資料已匯入。

### Q3: Root Directory 設定錯誤

**A**: 如果專案結構是：
```
Project/
└── OPS/
    └── thermotech-ops-app/  ← 這裡才是 Next.js 專案
```

在 Vercel 設定 Root Directory 為 `thermotech-ops-app`

### Q4: Build 失敗

**A**: 檢查 `package.json` 的 scripts：
```json
{
  "scripts": {
    "build": "next build",
    "start": "next start"
  }
}
```

---

## 📊 部署成功檢查表

- [ ] GitHub Repository 已建立
- [ ] 程式碼已推送到 `main` 分支
- [ ] Vercel 專案已建立
- [ ] Root Directory 設定正確（如果需要）
- [ ] 環境變數已設定
- [ ] Build 成功（綠色勾勾）
- [ ] 網站可以開啟
- [ ] 登入功能正常
- [ ] 資料可以正確顯示

---

## 🎉 完成！

您的 THERMOTECH-OPS 系統已成功部署到 Vercel！

**Production URL**: https://your-project.vercel.app

如有問題，請查看：
- [Vercel 官方文件](https://vercel.com/docs)
- [Next.js 部署指南](https://nextjs.org/docs/deployment)

---

**振禹企業 © 2025**

