# 🧪 TaskEditor v1.2 快速測試指南

## 立即測試

### **1. 重新整理頁面**
```
按 F5
```

### **2. 開啟 Console**
```
按 F12 → Console 分頁
```

### **3. 編輯任一任務**
```
設定頁 → 點擊「編」按鈕
```

---

## ✅ 預期變化

### **UI 變化**

#### **移除了**：
❌ 「行事曆顯示方式」區塊（3 個 radio 選項）

#### **新增了**：
✅ 黃色說明框，顯示自動規則

```
┌─────────────────────────────────────┐
│ 行事曆顯示規則（自動）：             │
│ • 單次任務/區間任務 → 特殊事件      │
│ • 每日重複任務 → 例行公事（摺疊）    │
│ • 每週/每月任務 → 週期任務          │
└─────────────────────────────────────┘
```

---

## 🧪 測試案例

### **測試 1：編輯「理布」任務**

**步驟**：
1. 找到任務 #1「理布」
2. 點擊「編」
3. 查看排程設定（應該是「重複任務」→「每日」）
4. 不做任何修改，直接點「儲存變更」

**預期 Console 輸出**：
```
[TaskEditor] 自動決定 display_type: collapsed
[TaskEditor] 準備儲存的資料: { ..., display_type: 'collapsed', ... }
[SettingsPage] API 回傳結果: { ... }
```

**結果**：
✅ `display_type` 自動設為 `collapsed`（例行摺疊）

---

### **測試 2：編輯「日本出差」任務**

**步驟**：
1. 找到任務 #105「日本出差」
2. 點擊「編」
3. 查看排程設定（應該是「單次任務」或「區間任務」）
4. 點「儲存變更」

**預期 Console 輸出**：
```
[TaskEditor] 自動決定 display_type: event
[TaskEditor] 準備儲存的資料: { ..., display_type: 'event', ... }
```

**結果**：
✅ `display_type` 自動設為 `event`（特殊事件）

---

### **測試 3：編輯「週報整理」任務**

**步驟**：
1. 找到任務 #107「週報整理」
2. 點擊「編」
3. 查看排程設定（應該是「重複任務」→「每週」）
4. 點「儲存變更」

**預期 Console 輸出**：
```
[TaskEditor] 自動決定 display_type: periodic
[TaskEditor] 準備儲存的資料: { ..., display_type: 'periodic', ... }
```

**結果**：
✅ `display_type` 自動設為 `periodic`（週期顯示）

---

### **測試 4：編輯「月度盤點」任務**

**步驟**：
1. 找到任務 #106「月度盤點」
2. 點擊「編」
3. 查看排程設定（應該是「重複任務」→「每月」）
4. 點「儲存變更」

**預期 Console 輸出**：
```
[TaskEditor] 自動決定 display_type: periodic
[TaskEditor] 準備儲存的資料: { ..., display_type: 'periodic', ... }
```

**結果**：
✅ `display_type` 自動設為 `periodic`（週期顯示）

---

## 🔍 驗證資料庫

### **方法 1：Supabase SQL Editor**

```sql
-- 查詢所有任務的顯示類型
SELECT 
  id,
  title,
  schedule_type,
  schedule_config->>'type' as recurring_type,
  display_type
FROM task_definitions
ORDER BY id
LIMIT 20;
```

### **方法 2：Console 輸出**

儲存後 Console 會顯示：
```
[API] 任務更新成功，回傳資料: { 
  id: 1, 
  title: '理布',
  display_type: 'collapsed',
  ...
}
```

---

## ❌ 常見問題

### **問題 1：黃色說明框沒出現**
**原因**：可能是 CSS 問題
**解決**：按 Ctrl+F5 強制重新載入

### **問題 2：Console 沒顯示「自動決定」**
**原因**：舊的 JS 仍在快取中
**解決**：
1. 關閉 dev server
2. 刪除 `.next` 資料夾
3. 重新執行 `npm run dev`

### **問題 3：儲存後 display_type 沒變**
**原因**：API 更新失敗
**解決**：檢查 Console 的錯誤訊息

---

## 📊 預期結果總表

| 排程類型 | 重複規則 | 自動 display_type | 範例任務 |
|---------|---------|------------------|---------|
| 單次任務 | - | `event` | 日本出差 |
| 區間任務 | - | `event` | 培訓週 |
| 重複任務 | 每日 | `collapsed` | 理布、檢查 |
| 重複任務 | 每週 | `periodic` | 週報整理 |
| 重複任務 | 每月 | `periodic` | 月度盤點 |

---

## ✅ 測試通過標準

- [x] 黃色說明框正常顯示
- [x] 「行事曆顯示方式」選項已移除
- [x] Console 顯示「自動決定 display_type」
- [x] 儲存後 display_type 正確
- [x] 無任何紅色錯誤訊息

---

## 💬 測試完成後回報

請告訴我：

1. ✅ **黃色說明框是否顯示？**
2. ✅ **Console 輸出是否正確？**
3. ✅ **display_type 是否自動決定？**
4. ❓ **有沒有發現任何問題？**

如果一切正常，我們就可以繼續實作行事曆的顯示邏輯了！🚀

