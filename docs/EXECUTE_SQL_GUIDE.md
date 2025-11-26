# 📋 執行 SQL Schema 指南

## 🎯 目標
將 `init_schema_and_seeds.sql` 執行到 Supabase，建立完整的資料庫結構。

---

## 📍 Supabase 專案資訊
- **專案 URL**: `https://gjmkckijqurympmssiZb.supabase.co`
- **Anon Key**: 已存在於 `.env.local`
- **Service Role Key**: 已存在於 `ENV_CONFIG.txt`

---

## 🚀 執行步驟

### 方法 1：使用 Supabase Dashboard（推薦）

#### 1. 登入 Supabase
```
https://supabase.com/dashboard/project/gjmkckijqurympmssiZb
```

#### 2. 進入 SQL Editor
```
左側選單 → SQL Editor → New Query
```

#### 3. 複製貼上 SQL
```sql
-- 複製 OPS/docs/init_schema_and_seeds.sql 的全部內容
-- 貼上到 SQL Editor
```

#### 4. 執行
```
點擊 "Run" 按鈕（或按 Ctrl + Enter）
```

#### 5. 驗證
```sql
-- 檢查表格是否建立成功
SELECT table_name FROM information_schema.tables 
WHERE table_schema = 'public';

-- 檢查人員數量
SELECT COUNT(*) FROM public.profiles;

-- 檢查任務數量
SELECT COUNT(*) FROM public.task_definitions;
```

---

### 方法 2：使用 Supabase CLI（進階）

#### 1. 安裝 CLI
```bash
npm install -g supabase
```

#### 2. 登入
```bash
supabase login
```

#### 3. 連結專案
```bash
supabase link --project-ref gjmkckijqurympmssiZb
```

#### 4. 執行 SQL
```bash
supabase db push --db-url "postgresql://postgres:[YOUR-PASSWORD]@db.gjmkckijqurympmssiZb.supabase.co:5432/postgres"
```

---

## 📊 預期結果

### 成功執行後，應該有：

#### 1. 3 張主表
- `public.profiles` (21 位員工)
- `public.task_definitions` (98 個任務)
- `public.daily_assignments` (每日生成)

#### 2. 1 個觸發器
- `trigger_add_points` (自動加分)

#### 3. 1 個函數
- `add_points_on_complete()` (計算積分)

---

## 🔍 驗證 SQL

### 檢查人員
```sql
SELECT employee_id, full_name, department, job_title, role 
FROM public.profiles 
ORDER BY department, employee_id;
```

### 檢查任務
```sql
SELECT id, title, frequency, base_points, site_location 
FROM public.task_definitions 
WHERE is_active = true 
LIMIT 10;
```

### 檢查觸發器
```sql
SELECT trigger_name, event_object_table 
FROM information_schema.triggers 
WHERE trigger_schema = 'public';
```

---

## ⚠️ 注意事項

### 1. 此 SQL 會清空現有資料
```sql
DROP TABLE IF EXISTS public.daily_assignments;
DROP TABLE IF EXISTS public.task_definitions;
DROP TABLE IF EXISTS public.profiles;
```
**如果已有重要資料，請先備份！**

### 2. UUID 是固定的
- 為了讓關聯正確，每個員工的 UUID 是預先生成的
- 這些 UUID 在 SQL 中是固定的，不會每次執行都變

### 3. RLS (Row Level Security) 尚未設定
- 目前所有表格都沒有啟用 RLS
- 需要手動設定權限政策

---

## 🎯 下一步

執行完 SQL 後，請回報：
1. ✅ 成功建立了多少個表格
2. ✅ 人員總數是否為 21
3. ✅ 任務總數是否為 98
4. ✅ 是否有任何錯誤訊息

**然後我們就可以開始整合前端了！** 🚀


