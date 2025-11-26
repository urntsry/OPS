# 🚀 立即部署到 Vercel - 完整步驟

## 📋 準備工作

### 1. 您的資訊
- GitHub 帳號: ✓ (已有)
- Vercel 帳號: ✓ (已有)
- Supabase URL: `https://gjmkckijqurympmssizb.supabase.co`
- Supabase Anon Key: (從 Supabase Dashboard 取得)

---

## 🎯 方法 A：透過 Vercel Dashboard（最簡單，推薦）

### 步驟 1：推送到 GitHub

```bash
# 1. 進入專案目錄
cd C:\Users\888\Desktop\python\Project\OPS

# 2. 初始化 Git（如果還沒有）
git init

# 3. 加入所有檔案
git add .

# 4. 提交
git commit -m "Initial commit - THERMOTECH-OPS v2.8"

# 5. 在 GitHub 建立新 repository
# 前往 https://github.com/new
# Repository name: thermotech-ops
# 設定為 Private（如果不想公開）

# 6. 連結並推送
git remote add origin https://github.com/YOUR-USERNAME/thermotech-ops.git
git branch -M main
git push -u origin main
```

### 步驟 2：在 Vercel 部署

1. 前往 https://vercel.com/new
2. 點擊 "Import Git Repository"
3. 選擇您的 `thermotech-ops` repository
4. ⚠️ **重要設定：**
   - **Root Directory**: `thermotech-ops-app` (點擊 Edit)
   - **Framework Preset**: Next.js
   - **Build Command**: `npm run build`
   - **Output Directory**: `.next`

5. **Environment Variables**（環境變數）：
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://gjmkckijqurympmssizb.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=（您的 anon key）
   ```

6. 點擊 "Deploy"

7. 等待 2-3 分鐘，完成！

---

## 🎯 方法 B：透過 Vercel CLI（進階）

### 步驟 1：安裝 Vercel CLI

```bash
npm install -g vercel
```

### 步驟 2：登入

```bash
vercel login
```

### 步驟 3：部署

```bash
# 進入專案目錄
cd C:\Users\888\Desktop\python\Project\OPS\thermotech-ops-app

# 部署
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
# 輸入: https://gjmkckijqurympmssizb.supabase.co

vercel env add NEXT_PUBLIC_SUPABASE_ANON_KEY
# 輸入: 您的 anon key
```

### 步驟 5：部署到正式環境

```bash
vercel --prod
```

---

## 📝 取得 Supabase Anon Key

1. 前往 https://supabase.com/dashboard
2. 選擇您的專案（gjmkckijqurympmssizb）
3. 左側選單 → Settings → API
4. 複製 "anon" / "public" key

---

## ✅ 部署成功檢查

部署完成後，您會得到一個網址，例如：
```
https://thermotech-ops.vercel.app
或
https://thermotech-ops-xxx.vercel.app
```

### 測試登入

1. 開啟網址
2. 輸入測試帳號：
   ```
   員工編號：70231
   密碼：Admin369888
   ```
3. 應該成功進入系統

---

## 🔄 未來更新部署

只要推送到 GitHub，Vercel 會自動重新部署：

```bash
git add .
git commit -m "更新功能 XXX"
git push origin main
```

Vercel 會自動偵測並重新部署（約 2-3 分鐘）

---

## 🐛 常見問題

### Q1: Vercel 找不到專案

**A**: 確認 Root Directory 設定為 `thermotech-ops-app`

在 Vercel Dashboard → Settings → General → Root Directory

### Q2: Build 失敗

**A**: 檢查 Vercel Logs：
1. Vercel Dashboard → Deployments → 點擊失敗的部署
2. 查看 Build Logs
3. 通常是環境變數設定問題

### Q3: 環境變數無效

**A**: 
1. Vercel Dashboard → Settings → Environment Variables
2. 確認變數名稱有 `NEXT_PUBLIC_` 前綴
3. 確認選擇了 Production 環境
4. **重新部署**（Deployments → 點擊三個點 → Redeploy）

### Q4: 資料庫連線失敗

**A**: 
1. 檢查 Supabase URL 和 Key 是否正確
2. 確認 Supabase 資料庫已初始化（執行 SQL）
3. 檢查瀏覽器 Console 錯誤訊息

---

## 📊 部署檢查表

- [ ] GitHub Repository 已建立
- [ ] 程式碼已推送到 `main` 分支
- [ ] Vercel 專案已建立並連結 GitHub
- [ ] Root Directory 設定為 `thermotech-ops-app`
- [ ] 環境變數已設定（2 個）
- [ ] Build 成功（綠色勾勾）
- [ ] 網站可以開啟
- [ ] 登入功能正常
- [ ] 資料正確顯示

---

## 🎉 完成！

您的 THERMOTECH-OPS 系統已部署到雲端！

**Production URL**: 等待 Vercel 提供

如需協助，請提供：
1. Vercel 部署網址
2. Build Logs（如果失敗）
3. 瀏覽器 Console 錯誤訊息

---

**振禹企業 © 2025**

