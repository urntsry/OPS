# 🔍 TaskEditor 偵錯指南

## ✅ 已完成的強化

### 1. **TaskEditor 組件**
- ✅ 修正 Props 介面，改為接收 `task`, `onSave`, `onCancel`
- ✅ 初始化時載入現有任務的所有欄位
- ✅ 加入 `useEffect` 載入 recurring 規則
- ✅ 加強 `handleSave` 的 console 日誌

### 2. **SettingsPage**
- ✅ `handleEditTask` 加入超詳細日誌
- ✅ `handleSaveTaskEdit` 加入完整錯誤追蹤
- ✅ Render 時輸出當前狀態
- ✅ TaskEditor JSX 加入渲染追蹤

### 3. **API 層**
- ✅ `updateTaskDefinitionFull` 加入完整錯誤日誌

---

## 🧪 測試步驟

### **Step 1: 開啟瀏覽器 Console**
1. 按 `F12` 開啟開發者工具
2. 切換到 **Console** 分頁
3. 確保 **Preserve log** 勾選（防止頁面刷新時清除日誌）

### **Step 2: 登入系統**
```
http://localhost:3000
員工編號：70231
密碼：Admin369888
```

### **Step 3: 進入設定頁**
點擊右上角「設定」分頁

### **Step 4: 點擊「編」按鈕**
在「任務項目」列表中找到任一任務，點擊「編」按鈕

---

## 📋 預期 Console 輸出

### **點擊「編」按鈕時**
應該看到以下日誌：

```
[SettingsPage] ========== 開啟任務編輯器 ==========
[SettingsPage] 任務 ID: 1
[SettingsPage] 任務標題: 生產線產品檢查
[SettingsPage] 完整任務資料: { id: 1, title: '...', ... }
[SettingsPage] v3.0 欄位檢查: {
  task_category: 'routine',
  display_type: 'collapsed',
  schedule_type: 'recurring',
  schedule_config: { type: 'daily', workdays_only: true }
}
[SettingsPage] taskToEdit 狀態已設定
[SettingsPage] Render 檢查: {
  loading: false,
  usersCount: 79,
  taskDefsCount: 98,
  taskToEdit: 'Task #1 - 生產線產品檢查',
  taskToDelete: null
}
[SettingsPage] 渲染 TaskEditor，task: { id: 1, ... }
[TaskEditor] 組件初始化，編輯模式: true, { id: 1, ... }
[TaskEditor] 載入現有 schedule_config: { type: 'daily', workdays_only: true }
```

### **點擊「儲存」按鈕時**
應該看到：

```
[TaskEditor] 開始儲存，當前狀態: {
  title: '生產線產品檢查',
  taskCategory: 'routine',
  displayType: 'collapsed',
  scheduleType: 'recurring',
  recurringType: 'daily',
  workdaysOnly: true,
  weekDays: [1, 2, 3, 4, 5],
  monthDates: [1]
}
[TaskEditor] 準備儲存的資料: { title: '...', ... }
[SettingsPage] ========== 儲存任務編輯 ==========
[SettingsPage] 任務 ID: 1
[SettingsPage] 更新內容: { title: '...', ... }
[SettingsPage] 呼叫 API updateTaskDefinitionFull...
[API] ========== updateTaskDefinitionFull ==========
[API] 任務 ID: 1
[API] 更新內容: { ... }
[API] 更新欄位: ['title', 'description', 'base_points', ...]
[API] 任務更新成功，回傳資料: { ... }
[SettingsPage] API 回傳結果: { ... }
[SettingsPage] 本地狀態已更新
[TaskEditor] 儲存成功
[SettingsPage] 編輯器已關閉
```

---

## ❌ 常見問題偵錯

### **問題 1: 點擊「編」按鈕沒反應**

**檢查 Console 是否有任何錯誤訊息**

如果看到：
```
[SettingsPage] ========== 開啟任務編輯器 ==========
```
但沒有看到 `[TaskEditor] 組件初始化`

→ **原因**: TaskEditor 組件可能未正確匯入或渲染

**解決方案**:
```bash
# 確認 TaskEditor.tsx 是否存在
ls components/TaskEditor.tsx

# 重新啟動開發伺服器
npm run dev
```

---

### **問題 2: TaskEditor 顯示但資料不正確**

檢查 Console 中的：
```
[TaskEditor] 組件初始化，編輯模式: true, { ... }
```

如果 `task` 物件中缺少 v3.0 欄位（`task_category`, `display_type` 等）

→ **原因**: 資料庫尚未執行 `TASK_SYSTEM_V3_UPGRADE.sql`

**解決方案**:
```sql
-- 在 Supabase SQL Editor 執行
SELECT id, title, task_category, display_type, schedule_type 
FROM task_definitions 
LIMIT 5;

-- 如果欄位不存在，執行升級 SQL
-- OPS/docs/TASK_SYSTEM_V3_UPGRADE.sql
```

---

### **問題 3: 儲存時出錯**

檢查 Console 中的：
```
[API] ========== 更新任務失敗 ==========
[API] 錯誤代碼: ...
[API] 錯誤訊息: ...
```

常見錯誤：
- `column "task_category" does not exist` → 資料庫未升級
- `permission denied` → Supabase RLS 政策問題
- `invalid input syntax` → 資料格式錯誤

---

## 🎯 驗證成功的標準

✅ 點擊「編」按鈕後，TaskEditor 視窗立即彈出
✅ TaskEditor 顯示現有任務的所有資訊
✅ 修改欄位後點擊「儲存」，視窗關閉
✅ Toast 通知顯示「✓ 已更新」
✅ 任務列表自動更新（可能需要重新整理）
✅ Console 無任何紅色錯誤訊息

---

## 📞 回報問題時請提供

1. **完整的 Console 輸出**（從點擊「編」到出現問題為止）
2. **點擊的任務 ID 和標題**
3. **瀏覽器版本**（Chrome/Edge/Firefox）
4. **是否有紅色錯誤訊息**
5. **TaskEditor 是否有顯示**（有/無/部分顯示）

---

## 🚀 下一步

如果測試成功，我們可以繼續：
1. 優化 TaskEditor UI（Win95 風格調整）
2. 整合到首頁行事曆
3. 實作智能任務產生邏輯

