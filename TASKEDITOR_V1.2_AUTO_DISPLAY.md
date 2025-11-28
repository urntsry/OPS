# TaskEditor v1.2 - 自動顯示邏輯

## ✅ 更新內容

### **核心改變：移除手動選擇，改為自動決定**

#### **之前（v1.1）**
```
用戶需要選擇 3 個選項：
1. 任務分類（例行/交辦/公共）
2. 排程類型（單次/區間/重複）
3. 顯示方式（特殊事件/例行摺疊/週期顯示）❌ 移除

問題：可能產生邏輯衝突的組合
```

#### **現在（v1.2）**
```
用戶只需選擇 2 個選項：
1. 任務分類（例行/交辦/公共）
2. 排程類型（單次/區間/重複）✅ 系統自動決定顯示方式

優點：避免邏輯衝突，簡化操作
```

---

## 🎯 自動顯示規則

### **規則邏輯**

| 排程類型 | 重複規則 | 自動顯示類型 | 說明 |
|---------|---------|------------|------|
| **單次任務** | - | 🔴 特殊事件 | 直接顯示在日期格內 |
| **區間任務** | - | 🔴 特殊事件 | 顯示區間標記 |
| **重複任務** | 每日 | 🟡 例行摺疊 | 摺疊為 "[+] 3 項例行公事" |
| **重複任務** | 每週 | 🟢 週期顯示 | 在對應星期直接顯示 |
| **重複任務** | 每月 | 🟢 週期顯示 | 在對應日期直接顯示 |

### **實際範例**

#### **範例 1：單次出差**
```
排程設定：單次任務 → 2025-12-05
自動結果：特殊事件（直接顯示）

行事曆顯示：
┌─────┐
│  5  │
│日本出差│ ← 直接顯示
└─────┘
```

#### **範例 2：每日檢查**
```
排程設定：重複任務 → 每日（工作日）
自動結果：例行摺疊

行事曆顯示：
┌─────┐
│  5  │
│[+] 3項│ ← 點擊展開
└─────┘
```

#### **範例 3：週報整理**
```
排程設定：重複任務 → 每週五
自動結果：週期顯示

行事曆顯示：
┌─────┐
│  5  │
│週報整理│ ← 直接顯示
└─────┘
```

#### **範例 4：月度盤點**
```
排程設定：重複任務 → 每月 5 號
自動結果：週期顯示

行事曆顯示：
┌─────┐
│  5  │
│月度盤點│ ← 直接顯示
└─────┘
```

---

## 💻 技術實作

### **自動決定函數**

```typescript
function getAutoDisplayType(
  scheduleType: 'once' | 'range' | 'recurring',
  recurringType?: 'daily' | 'weekly' | 'monthly'
): 'event' | 'collapsed' | 'periodic' {
  
  // 單次/區間 = 特殊事件
  if (scheduleType === 'once' || scheduleType === 'range') {
    return 'event'
  }
  
  // 重複任務
  if (scheduleType === 'recurring') {
    if (recurringType === 'daily') {
      return 'collapsed' // 每日 = 摺疊
    } else {
      return 'periodic' // 每週/每月 = 週期
    }
  }
  
  return 'collapsed' // 預設
}
```

### **儲存時自動套用**

```typescript
const handleSave = async () => {
  // ... 建構 schedule_config ...
  
  // 🎯 自動決定 display_type
  let autoDisplayType: 'event' | 'collapsed' | 'periodic'
  
  if (scheduleType === 'once' || scheduleType === 'range') {
    autoDisplayType = 'event'
  } else if (scheduleType === 'recurring') {
    if (recurringType === 'daily') {
      autoDisplayType = 'collapsed'
    } else {
      autoDisplayType = 'periodic'
    }
  } else {
    autoDisplayType = 'collapsed'
  }
  
  console.log('[TaskEditor] 自動決定 display_type:', autoDisplayType)
  
  const taskData = {
    // ...
    display_type: autoDisplayType, // 使用自動值
    // ...
  }
  
  await onSave(taskData)
}
```

---

## 🎨 UI 變更

### **移除的區塊**
```diff
- {/* 行事曆顯示方式 */}
- <div style={{ marginBottom: '16px' }}>
-   <div style={{ fontWeight: 'bold', ... }}>
-     行事曆顯示方式
-   </div>
-   <div className="inset" style={{ padding: '12px' }}>
-     <label><input type="radio" ... /> 特殊事件</label>
-     <label><input type="radio" ... /> 例行公事</label>
-     <label><input type="radio" ... /> 週期任務</label>
-   </div>
- </div>
```

### **新增的說明區塊**
```diff
+ {/* 自動顯示規則說明 */}
+ <div style={{ marginBottom: '16px' }}>
+   <div className="inset" style={{ padding: '12px', background: '#FFFFCC' }}>
+     <div style={{ fontWeight: 'bold' }}>行事曆顯示規則（自動）：</div>
+     <div>• 單次任務/區間任務 → 特殊事件（直接顯示）</div>
+     <div>• 每日重複任務 → 例行公事（摺疊）</div>
+     <div>• 每週/每月任務 → 週期任務（直接顯示）</div>
+   </div>
+ </div>
```

---

## 🧪 測試案例

### **測試 1：建立單次出差**
```
步驟：
1. 點擊「編」按鈕
2. 選擇「單次任務」
3. 設定日期：2025-12-05
4. 儲存

預期結果：
- display_type 自動設為 'event'
- Console 顯示：[TaskEditor] 自動決定 display_type: event
```

### **測試 2：建立每日檢查**
```
步驟：
1. 點擊「編」按鈕
2. 選擇「重複任務」→「每日」
3. 勾選「僅工作日」
4. 儲存

預期結果：
- display_type 自動設為 'collapsed'
- Console 顯示：[TaskEditor] 自動決定 display_type: collapsed
```

### **測試 3：建立週報整理**
```
步驟：
1. 點擊「編」按鈕
2. 選擇「重複任務」→「每週」
3. 選擇「五」
4. 儲存

預期結果：
- display_type 自動設為 'periodic'
- Console 顯示：[TaskEditor] 自動決定 display_type: periodic
```

### **測試 4：建立月度盤點**
```
步驟：
1. 點擊「編」按鈕
2. 選擇「重複任務」→「每月」
3. 選擇「5 號」
4. 儲存

預期結果：
- display_type 自動設為 'periodic'
- Console 顯示：[TaskEditor] 自動決定 display_type: periodic
```

---

## 📊 資料庫影響

### **現有任務**
- ✅ 不影響現有任務的 `display_type`
- ✅ 編輯時會自動更新為正確的類型

### **新增任務**
- ✅ 自動設定正確的 `display_type`
- ✅ 確保邏輯一致性

---

## 🎯 優點總結

1. ✅ **避免邏輯衝突** - 不會有「每日重複」+「特殊事件」的矛盾
2. ✅ **簡化操作** - 少一個選項，降低學習成本
3. ✅ **符合直覺** - 系統自動做出合理的決定
4. ✅ **減少錯誤** - 用戶不會選錯
5. ✅ **更專業** - 系統智能化，不需人工判斷

---

## 📝 後續工作

### **前端**
- [x] 移除 displayType 手動選擇
- [x] 加入自動決定邏輯
- [x] 加入說明文字
- [ ] 測試所有組合

### **行事曆顯示**
- [ ] 實作「特殊事件」直接顯示
- [ ] 實作「例行摺疊」展開/收合
- [ ] 實作「週期任務」直接顯示

### **文件**
- [x] 更新技術文件
- [ ] 更新使用手冊
- [ ] 更新部署文件

