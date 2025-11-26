# THERMOTECH-OPS UI/UX 優化需求清單

## 🎯 用戶反饋與改進需求

### 1. 設定頁功能擴充

#### 人員管理
- ✅ 顯示所有人員
- ➕ **新增人員功能**
  - 需要輸入：員工編號、姓名、部門、廠區
- ➕ **刪除人員功能**
- ➕ **編輯人員資訊**

#### 事件項目管理
- ✅ 顯示所有事件項目
- ➕ **新增事件項目**
  - 標題、類型、頻率、廠區、代理人
- ➕ **刪除事件項目**
- ➕ **編輯事件項目**

#### 任務分配進階功能
- ✅ 基本勾選分配
- ➕ **代理人機制**
  - 主辦人、協辦人、代理人
- ➕ **批量分配**
  - 依廠區、依部門、依角色

---

### 2. 行事曆優化

#### 視覺優化
- ➕ **放大行事曆**（佔據更多空間）
- ➕ **軟體滿版顯示**（移除多餘留白）

#### 互動功能
- ➕ **點擊日期格子 → 彈出新增視窗**
  - 選擇類別：例行公事 / 交辦事項 / 公共事項
  - 輸入資訊
  - 建立後自動顯示在行事曆和下方列表

#### 顯示內容
- ➕ **行事曆要顯示所有類型**：
  - 例行公事
  - 交辦事項
  - 公共事項
  - 國定假日
- ➕ **不同類型用不同顏色標示**

---

### 3. 四個區塊 UI 修正

#### 例行公事 & 交辦事項
- ❌ **問題**：按鈕位置不一致，例行公事的按鈕跑掉了
- ✅ **修正**：統一按鈕佈局，確保對齊

#### 公共事項 & 公告欄
- ❌ **問題**：標題前面有多餘空間
- ✅ **修正**：移除多餘空間，標題左對齊

---

### 4. 公告欄互動功能

#### 點擊展開詳情
- ➕ **點擊公告項目 → 彈出詳細視窗**
  - 顯示完整公告內容
  - 支援圖文混排
  - 支援連結（可點擊跳轉）
  - 支援檔案下載

#### 公告詳細視窗設計
```
┌────────────────────────────────────┐
│ 公告詳情                            │
├────────────────────────────────────┤
│                                     │
│ 標題：本週五消防演練通知             │
│ 發布時間：2025/11/25 14:30          │
│ 發布人：管理部                      │
│                                     │
│ 內容：                              │
│ 各位同仁您好，                      │
│ 本週五（11/29）下午3點將進行...    │
│                                     │
│ [圖片預覽]                          │
│                                     │
│ 相關連結：                          │
│ → 消防演練流程說明.pdf              │
│                                     │
│ [關閉]                              │
└────────────────────────────────────┘
```

---

### 5. 使用者體驗提升

#### 核心理念
> "不只是追蹤工具，而是真正可以使用的個人行事曆"

#### 實際應用場景
- ✅ 同事可以看到公司分配的任務
- ➕ 同事可以自己新增個人事項（不會被其他人看到）
- ➕ 同事可以標註完成、延期、備註
- ➕ 同事可以查看歷史記錄

---

## 🗄️ 資料庫更新需求

### 新增欄位：profiles 表
```sql
ALTER TABLE profiles
ADD COLUMN site_code TEXT,           -- 廠區（316/310/KS）
ADD COLUMN is_active BOOLEAN DEFAULT TRUE,
ADD COLUMN notes TEXT;
```

### 新增表：personal_events
```sql
CREATE TABLE personal_events (
  id BIGINT PRIMARY KEY,
  user_id UUID,                      -- 建立者
  title TEXT,
  event_date DATE,
  event_type TEXT,                   -- 'personal'
  description TEXT,
  is_private BOOLEAN DEFAULT TRUE,   -- 只有自己看得到
  created_at TIMESTAMPTZ
);
```

### 新增表：announcements_detail
```sql
CREATE TABLE announcements_detail (
  id BIGINT PRIMARY KEY,
  title TEXT,
  content TEXT,                      -- 富文本內容
  images TEXT[],                     -- 圖片 URL 陣列
  links TEXT[],                      -- 連結陣列
  attachments TEXT[],                -- 附件 URL 陣列
  posted_by UUID,
  posted_at TIMESTAMPTZ,
  target_users UUID[]
);
```

### 新增表：public_holidays
```sql
CREATE TABLE public_holidays (
  id BIGINT PRIMARY KEY,
  holiday_date DATE,
  holiday_name TEXT,                 -- 如：國慶日、春節
  is_workday BOOLEAN DEFAULT FALSE,  -- 補班日
  year INT
);
```

---

## 🎨 UI 改進清單

### 行事曆區域
- [ ] 放大行事曆（佔據 60-70% 高度）
- [ ] 移除多餘留白
- [ ] 日期格子增加點擊熱區
- [ ] 實作點擊彈出新增視窗
- [ ] 顯示所有類型事項（例行/交辦/公共/假日）
- [ ] 顏色區分不同類型

### 四個區塊
- [ ] 修正按鈕位置（統一對齊）
- [ ] 移除公共事項/公告欄標題前空間
- [ ] 公告欄項目可點擊
- [ ] 實作公告詳情彈窗

### 設定頁
- [ ] 新增「新增人員」按鈕
- [ ] 新增「刪除人員」功能
- [ ] 新增「新增事件項目」按鈕
- [ ] 新增「刪除事件項目」功能
- [ ] 實作代理人選擇

---

## 🚀 開發優先順序

### Phase 1：UI 修正（立即執行）
1. ✅ 放大行事曆
2. ✅ 修正四個區塊按鈕對齊
3. ✅ 移除多餘空間
4. ✅ 實作點擊日期新增事項

### Phase 2：互動功能（今天完成）
1. ✅ 行事曆顯示所有類型事項
2. ✅ 顏色區分類型
3. ✅ 公告欄點擊詳情
4. ✅ 公告詳情彈窗

### Phase 3：設定頁擴充（明天）
1. 新增/刪除人員
2. 新增/刪除事件項目
3. 代理人機制

---

## 📊 資料結構範例

### 人員資料（完整版）
```json
{
  "employeeId": "10003",
  "fullName": "張庭憲",
  "department": "廠務部",
  "jobTitle": "廠長",
  "siteCode": "316",
  "role": "supervisor",
  "isActive": true
}
```

### 事件項目（完整版）
```json
{
  "id": 1,
  "title": "週四丟垃圾",
  "eventType": "routine",
  "frequency": "weekly:4",
  "siteLocation": "316",
  "defaultAssignee": "10003",
  "backupAssignee": "10235",
  "requiresPhoto": false
}
```

---

**立即開始 Phase 1 UI 修正！** 🚀


