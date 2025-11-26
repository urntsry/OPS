# 🚨 Supabase SQL 執行步驟（詳細版）

## ⚠️ 重要提醒
您收到的錯誤訊息：`relation "public.profiles" does not exist`
**這表示：SQL 檔案尚未執行成功。**

---

## 📋 執行步驟（一步一步來）

### 步驟 1：登入 Supabase Dashboard

1. 開啟瀏覽器
2. 前往：https://supabase.com/dashboard
3. 使用您的帳號登入
4. 選擇專案：`gjmkckijqurympmssiZb`

---

### 步驟 2：進入 SQL Editor

1. 在左側選單找到 **"SQL Editor"** 圖示（看起來像 `</>`）
2. 點擊它
3. 點擊 **"New Query"** 按鈕（綠色的 + 圖示）

---

### 步驟 3：開啟 SQL 檔案

#### 方法 A：複製貼上（推薦）
```
1. 在 Windows 檔案總管中，前往：
   C:\Users\888\Desktop\python\Project\OPS\docs\init_schema_and_seeds.sql

2. 用記事本或 VS Code 開啟這個檔案

3. 全選 (Ctrl + A)

4. 複製 (Ctrl + C)

5. 回到 Supabase SQL Editor

6. 貼上 (Ctrl + V)
```

#### 方法 B：直接從 Cursor 複製
```
1. 在 Cursor 中開啟：
   OPS/docs/init_schema_and_seeds.sql

2. 全選 (Ctrl + A)

3. 複製 (Ctrl + C)

4. 回到 Supabase SQL Editor

5. 貼上 (Ctrl + V)
```

---

### 步驟 4：執行 SQL

1. 確認 SQL Editor 中有完整的 SQL 內容
2. 檢查第一行應該是：
   ```sql
   -- THERMOTECH-OPS Database Initialization
   ```
3. 點擊右下角的 **"Run"** 按鈕（或按 Ctrl + Enter）

---

### 步驟 5：等待執行完成

執行過程中，您會看到：
```
⏳ Running query...
```

**完成後，應該會顯示：**
```
✅ Success. No rows returned
```

**或類似的成功訊息。**

⚠️ **如果出現錯誤，請完整複製錯誤訊息並告訴我！**

---

### 步驟 6：驗證資料

執行完成後，在 SQL Editor 中執行以下驗證查詢：

#### 驗證 1：檢查表格是否存在
```sql
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name IN ('profiles', 'task_definitions', 'daily_assignments');
```

**預期結果：應該看到 3 行**
```
profiles
task_definitions
daily_assignments
```

---

#### 驗證 2：檢查人員數量
```sql
SELECT COUNT(*) FROM public.profiles;
```

**預期結果：21**

---

#### 驗證 3：檢查任務數量
```sql
SELECT COUNT(*) FROM public.task_definitions;
```

**預期結果：98**

---

#### 驗證 4：檢查觸發器
```sql
SELECT trigger_name 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';
```

**預期結果：應該看到**
```
trigger_add_points
```

---

## 🔍 常見問題

### Q1: 為什麼執行失敗？
**可能原因：**
1. SQL 內容沒有完整貼上
2. 權限不足（需要使用有管理員權限的帳號）
3. 網路連線問題

**解決方法：**
- 重新複製完整的 SQL 檔案
- 確認您登入的是專案擁有者帳號
- 檢查網路連線

---

### Q2: 執行後顯示 "No rows returned" 是正常的嗎？
**是的！** 這是正常的。因為我們執行的是 CREATE TABLE 和 INSERT 語句，不是 SELECT 查詢，所以不會返回任何行。

---

### Q3: 我可以多次執行這個 SQL 嗎？
**可以！** SQL 檔案開頭有 `DROP TABLE IF EXISTS` 語句，所以重複執行是安全的。它會先刪除舊的表格，然後重新建立。

---

### Q4: 執行後如何確認成功？
**執行驗證查詢（上面的驗證 1-4）**，如果都返回正確的結果，就代表成功了！

---

## 🎯 執行完成後

### 1. 回到 Cursor 的開發伺服器
```bash
# 如果伺服器還沒啟動，執行：
cd C:\Users\888\Desktop\python\Project\OPS\thermotech-ops-app
npm run dev
```

### 2. 開啟瀏覽器
```
http://localhost:3000/home
```

### 3. 開啟 Console (F12)

### 4. 觀察日誌
應該會看到：
```
[HomePage] 開始載入使用者任務
[API] 取得使用者任務定義: ab0c8481-e800-455e-bcb3-c42292dd2ba9
[API] 成功取得任務定義: X
[HomePage] 任務定義: X
[HomePage] 資料載入完成
```

### 5. 檢查頁面
- **例行公事** 區塊應該顯示真實資料
- **交辦事項** 區塊應該顯示真實資料
- 不會再是空白或 Mock 資料

---

## 📸 執行截圖參考

### 成功的畫面應該長這樣：

#### SQL Editor
```
┌─────────────────────────────────────┐
│ SQL Editor                    [Run] │
├─────────────────────────────────────┤
│ -- THERMOTECH-OPS Database Init     │
│ DROP TABLE IF EXISTS ...            │
│ CREATE TABLE public.profiles ...    │
│ ...                                 │
└─────────────────────────────────────┘
       ↓ 點擊 Run
┌─────────────────────────────────────┐
│ ✅ Success. No rows returned         │
└─────────────────────────────────────┘
```

#### 驗證查詢
```sql
SELECT COUNT(*) FROM public.profiles;
```
```
┌───────┐
│ count │
├───────┤
│  21   │
└───────┘
```

---

## 🆘 如果還是失敗

請提供以下資訊：
1. 完整的錯誤訊息（複製貼上）
2. 您執行到哪一步
3. 螢幕截圖（如果可能）

我會立即幫您解決！

---

## 📝 快速檢查清單

- [ ] 已登入 Supabase Dashboard
- [ ] 已進入 SQL Editor
- [ ] 已複製完整的 SQL 檔案內容
- [ ] 已貼上到 SQL Editor
- [ ] 已點擊 Run 執行
- [ ] 執行結果顯示成功
- [ ] 驗證查詢返回 21 位員工
- [ ] 驗證查詢返回 98 個任務
- [ ] 已重新載入網頁 (Ctrl + Shift + R)
- [ ] Console 顯示載入成功的日誌

**完成所有步驟後，系統就可以正常運作了！** 🚀


